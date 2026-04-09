import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

export function Scene2() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 500),
      setTimeout(() => setPhase(2), 2500),
      setTimeout(() => setPhase(3), 3800),
      setTimeout(() => setPhase(4), 5200),
      setTimeout(() => setPhase(5), 8500),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const angle1 = phase >= 2 ? -120 : 0;
  const angle2 = phase >= 2 ? 60 : 180;
  const radius = phase >= 3 ? '8vw' : '16vw';

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ clipPath: 'circle(0% at 50% 50%)', opacity: 0 }}
      transition={{ duration: 1.0, ease: [0.4, 0, 0.2, 1] }}
    >
      <div className="absolute inset-0 bg-[#0d0d0d]" />

      {/* Red collision flash */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 80% 60% at 50% 50%, #C94538, transparent)' }}
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: [0, 0.7, 0] } : { opacity: 0 }}
        transition={{ duration: 0.5, times: [0, 0.3, 1] }}
      />

      {/* Background tension gradient */}
      <motion.div
        className="absolute inset-0"
        style={{ background: 'radial-gradient(ellipse 70% 70% at 50% 50%, rgba(201,69,56,0.08) 0%, transparent 70%)' }}
        animate={phase >= 2 ? { opacity: [0.5, 1, 0.5] } : { opacity: 0 }}
        transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
      />

      {/* Orbital ring */}
      <motion.div
        className="absolute rounded-full border border-[#F5F0EB]/10"
        style={{
          width: '34vw',
          height: '34vw',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0.3 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.3 }}
        transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Center — collision point */}
      <motion.div
        className="absolute rounded-full"
        style={{
          width: '6px',
          height: '6px',
          background: '#C94538',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
        }}
        initial={{ opacity: 0, scale: 0 }}
        animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
      />

      {/* RETINOL label — orbiting */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '50%' }}
        animate={{
          x: `calc(${radius} * ${Math.cos((angle1 * Math.PI) / 180)} - 50%)`,
          y: `calc(${radius} * ${Math.sin((angle1 * Math.PI) / 180)} - 50%)`,
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        initial={{ x: 'calc(16vw * 1 - 50%)', y: 'calc(-50%)' }}
      >
        <motion.div
          className="px-4 py-2 border"
          style={{
            borderColor: phase >= 3 ? '#C94538' : '#F5F0EB',
            background: 'rgba(13,13,13,0.8)',
            transition: 'border-color 0.3s',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.3 }}
        >
          <span
            className="text-[1.4vw] font-black tracking-[0.3em] uppercase"
            style={{ fontFamily: 'var(--font-body)', color: '#F5F0EB', fontWeight: 700 }}
          >
            RETINOL
          </span>
        </motion.div>
      </motion.div>

      {/* GLYCOLIC ACID label — orbiting */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '50%' }}
        animate={{
          x: `calc(${radius} * ${Math.cos((angle2 * Math.PI) / 180)} - 50%)`,
          y: `calc(${radius} * ${Math.sin((angle2 * Math.PI) / 180)} - 50%)`,
        }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
        initial={{ x: 'calc(-16vw - 50%)', y: 'calc(-50%)' }}
      >
        <motion.div
          className="px-4 py-2 border"
          style={{
            borderColor: phase >= 3 ? '#C94538' : '#F5F0EB',
            background: 'rgba(13,13,13,0.8)',
            transition: 'border-color 0.3s',
          }}
          initial={{ opacity: 0, scale: 0 }}
          animate={phase >= 1 ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 20, delay: 0.5 }}
        >
          <span
            className="text-[1.1vw] font-black tracking-[0.25em] uppercase"
            style={{ fontFamily: 'var(--font-body)', color: '#F5F0EB', fontWeight: 700 }}
          >
            GLYCOLIC ACID
          </span>
        </motion.div>
      </motion.div>

      {/* SVG Warning icon — traces in on collision */}
      <motion.div
        className="absolute"
        style={{ left: '50%', top: '62%', transform: 'translateX(-50%)' }}
        initial={{ opacity: 0 }}
        animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 0.4 }}
      >
        <svg width="48" height="44" viewBox="0 0 48 44" fill="none">
          <motion.path
            d="M24 4L44 40H4L24 4Z"
            stroke="#C94538"
            strokeWidth="2.5"
            strokeLinejoin="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
          />
          <motion.line
            x1="24" y1="18" x2="24" y2="28"
            stroke="#C94538"
            strokeWidth="2.5"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={phase >= 3 ? { pathLength: 1 } : { pathLength: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut', delay: 0.85 }}
          />
          <motion.circle
            cx="24" cy="33" r="1.5"
            fill="#C94538"
            initial={{ opacity: 0 }}
            animate={phase >= 3 ? { opacity: 1 } : { opacity: 0 }}
            transition={{ duration: 0.2, delay: 1.1 }}
          />
        </svg>
      </motion.div>

      {/* Sub text */}
      <motion.div
        className="absolute bottom-[18%] left-0 right-0 text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={phase >= 4 ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
        transition={{ duration: 0.7, ease: 'circOut' }}
      >
        <p
          className="text-[1.2vw] leading-relaxed"
          style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', fontWeight: 300, opacity: 0.85 }}
        >
          Some combinations damage your skin barrier.
        </p>
      </motion.div>

      {/* Exit */}
      <motion.div
        className="absolute inset-0 bg-[#0d0d0d] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 5 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.2, ease: 'easeIn' }}
      />
    </motion.div>
  );
}
