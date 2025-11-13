'use client'

import { motion } from 'framer-motion'
import { slideInUp, fadeIn } from '@/lib/motion-variants'

export default function HeroSection() {
  const scrollToContent = () => {
    window.scrollTo({
      top: window.innerHeight,
      behavior: 'smooth',
    })
  }

  return (
    <section className="relative min-h-[60vh] md:min-h-[70vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-background via-primary/5 to-accent-turquoise/10">
      {/* Decorative Background Pattern */}
      <div className="absolute inset-0 opacity-10">
        <svg
          className="w-full h-full"
          viewBox="0 0 800 600"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Beardsley-inspired decorative curves */}
          <path
            d="M0,300 Q200,100 400,300 T800,300"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-primary"
          />
          <path
            d="M0,350 Q200,550 400,350 T800,350"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-accent-turquoise"
          />
          <circle cx="100" cy="150" r="30" fill="currentColor" className="text-accent-purple/30" />
          <circle cx="700" cy="450" r="40" fill="currentColor" className="text-primary/30" />
          <circle cx="400" cy="100" r="20" fill="currentColor" className="text-accent-turquoise/30" />
          <circle cx="600" cy="500" r="25" fill="currentColor" className="text-accent-purple/30" />
        </svg>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
        <motion.div
          variants={fadeIn}
          initial="hidden"
          animate="visible"
          transition={{ delay: 0.2 }}
        >
          {/* Title */}
          <motion.h1
            className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-playfair font-bold text-primary mb-6"
            variants={slideInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.3 }}
          >
            Sayo&apos;s Journal
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            className="text-xl sm:text-2xl md:text-3xl font-noto-serif-jp text-text-primary mb-8"
            variants={slideInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.4 }}
          >
            言葉で&quot;場所・人・記憶&quot;をつなぐ
          </motion.p>

          {/* Decorative Divider */}
          <motion.div
            className="flex items-center justify-center mb-8"
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.5 }}
          >
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="mx-4 w-2 h-2 rounded-full bg-primary" />
            <div className="h-px w-16 bg-gradient-to-r from-transparent via-primary to-transparent" />
          </motion.div>

          {/* Description */}
          <motion.p
            className="max-w-2xl mx-auto text-base sm:text-lg md:text-xl font-noto-sans-jp text-text-secondary leading-relaxed"
            variants={slideInUp}
            initial="hidden"
            animate="visible"
            transition={{ delay: 0.6 }}
          >
            ライター・インタビュアーのもとおかさよが、出会った場所や人々、そこで生まれた言葉を綴る物語のアーカイブ
          </motion.p>
        </motion.div>
      </div>

      {/* Scroll Indicator */}
      <motion.button
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center space-y-2 text-primary hover:text-primary-hover transition-colors duration-200 group"
        onClick={scrollToContent}
        aria-label="Scroll to content"
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{
          delay: 0.8,
          repeat: Infinity,
          repeatType: 'reverse',
          duration: 1.5,
        }}
      >
        <span className="text-sm font-noto-sans-jp">Scroll</span>
        <svg
          className="w-6 h-6 animate-bounce"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </motion.button>
    </section>
  )
}
