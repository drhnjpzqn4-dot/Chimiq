import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d] overflow-hidden" {...sceneTransitions.zoomThrough}>
      
      {/* Background leaves, very subtle */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
        className="absolute inset-0 w-full h-full object-cover opacity-10 mix-blend-overlay"
        animate={{ scale: [1, 1.05] }}
        transition={{ duration: 5, ease: 'linear' }}
      />

      <div className="relative z-10 flex flex-col items-center justify-center w-full">
        
        {/* Mockup animation (using abstract shapes to represent it for now) */}
        <motion.div 
          className="relative w-[300px] h-[600px] border-[8px] border-[#333] rounded-[3rem] bg-[#111] overflow-hidden drop-shadow-2xl mb-12"
          initial={{ opacity: 0, y: 100 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 100 }}
          transition={{ type: 'spring', stiffness: 150, damping: 20 }}
        >
          {/* Scanner line */}
          <motion.div 
            className="absolute left-0 right-0 h-1 bg-[#7BAF7A] shadow-[0_0_20px_#7BAF7A]"
            animate={{ top: ['10%', '90%', '10%'] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <motion.h2 
              className="text-[#F5F0EB] font-display text-4xl"
              initial={{ opacity: 0 }}
              animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
              transition={{ delay: 0.5 }}
            >
              SkinScreen
            </motion.h2>
          </div>
        </motion.div>

        <div className="flex gap-8 text-[#7BAF7A] font-mono text-2xl uppercase tracking-widest">
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            Scan.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            Detect.
          </motion.span>
          <motion.span
            initial={{ opacity: 0, y: 10 }}
            animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
            transition={{ duration: 0.5 }}
          >
            Protect.
          </motion.span>
        </div>

      </div>
    </motion.div>
  );
}
