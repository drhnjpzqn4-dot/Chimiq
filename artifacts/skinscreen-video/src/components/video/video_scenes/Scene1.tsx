import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions, elementAnimations } from '@/lib/video';

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2000),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-black overflow-hidden" {...sceneTransitions.fadeBlur}>
      
      {/* Background Image: Close-up of tropical leaves fading in */}
      <motion.img 
        src={`${import.meta.env.BASE_URL}images/hero-dark.png`}
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0, scale: 1.1 }}
        animate={{ opacity: 0.6, scale: 1 }}
        transition={{ duration: 3, ease: 'easeOut' }}
      />

      <div className="relative z-10 text-center px-12 max-w-4xl">
        <motion.h1 
          className="text-[6vw] leading-tight font-display text-[#F5F0EB]"
          initial={{ opacity: 0, y: 30 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
          transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
        >
          You don't know what's on your skin.
        </motion.h1>
      </div>

    </motion.div>
  );
}
