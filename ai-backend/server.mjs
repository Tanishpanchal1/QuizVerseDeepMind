// server.mjs (drop-in replacement)
// Node 18+ recommended (global fetch available). If older Node, install node-fetch.

import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

// Mistral config (set these in env)
const MISTRAL_API_KEY = process.env.MISTRAL_API_KEY
const MISTRAL_MODEL_ID = process.env.MISTRAL_MODEL_ID || "mistral-tiny"; // change if you want another model

if (!MISTRAL_API_KEY) {
  console.error('Missing MISTRAL_API_KEY in environment')
  process.exit(1)
}

app.use(cors())
app.use(express.json())

// In-memory session storage (OK for local dev). Use Redis / Firestore in production.
const sessions = new Map()

/* ----------------- Utilities ----------------- */

function extractJsonFromText(raw) {
  if (!raw || typeof raw !== 'string') throw new Error('No text to parse')

  
  // NEW: Strip markdown code blocks first
  raw = raw.replace(/``````\s*/g, '').trim()
  
  // try direct parse
  try { return JSON.parse(raw) } catch (e) {}
  
  console.log('🔍 Attempting to extract JSON from text...')
  
  // Step 1: Try direct parse
  try { 
    const result = JSON.parse(raw)
    console.log('✅ Direct JSON parse successful')
    return result
  } catch (e) {
    console.log('⚠️  Direct parse failed, trying extraction...')
  }
  
  // Step 2: Remove markdown code blocks
  let cleaned = raw
  
  // Remove `````` blocks
  
  cleaned = cleaned.replace(/```\s*/g, '')
  
  console.log('📝 After removing markdown:', cleaned.slice(0, 200))
  
  // Try parsing cleaned version
  try {
    const result = JSON.parse(cleaned.trim())
    console.log('✅ Cleaned JSON parse successful')
    return result
  } catch (e) {
    console.log('⚠️  Cleaned parse failed, trying bracket extraction...')
  }
  
  // Step 3: Extract first complete JSON array or object
  const arrayMatch = cleaned.match(/\[[\s\S]*\]/)
  if (arrayMatch) {
    try {
      const result = JSON.parse(arrayMatch[0])
      console.log('✅ Array extraction successful')
      return result
    } catch (e) {
      console.log('⚠️  Array extraction failed')
    }
  }
  
  const objectMatch = cleaned.match(/\{[\s\S]*\}/)
  if (objectMatch) {
    try {
      const result = JSON.parse(objectMatch[0])
      console.log('✅ Object extraction successful')
      return result
    } catch (e) {
      console.log('⚠️  Object extraction failed')
    }
  }
  
  console.error('🔴 All extraction attempts failed')
  console.error('Raw text:', raw)
  throw new Error('No valid JSON found in model response')
}


function matchAnswerToOption(answerText, question) {
  if (!question || !Array.isArray(question.options)) return false
  const clean = String(answerText || '').toLowerCase().trim()

  const letters = ['a','b','c','d']
  if (clean.length === 1 && letters.includes(clean)) {
    return letters.indexOf(clean) === question.correctOptionIndex
  }

  if (/^[1-4]$/.test(clean)) {
    return parseInt(clean,10) - 1 === question.correctOptionIndex
  }
  if (/^[0-3]$/.test(clean)) {
    return parseInt(clean,10) === question.correctOptionIndex
  }

  const opts = question.options.map(o => String(o || '').toLowerCase().trim())
  if (opts[question.correctOptionIndex] === clean) return true
  if (clean.length >= 2 && opts[question.correctOptionIndex].includes(clean)) return true

  return false
}

/**
 * callMistral: posts to Mistral Chat Completions endpoint
 * - returns a string with the assistant response (or throws)
 * - uses timeout and a single retry by default
 */
async function callMistral(prompt, { timeoutMs = 20000, retries = 1 } = {}) {
  const url = 'https://api.mistral.ai/v1/chat/completions'
  const body = {
    model: MISTRAL_MODEL_ID,
    messages: [
      { role: 'user', content: prompt }
    ]
  }

  console.log('🔵 Calling Mistral API...')
  console.log('Model:', MISTRAL_MODEL_ID)
  console.log('API Key present:', !!MISTRAL_API_KEY)
  console.log('API Key starts with:', MISTRAL_API_KEY?.slice(0, 10) + '...')

  let lastErr = null
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController()
    const id = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${MISTRAL_API_KEY}`
        },
        body: JSON.stringify(body),
        signal: controller.signal
      })
      clearTimeout(id)

      console.log('🟢 Mistral Response Status:', resp.status)

      if (!resp.ok) {
        const txt = await resp.text().catch(() => '')
        console.error('🔴 Mistral API Error:', resp.status, txt)
        throw new Error(`Mistral API error ${resp.status}: ${txt}`)
      }

      const data = await resp.json()
      console.log('📦 Mistral Response Data:', JSON.stringify(data, null, 2))

      // Defensive extraction
      let out = ''
      const c0 = data?.choices?.[0]
      if (c0) {
        if (c0.message && typeof c0.message.content === 'string') out = c0.message.content
        else if (c0.content && typeof c0.content === 'string') out = c0.content
        else if (c0.message && Array.isArray(c0.message.content)) {
          out = c0.message.content.map(chunk => (chunk?.text || chunk?.content || '')).join('')
        } else if (typeof c0 === 'string') out = c0
      }

      if (!out) {
        out = (data?.output?.[0]?.content) || (data?.result) || ''
      }

      if (!out) {
        console.error('🔴 Could not extract content from Mistral response')
        return JSON.stringify(data)
      }

      console.log('✅ Extracted content length:', out.length)
      console.log('📝 First 300 chars:', out.slice(0, 300))

      return out
    } catch (err) {
      lastErr = err
      console.error('🔴 Attempt', attempt + 1, 'failed:', err.message)
      if (err.name === 'AbortError') lastErr = new Error('Mistral request timed out')
      if (attempt < retries) await new Promise(r => setTimeout(r, 300 * (attempt + 1)))
    } finally {
      clearTimeout(id)
    }
  }
  throw lastErr
}

