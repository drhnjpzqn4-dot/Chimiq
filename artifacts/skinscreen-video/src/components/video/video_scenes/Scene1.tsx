import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const INGREDIENTS = [
  'retinol', 'niacinamide', 'glycolic acid', 'vitamin c', 'aha', 'bha',
  'salicylic acid', 'lactic acid', 'hyaluronic acid', 'benzoyl peroxide',
  'tretinoin', 'copper peptides', 'alpha arbutin', 'kojic acid', 'resveratrol',
  'azelaic acid', 'ceramides', 'squalane', 'ferulic acid', 'tranexamic acid',
  'mandelic acid', 'phytic acid', 'malic acid', 'citric acid', 'ascorbic acid',
  'tocopherol', 'panthenol', 'allantoin', 'centella', 'bakuchiol',
];

function ScrollColumn({ items, duration, reverse }: { items: string[]; duration: number; reverse?: boolean }) {
  const doubled = [...items, ...items];
  return (
    <motion.div
      className="flex flex-col gap-3"
      animate={{ y: reverse ? ['-50%', '0%'] : ['0%', '-50%'] }}
      transition={{ duration, repeat: Infinity, ease: 'linear' }}
    >
      {doubled.map((item, i) => (
        <div
          key={i}
          className="text-[0.6vw] uppercase tracking-[0.3em] whitespace-nowrap"
          style={{
            color: i % 7 === 0 ? '#7BAF7A' : '#F5F0EB',
            opacity: i % 3 === 0 ? 0.55 : 0.12,
            fontFamily: 'var(--font-body)',
          }}
        >
          {item}
        </div>
      ))}
    </motion.div>
  );
}

export function Scene1() {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 300),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 6800),
    ];
    return () => timers.forEach(t => clearTimeout(t));
  }, []);

  const col1 = INGREDIENTS.slice(0, 10);
  const col2 = INGREDIENTS.slice(5, 15);
  const col3 = INGREDIENTS.slice(10, 20);
  const col4 = INGREDIENTS.slice(15, 25);
  const col5 = INGREDIENTS.slice(8, 18);

  return (
    <motion.div
      className="absolute inset-0 overflow-hidden"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.04, filter: 'blur(12px)' }}
      transition={{ duration: 0.9, ease: 'circOut' }}
    >
      <div className="absolute inset-0 bg-[#0d0d0d]" />

      <div className="absolute inset-0 flex gap-[2.5vw] px-[3vw] overflow-hidden">
        <ScrollColumn items={col1} duration={18} />
        <ScrollColumn items={col2} duration={22} reverse />
        <ScrollColumn items={col3} duration={15} />
        <ScrollColumn items={col4} duration={25} reverse />
        <ScrollColumn items={col5} duration={20} />
        <ScrollColumn items={[...col1].reverse()} duration={17} reverse />
        <ScrollColumn items={[...col2].reverse()} duration={23} />
        <ScrollColumn items={[...col3].reverse()} duration={19} reverse />
        <ScrollColumn items={col1.slice(2)} duration={21} />
      </div>

      <div
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse 55% 55% at 50% 50%, rgba(13,13,13,0.1) 0%, rgba(13,13,13,0.82) 65%, #0d0d0d 100%)',
        }}
      />

      {[...Array(7)].map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          style={{
            width: `${3 + i * 2}px`,
            height: `${3 + i * 2}px`,
            background: '#7BAF7A',
            left: `${10 + i * 12}%`,
            top: `${15 + (i % 4) * 18}%`,
          }}
          animate={{ y: [0, -25, 0], opacity: [0.35, 0.65, 0.35] }}
          transition={{ duration: 3.5 + i * 0.6, repeat: Infinity, ease: 'easeInOut', delay: i * 0.45 }}
        />
      ))}

      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.div
          className="text-center"
          initial={{ opacity: 0 }}
          animate={phase >= 2 ? { opacity: 1 } : { opacity: 0 }}
        >
          <motion.div
            initial={{ scale: 0.25, opacity: 0 }}
            animate={phase >= 2 ? { scale: 1, opacity: 1 } : { scale: 0.25, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 20 }}
          >
            <span
              className="block font-black leading-none"
              style={{ fontFamily: 'var(--font-display)', fontSize: '17vw', color: '#F5F0EB', letterSpacing: '-0.04em' }}
            >
              400
            </span>
            <motion.div
              className="h-[2px] bg-[#7BAF7A] mx-auto"
              initial={{ width: 0 }}
              animate={phase >= 2 ? { width: '65%' } : { width: 0 }}
              transition={{ duration: 0.7, delay: 0.45, ease: [0.16, 1, 0.3, 1] }}
            />
          </motion.div>

          <motion.div
            className="mt-5"
            initial={{ opacity: 0, y: 14 }}
            animate={phase >= 2 ? { opacity: 1, y: 0 } : { opacity: 0, y: 14 }}
            transition={{ duration: 0.5, delay: 0.55 }}
          >
            <span
              className="uppercase tracking-[0.35em] text-[1.1vw]"
              style={{ color: '#7BAF7A', fontFamily: 'var(--font-body)', fontWeight: 400 }}
            >
              ingredients a day
            </span>
          </motion.div>
        </motion.div>

        <motion.p
          className="text-[1.25vw] text-center mt-10 leading-relaxed"
          style={{ color: '#F5F0EB', fontFamily: 'var(--font-body)', fontWeight: 300, maxWidth: '38vw' }}
          initial={{ opacity: 0, filter: 'blur(12px)' }}
          animate={phase >= 3 ? { opacity: 0.8, filter: 'blur(0px)' } : { opacity: 0, filter: 'blur(12px)' }}
          transition={{ duration: 0.9, ease: 'circOut' }}
        >
          Most people have no idea what's in them.
        </motion.p>
      </div>

      <motion.div
        className="absolute inset-0 bg-[#0d0d0d] pointer-events-none"
        initial={{ opacity: 0 }}
        animate={phase >= 4 ? { opacity: 1 } : { opacity: 0 }}
        transition={{ duration: 1.0, ease: 'easeIn' }}
      />
    </motion.div>
  );
}
