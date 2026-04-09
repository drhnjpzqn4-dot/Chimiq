import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const WORDS = [
  { text: 'Scan.', color: '#F5F0EB' },
  { text: 'Analyse.', color: '#F5F0EB' },
  { text: 'Protect.', color: '#7BAF7A' },
];

export function Scene3() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 400),
      setTimeout(() => setPhase(2), 1200),
      setTimeout(() => setPhase(3), 3500),
      setTimeout(() => setPhase(4), 5500),
      setTimeout(() => setPhase(5), 8800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0, clipPath: 'circle(0% at 50% 50%)' }}
      animate={{ opacity: 1, clipPath: 'circle(100% at 50% 50%)' }}
      exit={{ opacity: 0, scale: 1.06 }}
      transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="absolute inset-0 bg-[#0d0d0d]" />

      {/* Red tension lingers then fades */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(201,69,56,0.15) 0%, transparent 70%)' }}
        initial={{ opacity: 1 }}
        animate={phase >= 2 ? { opacity: 0 } : { opacity: 1 }}
        transition={{ duration: 1.4 }}
      />

      {/* Sage green resolves */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 60% 50% at 50% 50%, rgba(123,175,122,0.12) 0%, transparent 70%)' }}
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.5 }}
      />

      {/* Phone outline SVG */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '50%', transform: 'translate(-50%, -50%)', marginLeft: '-9vw' }}
        initial={{ opacity: 0, scale: 0.6, y: 30 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1, y: 0 } : { opacity: 0, scale: 0.6, y: 30 }}
        transition={{ type: 'spring', stiffness: 200, damping: 22, delay: 0.2 }}
      >
        <svg width="140" height="240" viewBox="0 0 140 240" fill="none">
          <motion.rect
            x="6" y="6" width="128" height="228" rx="16"
            stroke="#7BAF7A" strokeWidth="2" fill="rgba(13,13,13,0.7)"
            initial={{ pathLength: 0 }}
            animate={phase >= 1 ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1], delay: 0.3 }}
          />
          <motion.circle
            cx="70" cy="20" r="4" fill="#7BAF7A"
            initial={{ opacity: 0 }}
            animate={phase >= 1 ? { opacity: 0.7 } : { opacity: 0 }}
            transition={{ duration: 0.3, delay: 1.0 }}
          />
          {[0, 1, 2, 3, 4].map((i) => (
            <motion.rect
              key={i}
              x="22" y={55 + i * 28}
              width={i % 2 === 0 ? 80 : 55}
              height="6" rx="3"
              fill={i === 2 ? '#C94538' : '#7BAF7A'}
              initial={{ scaleX: 0, opacity: 0 }}
              style={{ originX: '0px' }}
              animate={phase >= 2 ? { scaleX: 1, opacity: i === 2 ? 0.8 : 0.5 } : { scaleX: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1], delay: 0.4 + i * 0.12 }}
            />
          ))}
          <motion.rect
            x="20" y="195" width="100" height="22" rx="4" fill="#7BAF7A"
            initial={{ opacity: 0, scaleX: 0 }}
            style={{ originX: '0px' }}
            animate={phase >= 3 ? { opacity: 0.9, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
        </svg>
      </motion.div>

      {/* Words: right side staggered */}
      <div className="absolute" style={{ right: '8%', top: '50%', transform: 'translateY(-50%)' }}>
        {WORDS.map((word, i) => (
          <motion.div
            key={word.text}
            className="block text-right"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '4.8vw',
              fontWeight: 700,
              color: word.color,
              lineHeight: 1.15,
              letterSpacing: '-0.02em',
            }}
            initial={{ opacity: 0, x: 40 }}
            animate={phase >= 3 ? { opacity: 1, x: 0 } : { opacity: 0, x: 40 }}
            transition={{ type: 'spring', stiffness: 350, damping: 25, delay: i * 0.22 }}
          >
            {word.text}
          </motion.div>
        ))}
      </div>

      {/* ChimIQ molecule icon — corner */}
      <motion.div
        className="absolute bottom-[8%] right-[6%]"
        initial={{ opacity: 0, scale: 0 }}
        animate={phase >= 4 ? { opacity: 0.7, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
        >
          <img
            src={`${import.meta.env.BASE_URL}favicon.svg`}
            alt="ChimIQ"
            style={{
              width: '3.5vw',
              height: '3.5vw',
              filter: 'brightness(0) invert(1) sepia(1) saturate(3) hue-rotate(80deg)',
            }}
          />
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