/* ----------------- Routes ----------------- */

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'QuizVerse AI backend (Mistral) is running' })
})

app.post('/api/start-session', async (req, res) => {
  try {
    const body = req.body || {}
    const subject = String(body.subject || 'computer science').slice(0, 80)
    const topic = String(body.topic || 'data structures').slice(0, 200)
    let count = parseInt(body.count, 10)
    if (Number.isNaN(count) || count <= 0 || count > 20) count = 5 // cap to 20 to respect free tier
    const difficulty = String(body.difficulty || 'medium').toLowerCase()

    const prompt = `You are an AI tutor generating quiz questions for a student.
Generate ${count} multiple-choice questions about ${topic} in ${subject}.
Difficulty: ${difficulty}.

Return ONLY a valid JSON array (no markdown, no extra text) where each item has:
- qId: string (like "q1", "q2", ...)
- text: string (the question)
- type: string, always "MCQ"
- options: array of exactly 4 answer options (strings)
- correctOptionIndex: integer 0-3 (index into options)
- concepts: array of short topic tags (strings)
- source: string, set to "mistral"
- confidence: number between 0.7 and 0.99
`

    const rawText = await callMistral(prompt, { timeoutMs: 25000, retries: 1 })

    let parsed
    try {
      parsed = extractJsonFromText(String(rawText || ''))
    } catch (e) {
      console.error('Failed to parse Mistral JSON, raw:', rawText)
      return res.status(500).json({ error: 'Failed to parse questions from Mistral' })
    }

    const questions = (Array.isArray(parsed) ? parsed : []).map((q, idx) => ({
      qId: q.qId || `q${idx + 1}`,
      text: q.text || 'Untitled question',
      type: (q.type || 'MCQ').toUpperCase(),
      options:
        Array.isArray(q.options) && q.options.length === 4
          ? q.options
          : (q.options && q.options.length ? q.options.slice(0, 4) : ['Option A', 'Option B', 'Option C', 'Option D']),
      correctOptionIndex:
        typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4
          ? q.correctOptionIndex
          : 0,
      concepts: Array.isArray(q.concepts) ? q.concepts : ['general'],
      source: q.source || 'mistral',
      confidence: typeof q.confidence === 'number' ? q.confidence : 0.9
    }))

    const sessionId = `mistral-${Date.now()}-${Math.random().toString(36).slice(2,8)}`
    sessions.set(sessionId, { questions, createdAt: Date.now() })

    res.json({
      sessionId,
      questions,
      meta: { estimatedTime: questions.length * 2 }
    })
  } catch (err) {
    console.error('start-session error:', err)
    res.status(500).json({ error: 'Failed to start AI session' })
  }
})

