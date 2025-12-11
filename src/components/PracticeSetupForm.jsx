import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, ChevronUp, Settings2, Sparkles } from 'lucide-react'

const SUBJECT_CHIPS = ['DSA', 'Java', 'DBMS', 'OS', 'Aptitude']
const QUESTION_COUNTS = [5, 10, 20]
const DIFFICULTIES = ['Easy', 'Medium', 'Hard', 'Mixed']
const QUESTION_TYPES = [
  { key: 'MCQ', label: 'MCQ' },
  { key: 'ONE_WORD', label: 'One-word' },
  { key: 'SHORT', label: 'Short answer' },
  { key: 'CODE', label: 'Code snippet' },
  { key: 'TRUE_FALSE', label: 'True/False' }
]

const GOALS = [
  { value: 'revise_quickly', label: 'Revise quickly' },
  { value: 'exam_level', label: 'Exam-level test' },
  { value: 'from_scratch', label: 'Learning from scratch' }
]

const PracticeSetupForm = ({ onStart, onPreview, loading }) => {
  const [subject, setSubject] = useState('DSA')
  const [customSubject, setCustomSubject] = useState('')
  const [topic, setTopic] = useState('')
  const [subtopics, setSubtopics] = useState('')
  const [count, setCount] = useState(10)
  const [difficulty, setDifficulty] = useState('Mixed')
  const [types, setTypes] = useState(['MCQ', 'SHORT'])
  const [mode, setMode] = useState('practice')
  const [goal, setGoal] = useState('revise_quickly')
  const [useBankFirst, setUseBankFirst] = useState(true)
  const [voiceMode, setVoiceMode] = useState(false)
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [difficultyMix, setDifficultyMix] = useState({ easy: 30, medium: 50, hard: 20 })

  const [errors, setErrors] = useState({})

  const handleToggleType = (key) => {
    setTypes(prev =>
      prev.includes(key)
        ? prev.filter(t => t !== key)
        : [...prev, key]
    )
  }

  const validate = () => {
    const nextErrors = {}
    if (!topic.trim()) nextErrors.topic = 'Topic is required.'
    if (!count || count <= 0) nextErrors.count = 'Question count must be greater than 0.'
    if (types.length === 0) nextErrors.types = 'Select at least one question type.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }

  const buildPayload = () => {
    const finalSubject = customSubject.trim() || subject
    return {
      subject: finalSubject,
      topic: topic.trim(),
      subtopics: subtopics
        .split(',')
        .map(s => s.trim())
        .filter(Boolean),
      count,
      difficulty: difficulty.toLowerCase(),
      types,
      mode,
      goal,
      useBankFirst,
      voiceMode,
      difficultyMix
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!validate()) return
    const payload = buildPayload()
    onStart?.(payload)
  }

  const handlePreview = () => {
    if (!validate()) return
    const payload = buildPayload()
    onPreview?.(payload)
  }

  return (
    <motion.form
      layout
      onSubmit={handleSubmit}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-8 space-y-6"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 mb-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Smart setup
          </p>
          <h2 className="text-lg sm:text-xl font-bold text-gray-900">Practice Setup</h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">Describe what you want to master — we handle the rest.</p>
        </div>
        <div className="hidden sm:flex items-center text-xs rounded-full bg-primary-50 text-primary-700 px-3 py-1 font-medium">
          <Settings2 className="w-3 h-3 mr-1" /> Guided
        </div>
      </div>

      {/* Subject */}
      <div className="space-y-3">
        <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Subject</label>
        <div className="flex flex-wrap gap-2">
          {SUBJECT_CHIPS.map(chip => (
            <button
              type="button"
              key={chip}
              onClick={() => setSubject(chip)}
              className={`px-3 py-1.5 rounded-full text-xs sm:text-sm border transition-all duration-150 ${
                subject === chip
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
              }`}
            >
              {chip}
            </button>
          ))}
          <input
            type="text"
            value={customSubject}
            onChange={(e) => setCustomSubject(e.target.value)}
            placeholder="Other subject"
            className="px-3 py-1.5 rounded-full text-xs sm:text-sm border border-dashed border-gray-300 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
            aria-label="Custom subject"
          />
        </div>
      </div>

      {/* Topic & subtopics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">
            Topic / Concept <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="e.g., Binary search tree insertion"
            className={`w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border text-sm sm:text-base focus:ring-2 focus:ring-primary-200 outline-none ${
              errors.topic ? 'border-red-400' : 'border-gray-200 focus:border-primary-500'
            }`}
            aria-invalid={!!errors.topic}
            aria-describedby={errors.topic ? 'topic-error' : undefined}
          />
          <div className="flex items-center justify-between">
            <p className="text-[11px] text-gray-500">Well auto-expand to related subtopics.</p>
            <span className="text-[11px] text-gray-400">Type anything in plain English.</span>
          </div>
          {errors.topic && (
            <p id="topic-error" className="text-xs text-red-500 mt-1">{errors.topic}</p>
          )}
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Subtopics (optional)</label>
          <input
            type="text"
            value={subtopics}
            onChange={(e) => setSubtopics(e.target.value)}
            placeholder="Comma-separated, e.g., rotations, height, complexity"
            className="w-full px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl border border-gray-200 text-sm sm:text-base focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none"
          />
          <p className="text-[11px] text-gray-500">We use this as a hint; you can leave it blank.</p>
        </div>
      </div>

      {/* Core settings */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Question count */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Question count</label>
          <div className="flex gap-2">
            {QUESTION_COUNTS.map(q => (
              <button
                key={q}
                type="button"
                onClick={() => setCount(q)}
                className={`flex-1 py-2 rounded-xl text-xs sm:text-sm border font-medium transition-all duration-150 ${
                  count === q
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
                aria-pressed={count === q}
              >
                {q}
              </button>
            ))}
          </div>
          {errors.count && <p className="text-xs text-red-500">{errors.count}</p>}
        </div>

        {/* Difficulty */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Difficulty</label>
          <div className="grid grid-cols-2 gap-2">
            {DIFFICULTIES.map(d => (
              <button
                key={d}
                type="button"
                onClick={() => setDifficulty(d)}
                className={`py-2 rounded-xl text-xs sm:text-sm border transition-all duration-150 ${
                  difficulty === d
                    ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                    : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {d}
              </button>
            ))}
          </div>
        </div>

        {/* Mode & goal */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide flex items-center justify-between">
            Mode
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-gray-100 text-gray-600">
              {mode === 'practice' ? 'Practice Mode' : 'Test Mode'}
            </span>
          </label>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMode('practice')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm border transition-all duration-150 ${
                mode === 'practice'
                  ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Practice
            </button>
            <button
              type="button"
              onClick={() => setMode('test')}
              className={`flex-1 py-2 rounded-xl text-xs sm:text-sm border transition-all duration-150 ${
                mode === 'test'
                  ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
            >
              Test
            </button>
          </div>
          <select
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            className="mt-1 w-full px-3 py-2 rounded-xl border border-gray-200 text-xs sm:text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none bg-white"
            aria-label="Practice goal"
          >
            {GOALS.map(g => (
              <option key={g.value} value={g.value}>{g.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Question types */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Question types</label>
          {errors.types && <p className="text-xs text-red-500">{errors.types}</p>}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {QUESTION_TYPES.map(t => (
            <button
              key={t.key}
              type="button"
              onClick={() => handleToggleType(t.key)}
              className={`flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs sm:text-sm border transition-all duration-150 ${
                types.includes(t.key)
                  ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                  : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
              }`}
              aria-pressed={types.includes(t.key)}
            >
              <span>{t.label}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-gray-500">Mix formats to keep the session active and engaging.</p>
      </div>

      {/* Advanced options */}
      <div className="border border-dashed border-gray-200 rounded-2xl p-3 sm:p-4 bg-gray-50/60">
        <button
          type="button"
          onClick={() => setAdvancedOpen(v => !v)}
          className="w-full flex items-center justify-between text-xs sm:text-sm font-medium text-gray-700"
          aria-expanded={advancedOpen}
        >
          <span className="flex items-center gap-2">
            <Settings2 className="w-4 h-4 text-primary-500" />
            Advanced options
          </span>
          {advancedOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <AnimatePresence initial={false}>
          {advancedOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className="mt-3 space-y-3 text-xs sm:text-sm text-gray-700"
            >
              {/* Difficulty distribution */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Difficulty distribution</span>
                  <span className="text-[11px] text-gray-500">{difficultyMix.easy}% / {difficultyMix.medium}% / {difficultyMix.hard}%</span>
                </div>
                <div className="flex gap-2 text-[11px]">
                  <div className="flex-1">
                    <label className="block text-gray-500 mb-1">Easy</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficultyMix.easy}
                      onChange={(e) => setDifficultyMix(m => ({ ...m, easy: Number(e.target.value) }))}
                      className="w-full"
                      aria-label="Easy difficulty percentage"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-gray-500 mb-1">Medium</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficultyMix.medium}
                      onChange={(e) => setDifficultyMix(m => ({ ...m, medium: Number(e.target.value) }))}
                      className="w-full"
                      aria-label="Medium difficulty percentage"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-gray-500 mb-1">Hard</label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={difficultyMix.hard}
                      onChange={(e) => setDifficultyMix(m => ({ ...m, hard: Number(e.target.value) }))}
                      className="w-full"
                      aria-label="Hard difficulty percentage"
                    />
                  </div>
                </div>
              </div>

              {/* Toggles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={useBankFirst}
                    onChange={(e) => setUseBankFirst(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium">Use question bank first</span>
                    <p className="text-[11px] text-gray-500">Prefer trusted, teacher-curated questions when available.</p>
                  </div>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={voiceMode}
                    onChange={(e) => setVoiceMode(e.target.checked)}
                    className="mt-0.5"
                  />
                  <div>
                    <span className="font-medium">Voice mode</span>
                    <p className="text-[11px] text-gray-500">Enable TTS/ASR controls during the session (where available).</p>
                  </div>
                </label>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-between items-stretch sm:items-center">
        <div className="flex-1 flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 inline-flex items-center justify-center gap-2 btn btn-primary py-2.5 sm:py-3 text-sm sm:text-base disabled:opacity-70"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" aria-hidden="true" />
            )}
            <span>Start Practice</span>
          </button>
          <button
            type="button"
            onClick={handlePreview}
            className="flex-1 inline-flex items-center justify-center gap-2 btn btn-secondary py-2.5 sm:py-3 text-sm sm:text-base"
          >
            Preview questions
          </button>
        </div>
        <p className="text-[11px] text-gray-500 text-left sm:text-right">
          We never store your answers without consent. Perfect for live demos and quick drills.
        </p>
      </div>
    </motion.form>
  )
}

export default PracticeSetupForm
