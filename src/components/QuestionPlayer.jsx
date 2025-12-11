import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BadgeCheck, Brain, Clock, Flame, ShieldAlert } from 'lucide-react'
import HintButton from './HintButton'
import ExplanationCard from './ExplanationCard'

const QuestionPlayer = ({
  questions,
  index,
  loadingSubmit,
  onSubmit,
  onSkip,
  onHint,
  maxHints = 3
}) => {
  const question = questions?.[index]
  const [answer, setAnswer] = useState('')
  const [selectedOption, setSelectedOption] = useState(null)
  const [showExplanation, setShowExplanation] = useState(false)
  const [lastResult, setLastResult] = useState(null)
  const [hintCount, setHintCount] = useState(0)

  useEffect(() => {
    setAnswer('')
    setSelectedOption(null)
    setShowExplanation(false)
    setLastResult(null)
  }, [index])

  if (!question) {
    return (
      <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        No questions yet — start a practice session from the setup panel.
      </div>
    )
  }

  const type = (question.type || '').toUpperCase()

  const handleSubmit = async () => {
    const answerText =
      type === 'MCQ' && typeof selectedOption === 'number'
        ? question.options?.[selectedOption]
        : answer

    if (!answerText || !answerText.toString().trim()) return

    const res = await onSubmit?.({ answerText, answerMeta: {} })
    if (res) {
      setLastResult(res)
      setShowExplanation(true)
    }
  }

  const handleHint = async () => {
    if (hintCount >= maxHints) return
    setHintCount(c => c + 1)
    await onHint?.(question)
  }

  const correctnessBadge = lastResult
    ? lastResult.isCorrect
      ? 'Correct'
      : 'Keep going'
    : null

  return (
    <motion.div
      key={question.qId}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="bg-white rounded-2xl shadow-xl border border-gray-100 p-4 sm:p-6 lg:p-7 space-y-5"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600 flex items-center gap-1">
            <Brain className="w-3.5 h-3.5" />
            Question {index + 1} of {questions.length}
          </p>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900 leading-snug">
            {question.text}
          </h2>
          {question.concepts && question.concepts.length > 0 && (
            <div className="mt-1 flex flex-wrap gap-1.5">
              {question.concepts.map(c => (
                <span
                  key={c}
                  className="inline-flex items-center rounded-full bg-primary-50 px-2 py-0.5 text-[11px] font-medium text-primary-700"
                >
                  {c}
                </span>
              ))}
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-1 text-[11px] text-gray-500">
          <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5">
            <Flame className="w-3 h-3 text-amber-500" />
            {type}
          </span>
          {typeof question.confidence === 'number' && (
            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-emerald-700">
              <BadgeCheck className="w-3 h-3" />
              {(question.confidence * 100).toFixed(0)}% confidence
            </span>
          )}
          {question.source && (
            <span className="inline-flex items-center gap-1 rounded-full bg-gray-50 px-2 py-0.5">
              <ShieldAlert className="w-3 h-3 text-gray-400" />
              {question.source}
            </span>
          )}
        </div>
      </div>

      {/* Answer input */}
      <div className="space-y-4">
        {type === 'MCQ' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {question.options?.map((opt, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setSelectedOption(idx)}
                className={`flex items-center justify-between gap-2 rounded-2xl border px-3 py-3 text-left text-sm transition-all duration-150 ${
                  selectedOption === idx
                    ? 'border-primary-500 bg-primary-50 shadow-sm'
                    : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
              >
                <span className="flex items-center gap-2">
                  <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold ${
                    selectedOption === idx
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                  <span>{opt}</span>
                </span>
              </button>
            ))}
          </div>
        )}

        {type === 'ONE_WORD' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">One-word answer</label>
            <input
              type="text"
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none font-mono"
              aria-label="One word answer"
            />
          </div>
        )}

        {type === 'SHORT' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Short answer</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={4}
              minLength={10}
              className="w-full rounded-2xl border border-gray-200 px-3 py-2.5 text-sm focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-y"
              placeholder="Explain your reasoning in 1–3 sentences."
            />
          </div>
        )}

        {type === 'CODE' && (
          <div className="space-y-1">
            <label className="text-xs font-medium text-gray-600">Code snippet</label>
            <textarea
              value={answer}
              onChange={e => setAnswer(e.target.value)}
              rows={6}
              className="w-full rounded-2xl border border-gray-200 bg-slate-950/95 px-3 py-2.5 text-xs sm:text-sm font-mono text-slate-50 focus:border-primary-500 focus:ring-2 focus:ring-primary-200 outline-none resize-y"
              placeholder="Write your code here..."
            />
          </div>
        )}

        {type === 'TRUE_FALSE' && (
          <div className="grid grid-cols-2 gap-3">
            {['True', 'False'].map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAnswer(val)}
                className={`flex items-center justify-center rounded-2xl border px-3 py-3 text-sm font-semibold transition-all duration-150 ${
                  answer === val
                    ? 'bg-primary-600 text-white border-primary-600 shadow-sm'
                    : 'bg-white text-gray-800 border-gray-200 hover:bg-gray-50'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="mt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-1 gap-2">
          <button
            type="button"
            onClick={handleSubmit}
            disabled={loadingSubmit}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md hover:bg-primary-700 disabled:opacity-70 disabled:cursor-not-allowed"
          >
            {loadingSubmit && (
              <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" aria-hidden="true" />
            )}
            <span>Submit answer</span>
          </button>
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Skip
          </button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <HintButton
            onClick={handleHint}
            disabled={hintCount >= maxHints}
            remaining={Math.max(0, maxHints - hintCount)}
          />
          <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500">
            <Clock className="w-3.5 h-3.5" />
            <span>Answer at your own pace — timers coming soon.</span>
          </div>
        </div>
      </div>

      {/* Feedback */}
      {lastResult && (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50/80 p-3 text-xs sm:text-sm text-gray-800 space-y-2">
          <div className="flex items-center justify-between">
            <span className="font-semibold flex items-center gap-1">
              {lastResult.isCorrect ? '✅ Correct' : '✨ Guided feedback'}
            </span>
            {correctnessBadge && (
              <span className="rounded-full bg-white/70 px-2 py-0.5 text-[11px] font-medium text-gray-600">
                {correctnessBadge}
              </span>
            )}
          </div>
          {lastResult.feedback && (
            <p className="leading-snug">{lastResult.feedback}</p>
          )}
        </div>
      )}

      <ExplanationCard visible={showExplanation} explanation={lastResult?.explanation} />
    </motion.div>
  )
}

export default QuestionPlayer