app.post('/api/submit-answer', async (req, res) => {
  try {
    const { sessionId, questionId, answerText } = req.body || {}
    if (!sessionId || !questionId || answerText === undefined) {
      return res.status(400).json({ error: 'Missing sessionId, questionId or answerText' })
    }

    const session = sessions.get(sessionId)
    if (!session) return res.status(400).json({ error: 'Unknown sessionId' })

    const question = (session.questions || []).find(q => q.qId === questionId)
    if (!question) return res.status(400).json({ error: 'Unknown question for this session' })

    const localIsCorrect = matchAnswerToOption(answerText, question)

    const gradingPrompt = `You are grading a student's answer.

Question: ${question.text}
Options: ${(question.options || []).join(' | ')}
Student answer: ${answerText}
Correct option index: ${question.correctOptionIndex}

Return ONLY a JSON object with:
- isCorrect: boolean
- score: number between 0 and 1
- feedback: short string to the student
- mistakeType: short string or null
- conceptsInvolved: array of strings
- explanation: object with fields:
  - steps: array of 2-4 short strings
  - tip: short string
`

    let gradeJson = null
    try {
      const gradeRaw = await callMistral(gradingPrompt, { timeoutMs: 20000, retries: 1 })
      gradeJson = extractJsonFromText(String(gradeRaw || ''))
      if (typeof gradeJson.isCorrect !== 'boolean') gradeJson.isCorrect = localIsCorrect
      if (typeof gradeJson.score !== 'number') gradeJson.score = gradeJson.isCorrect ? 1 : 0.5
      if (!gradeJson.feedback) gradeJson.feedback = gradeJson.isCorrect ? 'Good job.' : 'Please review the concept.'
      if (!gradeJson.explanation) gradeJson.explanation = { steps: [], tip: '' }
    } catch (e) {
      console.warn('grading via Mistral failed, using fallback', e?.message)
      gradeJson = {
        isCorrect: localIsCorrect,
        score: localIsCorrect ? 1 : 0.5,
        feedback: localIsCorrect ? 'Nice work! Your answer matches.' : 'Close — revise the core concept and try again.',
        mistakeType: localIsCorrect ? null : 'partial_omission',
        conceptsInvolved: question.concepts || [],
        explanation: {
          steps: ['Review the definition', 'Work a small example', 'Compare with the options'],
          tip: 'Focus on the tested property.'
        }
      }
    }

    session.lastSubmission = { questionId, answerText, result: gradeJson, ts: Date.now() }

    res.json(gradeJson)
  } catch (err) {
    console.error('submit-answer error:', err)
    res.status(500).json({ error: 'Failed to grade answer' })
  }
})

app.post('/api/end-session', (req, res) => {
  try {
    const { sessionId } = req.body || {}
    if (!sessionId) return res.status(400).json({ error: 'Missing sessionId' })
    const session = sessions.get(sessionId) || { questions: [] }
    const questions = session.questions || []

    const concepts = {}
    questions.forEach(q => {
      (q.concepts || []).forEach(c => { concepts[c] = concepts[c] || 0.6 })
    })

    const masteryMap = concepts
    sessions.delete(sessionId) // cleanup

    res.json({
      masteryMap,
      nextBoosters: Object.keys(masteryMap).slice(0, 2).map(topic => ({ topic, count: 5, difficulty: 'easy', reason: 'low mastery' })),
      timePerConcept: masteryMap
    })
  } catch (err) {
    console.error('end-session error:', err)
    res.status(500).json({ error: 'Failed to end session' })
  }
})

app.listen(PORT, () => {
  console.log(`QuizVerse AI backend (Mistral) listening on port ${PORT}`)
})
