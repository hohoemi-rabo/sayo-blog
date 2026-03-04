'use client'

import { motion } from 'framer-motion'
import { staggerContainer, staggerItem } from '@/lib/motion-variants'

export function WelcomeScreen() {
  return (
    <motion.div
      className="flex flex-col items-center text-center"
      variants={staggerContainer}
      initial="hidden"
      animate="visible"
    >
      <motion.h1
        className="text-3xl md:text-4xl lg:text-5xl font-playfair font-bold text-text-primary leading-tight"
        variants={staggerItem}
      >
        何を知りたいですか？
      </motion.h1>

      <motion.p
        className="mt-3 text-base md:text-lg text-text-secondary font-noto-sans-jp leading-relaxed"
        variants={staggerItem}
      >
        飯田・下伊那のことなら、なんでも聞いてください
      </motion.p>
    </motion.div>
  )
}
