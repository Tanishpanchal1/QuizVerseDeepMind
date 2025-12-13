import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Sparkles, 
  Wand2, 
  BookOpen, 
  Target,
  Clock,
  Zap,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'

const AIQuizGenerator = ({ onQuestionsGenerated, onError }) => {
  const [config, setConfig] = useState({
    subject: '',
    topic: '',
    count: 5,
    difficulty: 'medium',
    types: ['MCQ']
  })
  
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedQuestions, setGeneratedQuestions] = useState([])
  const [showPreview, setShowPreview] = useState(false)

  const handleGenerate = async () => {
    if (!config.subject.trim() || !config.topic.trim()) {
      onError('Please enter both subject and topic')
      return
    }

    setIsGenerating(true)
    
    try {
      // Use the environment variable or fallback to the default URL
      const apiUrl = import.meta.env.VITE_START_SESSION_URL || 'http://localhost:5000/api/start-session'
      
      // Prepare the request payload with the correct parameter names
      const requestPayload = {
        subject: config.subject,
        topic: config.topic,
        numberOfQuestions: config.count, // Make sure this matches your backend
        count: config.count, // Some backends use 'count' instead
        difficulty: config.difficulty,
        mode: 'quiz-creation'
      }
      
      console.log('Sending request:', requestPayload) // Debug log
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(requestPayload)
      })

      if (!response.ok) {
        const errorText = await response.text()
        console.error('API Error:', response.status, errorText)
        throw new Error(`Failed to generate questions: ${response.status}`)
      }

      const data = await response.json()
      console.log('API Response:', data) // Debug log
      
      // Handle different response formats
      let questionsArray = []
      
      if (data.questions && Array.isArray(data.questions)) {
        questionsArray = data.questions
      } else if (data.data && Array.isArray(data.data)) {
        questionsArray = data.data
      } else if (Array.isArray(data)) {
        questionsArray = data
      }

      if (questionsArray.length === 0) {
        throw new Error('No questions were generated')
      }

      console.log(`Generated ${questionsArray.length} questions (requested: ${config.count})`) // Debug log

      const questions = questionsArray.map((q, idx) => {
        // Handle different question formats
        const questionText = q.question || q.text || q.questionText || ''
        const options = q.options || q.choices || ['', '', '', '']
        const correctIndex = q.correctAnswer !== undefined 
          ? q.correctAnswer 
          : (q.correctOptionIndex !== undefined ? q.correctOptionIndex : 0)

        return {
          id: Date.now() + idx,
          text: questionText,
          type: 'mcq',
          options: Array.isArray(options) ? options : ['', '', '', ''],
          correctAnswer: typeof correctIndex === 'number' ? correctIndex : 0,
          aiGenerated: true
        }
      })

      // Filter out any invalid questions
      const validQuestions = questions.filter(q => 
        q.text.trim() !== '' && 
        q.options.length >= 2 &&
        q.options.every(opt => opt.trim() !== '')
      )

      if (validQuestions.length === 0) {
        throw new Error('Generated questions are not in the correct format')
      }

      console.log(`Valid questions: ${validQuestions.length}`) // Debug log

      setGeneratedQuestions(validQuestions)
      setShowPreview(true)
    } catch (err) {
      console.error('AI generation error:', err)
      onError(`Failed to generate questions: ${err.message}. Please check your backend is running.`)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleUseQuestions = () => {
    onQuestionsGenerated(generatedQuestions)
    setShowPreview(false)
    setGeneratedQuestions([])
  }

  if (showPreview && generatedQuestions.length > 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-green-500 to-emerald-500 px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Questions Generated!</h3>
                  <p className="text-green-100 text-sm">{generatedQuestions.length} questions ready to use</p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="p-6">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
              <div className="flex items-start space-x-3">
                <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-blue-900 font-medium">AI-generated questions are ready!</p>
                  <p className="text-xs text-blue-700 mt-1">
                    Review the questions below. You can edit them in the next step before creating your quiz.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-3 mb-6 max-h-96 overflow-y-auto">
              {generatedQuestions.map((q, idx) => (
                <div key={q.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  <div className="flex items-start space-x-3">
                    <div className="w-6 h-6 bg-primary-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-primary-600 font-bold text-sm">{idx + 1}</span>
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{q.text}</p>
                      <div className="mt-2 space-y-1">
                        {q.options.map((opt, i) => (
                          <p key={i} className={`text-xs ${i === q.correctAnswer ? 'text-green-600 font-semibold' : 'text-gray-600'}`}>
                            {String.fromCharCode(65 + i)}. {opt}
                            {i === q.correctAnswer && ' ✓'}
                          </p>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowPreview(false)
                  setGeneratedQuestions([])
                }}
                className="flex-1 px-4 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
              >
                Generate Again
              </button>
              <button
                type="button"
                onClick={handleUseQuestions}
                className="flex-1 px-4 py-3 bg-gradient-to-r from-primary-500 to-primary-600 text-white rounded-xl hover:from-primary-600 hover:to-primary-700 transition-all font-medium shadow-lg"
              >
                Use These Questions
              </button>
            </div>
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="bg-white rounded-2xl lg:rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
        <div className="bg-gradient-to-r from-purple-500 to-purple-600 px-6 py-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Wand2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">AI Quiz Generator</h2>
              <p className="text-purple-100 text-sm">Let AI create questions for your quiz</p>
            </div>
          </div>
        </div>

        <div className="p-6 lg:p-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start space-x-3">
              <Sparkles className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm text-blue-900 font-medium">How it works</p>
                <p className="text-xs text-blue-700 mt-1">
                  Describe what you want, and AI will generate quiz questions for you. You can edit them before creating the quiz.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <BookOpen className="w-4 h-4 text-primary-500" />
              <span>Subject *</span>
            </label>
            <input
              type="text"
              value={config.subject}
              onChange={(e) => setConfig({ ...config, subject: e.target.value })}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-lg placeholder-gray-400"
              placeholder="e.g., Computer Science, Biology, History"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <Target className="w-4 h-4 text-primary-500" />
              <span>Topic *</span>
            </label>
            <input
              type="text"
              value={config.topic}
              onChange={(e) => setConfig({ ...config, topic: e.target.value })}
              className="w-full px-4 py-4 border-2 border-gray-200 rounded-2xl focus:border-primary-500 focus:ring-4 focus:ring-primary-200 transition-all duration-200 text-lg placeholder-gray-400"
              placeholder="e.g., Data Structures, Cell Biology, World War II"
              disabled={isGenerating}
            />
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <Clock className="w-4 h-4 text-primary-500" />
              <span>Number of Questions</span>
            </label>
            <div className="grid grid-cols-5 gap-2">
              {[3, 5, 10, 15, 20].map((num) => (
                <button
                  key={num}
                  type="button"
                  onClick={() => setConfig({ ...config, count: num })}
                  disabled={isGenerating}
                  className={`py-3 rounded-xl font-semibold transition-all ${
                    config.count === num
                      ? 'bg-primary-500 text-white shadow-lg'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Selected: <span className="font-semibold text-primary-600">{config.count} questions</span>
            </p>
          </div>

          <div>
            <label className="flex items-center space-x-2 text-sm font-semibold text-gray-700 mb-3">
              <Zap className="w-4 h-4 text-primary-500" />
              <span>Difficulty Level</span>
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { value: 'easy', label: 'Easy', colorClass: 'green' },
                { value: 'medium', label: 'Medium', colorClass: 'yellow' },
                { value: 'hard', label: 'Hard', colorClass: 'red' }
              ].map(({ value, label, colorClass }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setConfig({ ...config, difficulty: value })}
                  disabled={isGenerating}
                  className={`py-4 rounded-xl font-semibold transition-all border-2 ${
                    config.difficulty === value
                      ? colorClass === 'green' 
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : colorClass === 'yellow'
                        ? 'border-yellow-500 bg-yellow-50 text-yellow-700'
                        : 'border-red-500 bg-red-50 text-red-700'
                      : 'border-gray-200 text-gray-700 hover:bg-gray-50 disabled:opacity-50'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !config.subject.trim() || !config.topic.trim()}
            className="w-full py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg flex items-center justify-center space-x-2"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Generating {config.count} Questions...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-5 h-5" />
                <span>Generate {config.count} Quiz Questions</span>
              </>
            )}
          </button>
        </div>
      </div>
    </motion.div>
  )
}

export default AIQuizGenerator
