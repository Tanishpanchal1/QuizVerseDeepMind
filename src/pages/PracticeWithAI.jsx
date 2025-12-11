import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Brain, Activity, Sparkles, ArrowRight } from 'lucide-react'
import PracticeSetupForm from '../components/PracticeSetupForm'
import QuestionPlayer from '../components/QuestionPlayer'
import SessionSummary from '../components/SessionSummary'
import { usePracticeSession } from '../hooks/usePracticeSession'

const PracticeWithAI = () => {
  const {
    questions,
    currentIndex,
    loadingStart,
    loadingSubmit,
    summary,
    startSession,
    submitAnswer,
    endSession,
    setCurrentIndex,
    isDemoMode
  } = usePracticeSession()

  const [showSummary, setShowSummary] = useState(false)

  const totalQuestions = questions.length || 0
  const answeredCount = Math.min(currentIndex, totalQuestions)

  const handleStart = async (config) => {
    const result = await startSession(config)
    if (result?.questions?.length) {
      setShowSummary(false)
      setCurrentIndex(0)
    }
  }

  const handleEndSession = async () => {
    const data = await endSession({})
    if (data) setShowSummary(true)
  }

  const handleSkip = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1)
    } else {
      handleEndSession()
    }
  }

  const progressPct = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0

  return (
    <div className="min-h-screen pt-16 bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-6 sm:space-y-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl bg-white/90 backdrop-blur-sm border border-gray-100 shadow-sm p-5 sm:p-7 flex flex-col gap-3"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-primary-50 px-3 py-1 text-[11px] font-medium text-primary-700">
                <Sparkles className="w-3.5 h-3.5" />
                {isDemoMode ? 'Demo mode · No backend required' : 'AI powered practice'}
              </div>
              <div className="flex items-center gap-2">
                <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-primary-600 text-white shadow-md">
                  <Brain className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 leading-tight">
                    AI Practice Lab
                  </h1>
                  <p className="text-xs sm:text-sm text-gray-500">Practice Mode • Smart explanations</p>
                </div>
              </div>
              <p className="text-sm sm:text-base text-gray-600 max-w-xl">
                Tell us what you want to master. The AI builds a focused session and teaches through instant feedback
                and explanations.
              </p>
            </div>
            <div className="hidden sm:flex flex-col items-end gap-2 text-xs text-gray-500">
              <div className="inline-flex items-center gap-2 rounded-full bg-gray-50 px-3 py-1">
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
                <span>{totalQuestions > 0 ? `Q ${answeredCount + 1} / ${totalQuestions}` : 'Session not started'}</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr),minmax(0,1fr)] gap-6 lg:gap-8 items-start">
          {/* Left: setup + question player */}
          <div className="space-y-4">
            <PracticeSetupForm
              loading={loadingStart}
              onStart={handleStart}
              onPreview={() => {}}
            />

            <QuestionPlayer
              questions={questions}
              index={currentIndex}
              loadingSubmit={loadingSubmit}
              onSubmit={submitAnswer}
              onSkip={handleSkip}
              onHint={() => {}}
            />

            <div className="flex justify-end">
              {questions.length > 0 && !showSummary && (
                <button
                  type="button"
                  onClick={handleEndSession}
                  className="inline-flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  End session & view summary
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Right: progress & mastery */}
          <div className="space-y-4">
            {/* Progress card */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: 0.05 }}
              className="rounded-2xl bg-white shadow-md border border-gray-100 p-4 space-y-3"
            >
              <div className="flex items-center justify-between text-xs text-gray-600">
                <span className="font-semibold">Session progress</span>
                <span>
                  {totalQuestions > 0
                    ? `Q ${answeredCount + 1} / ${totalQuestions}`
                    : 'Waiting for first session'}
                </span>
              </div>
              <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ duration: 0.4 }}
                  className="h-full rounded-full bg-gradient-to-r from-primary-500 via-secondary-500 to-emerald-500"
                />
              </div>
              <p className="text-[11px] text-gray-500">
                We adapt explanations based on your path — no penalties for exploring.
              </p>
            </motion.div>

            <SessionSummary
              summary={showSummary ? summary : null}
              onStartBooster={(booster) => {
                if (!booster) return
                handleStart({
                  subject: 'Custom booster',
                  topic: booster.topic,
                  subtopics: [],
                  count: booster.count || 5,
                  difficulty: booster.difficulty || 'easy',
                  types: ['MCQ', 'SHORT'],
                  mode: 'practice',
                  goal: 'revise_quickly',
                  useBankFirst: true,
                  voiceMode: false,
                  difficultyMix: { easy: 60, medium: 30, hard: 10 }
                })
              }}
            />
          </div>
        </div>
      </div>
    </div>
  )
}

export default PracticeWithAI
