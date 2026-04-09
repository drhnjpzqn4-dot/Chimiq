import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1400),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d] overflow-hidden" {...sceneTransitions.perspectiveFlip}>
      
      {/* Background Images - abstract youthful vibe */}
      <div className="absolute inset-0 flex">
        <motion.div 
          className="w-1/2 h-full bg-[#1a1a1a]"
          initial={{ x: '-100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 1, ease: 'circOut' }}
        />
        <motion.div 
          className="w-1/2 h-full bg-[#C09070]/10"
          initial={{ x: '100%' }}
          animate={{ x: 0 }}
          transition={{ duration: 1, ease: 'circOut' }}
        />
      </div>

      <div className="relative z-10 text-center px-12">
        <motion.h2 
          className="text-[5vw] font-display font-medium text-[#F5F0EB] leading-tight"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <span className="italic text-[#7BAF7A]">Built</span> by chemistry students.<br/>
          <span className="italic text-[#C09070]">For</span> skincare lovers.
        </motion.h2>
        
        <motion.div
           className="mt-8 flex justify-center gap-4"
           initial={{ opacity: 0, scale: 0.8 }}
           animate={phase >= 2 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
           transition={{ duration: 0.5 }}
        >
          {/* Abstract avatars */}
          <div className="w-12 h-12 rounded-full bg-[#333] border-2 border-[#0d0d0d] -mr-4" />
          <div className="w-12 h-12 rounded-full bg-[#444] border-2 border-[#0d0d0d] -mr-4" />
          <div className="w-12 h-12 rounded-full bg-[#555] border-2 border-[#0d0d0d] -mr-4" />
          <div className="w-12 h-12 rounded-full flex items-center justify-center bg-[#7BAF7A] border-2 border-[#0d0d0d] text-black font-bold text-sm">+10k</div>
        </motion.div>
      </div>

    </motion.div>
  );
}
