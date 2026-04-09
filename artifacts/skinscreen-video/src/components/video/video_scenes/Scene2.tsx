import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d] overflow-hidden" {...sceneTransitions.wipe}>
      
      {/* Subtle background noise */}
      <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at center, #1a1a1a 0%, #0d0d0d 100%)' }} />

      <div className="relative z-10 w-full flex flex-col items-center justify-center gap-12">
        <div className="flex items-center gap-16">
          <motion.img
            src={`${import.meta.env.BASE_URL}images/the-ordinary-retinol.webp`}
            className="w-48 h-auto object-contain drop-shadow-2xl"
            initial={{ opacity: 0, x: -50, rotate: -10 }}
            animate={phase >= 1 ? { opacity: 1, x: 0, rotate: -5 } : { opacity: 0, x: -50, rotate: -10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
          />

          <motion.div 
            className="text-[4vw] font-display text-[#C94538] font-bold"
            initial={{ opacity: 0, scale: 0.5 }}
            animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
          >
            +
          </motion.div>

          <motion.img
            src={`${import.meta.env.BASE_URL}images/the-ordinary-aha-bha.webp`}
            className="w-48 h-auto object-contain drop-shadow-2xl"
            initial={{ opacity: 0, x: 50, rotate: 10 }}
            animate={phase >= 1 ? { opacity: 1, x: 0, rotate: 5 } : { opacity: 0, x: 50, rotate: 10 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20, delay: 0.1 }}
          />
        </div>

        <motion.div 
          className="flex flex-col items-center gap-4"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <div className="bg-[#C94538]/20 border border-[#C94538] text-[#C94538] px-8 py-3 rounded-full text-xl font-mono uppercase tracking-widest flex items-center gap-3">
            <span className="w-3 h-3 rounded-full bg-[#C94538] animate-pulse" />
            Severe Conflict Detected
          </div>
          <p className="text-[#a1a1aa] text-2xl font-body">The skincare world is complex, overwhelming.</p>
        </motion.div>
      </div>

    </motion.div>
  );
}
