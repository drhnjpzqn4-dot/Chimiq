import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene5() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2600),
      setTimeout(() => setPhase(4), 4200),
      setTimeout(() => setPhase(5), 5500),
      setTimeout(() => setPhase(6), 9200),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03 }}
      transition={{ duration: 1.2, ease: 'circOut' }}
    >
      {/* Full bleed hero background */}
      <motion.div
        className="absolute inset-0"
        initial={{ scale: 1.1 }}
        animate={phase >= 1 ? { scale: 1.0 } : { scale: 1.1 }}
        transition={{ duration: 2.5, ease: 'easeOut' }}
      >
        <img
          src={`${import.meta.env.BASE_URL}images/hero-bg.png`}
          alt="SkinScreen hero"
          className="w-full h-full object-cover"
        />
      </motion.div>

      {/* Dark overlay — matching landing page gradient */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, rgba(13,13,13,0.92) 0%, rgba(13,13,13,0.75) 50%, rgba(13,13,13,0.6) 100%)',
        }}
        initial={{ opacity: 0 }}
        animate={phase >= 1 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2 }}
      />

      {/* Sage green ambient glow */}
      <motion.div
        className="absolute"
        style={{
          bottom: '10%',
          right: '15%',
          width: '35vw',
          height: '35vw',
          background: 'radial-gradient(circle, rgba(123,175,122,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
        }}
        initial={{ opacity: 0 }}
        animate={phase >= 2 ? { opacity: [0.5, 0.9, 0.6] } : { opacity: 0 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">

        {/* ChimIQ molecule icon */}
        <motion.div
          className="mb-8"
          initial={{ opacity: 0, y: -20, scale: 0.7 }}
          animate={phase >= 1 ? { opacity: 0.9, y: 0, scale: 1 } : { opacity: 0, y: -20, scale: 0.7 }}
          transition={{ type: 'spring', stiffness: 200, damping: 22 }}
        >
          <motion.div
            animate={phase >= 2 ? { rotate: [0, 5, -5, 0] } : {}}
            transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
          >
            <img
              src={`${import.meta.env.BASE_URL}images/logo-chimiq-long.png`}
              alt="ChimIQ"
              style={{ height: '4vw', width: 'auto', opacity: 0.85 }}
            />
          </motion.div>
        </motion.div>

        {/* SkinScreen title */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.h1
            className="font-bold leading-none"
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: '10vw',
              color: '#F5F0EB',
              letterSpacing: '-0.03em',
            }}
            initial={{ y: 30, opacity: 0 }}
            animate={phase >= 2 ? { y: 0, opacity: 1 } : { y: 30, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
          >
            SkinScreen
          </motion.h1>

          {/* Accent line */}
          <motion.div
            className="h-[2px] bg-[#7BAF7A] mx-auto mt-4"
            initial={{ width: 0 }}
            animate={phase >= 2 ? { width: '60%' } : { width: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: [0.16, 1, 0.3, 1] }}
          />
        </motion.div>

        {/* Tagline */}
        <motion.p
          className="text-center mt-8 text-[1.6vw] italic"
          style={{
            color: '#F5F0EB',
            fontFamily: 'var(--font-display)',
            fontWeight: 400,
            letterSpacing: '0.01em',
            maxWidth: '50vw',
          }}
          initial={{ opacity: 0, y: 15, filter: 'blur(8px)' }}
          animate={phase >= 3 ? { opacity: 0.9, y: 0, filter: 'blur(0px)' } : { opacity: 0, y: 15, filter: 'blur(8px)' }}
          transition={{ duration: 0.9, ease: 'circOut' }}
        >
          Know what's really in your routine.
        </motion.p>

        {/* URL */}
        <motion.div
          className="mt-8"
          initial={{ opacity: 0, y: 10 }}
          animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
          transition={{ duration: 0.6, ease: 'circOut' }}
        >
          <span
            className="text-[1.0vw] uppercase tracking-[0.4em]"
            style={{ color: '#7BAF7A', fontFamily: 'var(--font-body)', fontWeight: 400 }}
          >
            chimiq.com
          </span>
        </motion.div>

        {/* Premium badge */}
        <motion.div
          className="mt-10 px-6 py-2 border border-[#7BAF7A]/40 rounded-full"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={phase >= 5 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
          transition={{ type: 'spring', stiffness: 250, damping: 20 }}
        >
          <span
            className="text-[0.85vw] uppercase tracking-[0.35em]"
            style={{ color: '#C09070', fontFamily: 'var(--font-body)', fontWeight: 400 }}
          >
            by ChimIQ
          </span>
        </motion.div>
      </div>

      {/* Exit */}
      <motion.div
        className="absolute inset-0 bg-[#0d0d0d] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 6 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.8, ease: 'easeIn' }}
      />
    </motion.div>
  );
}
