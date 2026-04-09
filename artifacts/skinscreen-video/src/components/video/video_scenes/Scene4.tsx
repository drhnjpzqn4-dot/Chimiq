import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';
import { sceneTransitions } from '@/lib/video';

export function Scene4() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 200),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 2200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div className="absolute inset-0 flex items-center justify-center bg-[#0d0d0d] overflow-hidden" {...sceneTransitions.splitHorizontal}>
      
      {/* Grid background for tech feel */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#333_1px,transparent_1px),linear-gradient(to_bottom,#333_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-20" />

      <div className="relative z-10 w-full max-w-5xl grid grid-cols-3 gap-8 px-12">
        
        {/* Step 1 */}
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 1 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-32 h-32 rounded-2xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[#F5F0EB]">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/><rect x="7" y="7" width="10" height="10" rx="1"/></svg>
          </div>
          <div className="text-center font-mono uppercase tracking-wider text-[#7BAF7A]">1. Scan Barcode</div>
        </motion.div>

        {/* Step 2 */}
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-32 h-32 rounded-2xl bg-[#1a1a1a] border border-[#333] flex items-center justify-center text-[#F5F0EB]">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          </div>
          <div className="text-center font-mono uppercase tracking-wider text-[#C09070]">2. AI Analyzes</div>
        </motion.div>

        {/* Step 3 */}
        <motion.div 
          className="flex flex-col items-center gap-6"
          initial={{ opacity: 0, y: 40 }}
          animate={phase >= 3 ? { opacity: 1, y: 0 } : { opacity: 0, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
        >
          <div className="w-32 h-32 rounded-2xl bg-[#C94538]/20 border border-[#C94538] flex items-center justify-center text-[#C94538]">
             <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
          </div>
          <div className="text-center font-mono uppercase tracking-wider text-[#C94538]">3. Conflict Detected</div>
        </motion.div>

      </div>

    </motion.div>
  );
}
