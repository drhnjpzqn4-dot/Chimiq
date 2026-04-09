import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene6() {
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
    <motion.div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0d0d0d] overflow-hidden" {...sceneTransitions.clipCircle}>
      
      {/* Sage green glow behind */}
      <motion.div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[#7BAF7A] opacity-0 blur-[120px]"
        animate={phase >= 1 ? { opacity: 0.15 } : { opacity: 0 }}
        transition={{ duration: 2 }}
      />

      <div className="relative z-10 flex flex-col items-center gap-12">
        <motion.img 
          src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
          className="h-16 w-auto object-contain"
          initial={{ opacity: 0, y: -20 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: -20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        />

        <motion.h1 
          className="text-[6vw] font-display text-[#F5F0EB]"
          initial={{ opacity: 0, scale: 0.9 }}
          animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 200, damping: 20 }}
        >
          SkinScreen
        </motion.h1>

        <motion.p 
          className="text-[2vw] font-mono text-[#7BAF7A] uppercase tracking-widest"
          initial={{ opacity: 0, y: 20 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          Know your ingredients.
        </motion.p>
      </div>

    </motion.div>
  );
}
