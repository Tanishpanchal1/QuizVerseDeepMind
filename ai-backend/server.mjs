import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 5000

const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const MODEL_ID = process.env.GEMINI_MODEL_ID || 'gemini-2.5-flash'

if (!GEMINI_API_KEY) {
  console.error('Missing GEMINI_API_KEY in environment')
  process.exit(1)
}

async function callGemini(prompt) {
  const url = `https://generativelanguage.googleapis.com/v1/models/${MODEL_ID}:generateContent?key=${GEMINI_API_KEY}`

  const resp = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          role: 'user',
          parts: [{ text: prompt }]
        }
      ]
    })
  })

  if (!resp.ok) {
    const text = await resp.text()
    throw new Error(`Gemini API error ${resp.status}: ${text}`)
  }

  const data = await resp.json()
  const parts =
    data.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || ''

  return parts
}

app.use(cors())
app.use(express.json())

// In-memory session storage (OK for local dev)
const sessions = new Map()

app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'QuizVerse AI backend is running' })
})

app.post('/api/start-session', async (req, res) => {
  try {
    const { subject = 'computer science', topic = 'data structures', count = 5, difficulty = 'medium' } = req.body || {}

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
- source: string, set to "gemini"
- confidence: number between 0.7 and 0.99

Example output:
[
  {
    "qId": "q1",
    "text": "Which traversal visits left-root-right?",
    "type": "MCQ",
    "options": ["Preorder", "Inorder", "Postorder", "Levelorder"],
    "correctOptionIndex": 1,
    "concepts": ["tree traversal"],
    "source": "gemini",
    "confidence": 0.9
  }
]
`

    const rawText = await callGemini(prompt)

    // Try to extract JSON array from the response
    const start = rawText.indexOf('[')
    const end = rawText.lastIndexOf(']') + 1
    const jsonText = start !== -1 && end !== -1 ? rawText.slice(start, end) : rawText

    let parsed
    try {
      parsed = JSON.parse(jsonText)
    } catch (e) {
      console.error('Failed to parse Gemini JSON, raw:', rawText)
      return res.status(500).json({ error: 'Failed to parse questions from Gemini' })
    }

    const questions = (Array.isArray(parsed) ? parsed : []).map((q, idx) => ({
      qId: q.qId || `q${idx + 1}`,
      text: q.text || 'Untitled question',
      type: (q.type || 'MCQ').toUpperCase(),
      options: Array.isArray(q.options) && q.options.length ? q.options : ['Option A', 'Option B', 'Option C', 'Option D'],
      correctOptionIndex:
        typeof q.correctOptionIndex === 'number' && q.correctOptionIndex >= 0 && q.correctOptionIndex < 4
          ? q.correctOptionIndex
          : 0,
      concepts: Array.isArray(q.concepts) ? q.concepts : ['general'],
      source: q.source || 'gemini',
      confidence: typeof q.confidence === 'number' ? q.confidence : 0.9
    }))

    const sessionId = `gemini-${Date.now()}`
    sessions.set(sessionId, questions)

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

    if (!sessionId || !questionId || !answerText) {
      return res.status(400).json({ error: 'Missing sessionId, questionId or answerText' })
    }

    const questions = sessions.get(sessionId) || []
    const question = questions.find(q => q.qId === questionId)

    if (!question) {
      return res.status(400).json({ error: 'Unknown question for this session' })
    }

    let isCorrect = false

    if (question.type === 'MCQ' && typeof question.correctOptionIndex === 'number') {
      const correctText = (question.options?.[question.correctOptionIndex] || '').toLowerCase().trim()
      isCorrect = correctText === String(answerText).toLowerCase().trim()
    }

    // Ask Gemini for feedback / explanation
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

    const gradeRaw = await callGemini(gradingPrompt)
    let gradeJson
    try {
      const s = gradeRaw.indexOf('{')
      const e = gradeRaw.lastIndexOf('}') + 1
      const objText = s !== -1 && e !== -1 ? gradeRaw.slice(s, e) : gradeRaw
      gradeJson = JSON.parse(objText)
    } catch (e) {
      console.error('Failed to parse Gemini grading JSON, raw:', gradeRaw)
      gradeJson = null
    }

    const responsePayload = gradeJson || {
      isCorrect,
      score: isCorrect ? 1 : 0.5,
      feedback: isCorrect
        ? 'Nice work! Your reasoning matches the key idea.'
        : 'You are close — revisit the core concept and try again.',
      mistakeType: isCorrect ? null : 'partial_omission',
      conceptsInvolved: question.concepts || [],
      explanation: {
        steps: [
          'Recall the formal definition from your notes.',
          'Try to construct a small example by hand.',
          'Compare your answer to the example behaviour.'
        ],
        tip: 'Focus on the key concept the question is testing.'
      }
    }

    res.json(responsePayload)
  } catch (err) {
    console.error('submit-answer error:', err)
    res.status(500).json({ error: 'Failed to grade answer' })
  }
})

app.post('/api/end-session', (req, res) => {
  try {
    const { sessionId } = req.body || {}
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing sessionId' })
    }

    const questions = sessions.get(sessionId) || []
    const concepts = {}

    questions.forEach(q => {
      ;(q.concepts || []).forEach(c => {
        concepts[c] = concepts[c] || 0.6
      })
    })

    const masteryMap = concepts

    res.json({
      masteryMap,
      nextBoosters: Object.keys(masteryMap).slice(0, 2).map(topic => ({
        topic,
        count: 5,
        difficulty: 'easy',
        reason: 'low mastery'
      })),
      timePerConcept: masteryMap
    })
  } catch (err) {
    console.error('end-session error:', err)
    res.status(500).json({ error: 'Failed to end session' })
  }
})

app.listen(PORT, () => {
  console.log(`QuizVerse AI backend listening on port ${PORT}`)
})
