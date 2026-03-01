'use client'

import { motion } from 'framer-motion'
import { fadeIn, staggerContainer, staggerItem } from '@/lib/motion-variants'

export function WelcomeScreen() {
  return (
    <motion.div
      className="flex-1 flex flex-col items-center justify-center px-4 py-12"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      {/* FUNE avatar */}
      <motion.div variants={staggerItem}>
        <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
          <span className="text-3xl font-playfair font-bold text-primary">
            F
          </span>
        </div>
      </motion.div>

      {/* Heading */}
      <motion.h1
        className="text-2xl md:text-3xl font-playfair font-bold text-text-primary mb-3 text-center"
        variants={staggerItem}
      >
        FUNE に聞いてみよう
      </motion.h1>

      {/* Description */}
      <motion.p
        className="text-text-secondary font-noto-sans-jp text-center leading-relaxed max-w-md"
        variants={fadeIn}
      >
        飯田・下伊那の&ldquo;気になる&rdquo;を
        <br className="sm:hidden" />
        なんでも聞いてください
      </motion.p>
    </motion.div>
  )
}
