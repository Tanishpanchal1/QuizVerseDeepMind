import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb, Info } from 'lucide-react'

const ExplanationCard = ({ visible, explanation }) => {
  if (!explanation) return null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 8 }}
          transition={{ duration: 0.2 }}
          className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50/80 p-4 text-sm text-emerald-900 shadow-sm"
        >
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-7 w-7 items-center justify-center rounded-xl bg-emerald-500 text-white">
              <Lightbulb className="h-4 w-4" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                <span>AI Explanation</span>
              </div>
              {explanation.steps && explanation.steps.length > 0 && (
                <ol className="ml-4 list-decimal space-y-1">
                  {explanation.steps.map((step, idx) => (
                    <li key={idx} className="leading-snug">
                      {step}
                    </li>
                  ))}
                </ol>
              )}
              {explanation.tip && (
                <p className="mt-2 flex items-start gap-1.5 text-xs text-emerald-800">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span className="leading-snug">{explanation.tip}</span>
                </p>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ExplanationCard
