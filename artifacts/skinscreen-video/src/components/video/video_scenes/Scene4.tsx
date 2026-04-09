import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const STAT_LINES = [
  { value: '62%', label: 'of Gen Z discovers skincare on TikTok' },
  { value: '$189B', label: 'global skincare market' },
];

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 5000),
      setTimeout(() => setPhase(5), 7000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -30 }}
      transition={{ duration: 0.8, ease: 'circOut' }}
    >
      <div className="absolute inset-0 bg-[#0d0d0d]" />

      {/* Subtle grid lines — editorial layout */}
      <motion.div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(90deg, #F5F0EB 0px, #F5F0EB 1px, transparent 1px, transparent 12vw)',
        }}
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 0.04 } : { opacity: 0 }}
        transition={{ duration: 1.2 }}
      />

      {/* Accent vertical line — left */}
      <motion.div
        className="absolute left-[12%] top-0 bottom-0 w-[2px] bg-[#7BAF7A]"
        initial={{ scaleY: 0 }}
        animate={phase >= 1 ? { scaleY: 1 } : { scaleY: 0 }}
        style={{ originY: 0 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Main stats block — asymmetric left alignment */}
      <div className="absolute left-[16%] top-[18%]">
        {STAT_LINES.map((stat, i) => (
          <motion.div
            key={i}
            className="mb-8"
            initial={{ opacity: 0, x: -30 }}
            animate={phase >= i + 1 ? { opacity: 1, x: 0 } : { opacity: 0, x: -30 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24, delay: i * 0.15 }}
          >
            <div
              className="font-black leading-none"
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '9vw',
                color: i === 0 ? '#7BAF7A' : '#F5F0EB',
                letterSpacing: '-0.04em',
              }}
            >
              {stat.value}
            </div>
            <div
              className="mt-2 text-[1.1vw] leading-snug max-w-[35vw]"
              style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', fontWeight: 300, opacity: 0.7 }}
            >
              {stat.label}
            </div>
          </motion.div>
        ))}

        {/* "until now" line */}
        <motion.div
          className="mt-6"
          initial={{ opacity: 0, x: -20 }}
          animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: -20 }}
          transition={{ duration: 0.7, ease: 'circOut' }}
        >
          <div
            className="text-[1.0vw] uppercase tracking-[0.35em]"
            style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', fontWeight: 400, opacity: 0.5 }}
          >
            No tool checked combinations —
          </div>
          <div
            className="text-[2.8vw] font-bold italic mt-1"
            style={{ color: '#C09070', fontFamily: 'var(--font-display)', letterSpacing: '-0.01em' }}
          >
            until now.
          </div>
        </motion.div>
      </div>

      {/* Ingredient card morphing to safe result — right side */}
      <motion.div
        className="absolute right-[10%]"
        style={{ top: '50%', transform: 'translateY(-50%)' }}
        initial={{ opacity: 0, scale: 0.8, x: 40 }}
        animate={phase >= 2 ? { opacity: 1, scale: 1, x: 0 } : { opacity: 0, scale: 0.8, x: 40 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22 }}
      >
        <motion.div
          className="border rounded-lg p-6"
          style={{
            width: '22vw',
            background: 'rgba(13,13,13,0.7)',
            backdropFilter: 'blur(10px)',
          }}
          animate={phase >= 3 ? { borderColor: '#7BAF7A' } : { borderColor: 'rgba(245,240,235,0.2)' }}
          transition={{ duration: 0.6 }}
        >
          <div
            className="text-[0.75vw] uppercase tracking-[0.3em] mb-4"
            style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', opacity: 0.5 }}
          >
            Your Routine
          </div>

          {['Retinol 0.5%', 'Niacinamide 10%', 'Vitamin C 15%', 'Glycolic Acid 7%'].map((ingredient, i) => (
            <motion.div
              key={ingredient}
              className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
              initial={{ opacity: 0 }}
              animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.2 + i * 0.1 }}
            >
              <motion.div
                className="w-2 h-2 rounded-full flex-shrink-0"
                animate={
                  phase >= 3
                    ? { backgroundColor: i === 2 ? '#C94538' : '#7BAF7A' }
                    : { backgroundColor: 'rgba(245,240,235,0.3)' }
                }
                transition={{ duration: 0.5, delay: i * 0.05 }}
              />
              <span
                className="text-[0.8vw]"
                style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', fontWeight: 300 }}
              >
                {ingredient}
              </span>
            </motion.div>
          ))}

          <motion.div
            className="mt-4 py-2 text-center rounded"
            style={{ background: '#7BAF7A' }}
            initial={{ opacity: 0, scaleX: 0 }}
            animate={phase >= 4 ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          >
            <span
              className="text-[0.8vw] font-semibold uppercase tracking-[0.2em]"
              style={{ color: '#0d0d0d', fontFamily: 'var(--font-body)' }}
            >
              1 Conflict Found
            </span>
          </motion.div>
        </motion.div>
      </motion.div>

      {/* Exit */}
      <motion.div
        className="absolute inset-0 bg-[#0d0d0d] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.0, ease: 'easeIn' }}
      />
    </motion.div>
  );
}
