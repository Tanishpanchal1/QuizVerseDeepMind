import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles } from 'lucide-react'

const HintButton = ({ onClick, disabled, remaining }) => {
  return (
    <motion.button
      type="button"
      whileHover={{ scale: disabled ? 1 : 1.03, y: disabled ? 0 : -1 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="inline-flex items-center justify-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs sm:text-sm font-medium text-amber-800 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
    >
      <Sparkles className="h-4 w-4" />
      <span>Hint{typeof remaining === 'number' ? ` (${remaining} left)` : ''}</span>
    </motion.button>
  )
}

export default HintButton
