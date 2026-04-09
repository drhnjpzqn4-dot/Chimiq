import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';

const SCENE_DURATIONS = {
  hook:     8000,
  danger:   10000,
  solution: 10000,
  people:   8000,
  close:    10000,
};

const CIRCLE_POSITIONS = [
  { x: '45vw', y: '40vh', scale: 2.2, opacity: 0.12 },
  { x: '8vw',  y: '15vh', scale: 1.0, opacity: 0.08 },
  { x: '72vw', y: '55vh', scale: 1.5, opacity: 0.10 },
  { x: '20vw', y: '70vh', scale: 0.9, opacity: 0.09 },
  { x: '60vw', y: '20vh', scale: 1.8, opacity: 0.07 },
];

const LINE_POSITIONS = {
  left:  ['8%',  '3%',  '60%', '30%', '12%'],
  width: ['40%', '92%', '22%', '55%', '35%'],
  top:   ['50%', '10%', '88%', '28%', '68%'],
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  const pos = CIRCLE_POSITIONS[currentScene] ?? CIRCLE_POSITIONS[0];

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d0d0d]">

      {/* Persistent ambient blob — transforms across scenes */}
      <motion.div
        className="absolute rounded-full blur-3xl pointer-events-none"
        style={{ background: 'radial-gradient(circle, #7BAF7A, transparent)', width: '45vw', height: '45vw' }}
        animate={{ x: pos.x, y: pos.y, scale: pos.scale, opacity: pos.opacity }}
        transition={{ duration: 1.8, ease: [0.16, 1, 0.3, 1] }}
      />

      {/* Persistent accent line */}
      <motion.div
        className="absolute h-[1px] bg-[#7BAF7A] pointer-events-none"
        animate={{
          left: LINE_POSITIONS.left[currentScene],
          width: LINE_POSITIONS.width[currentScene],
          top: LINE_POSITIONS.top[currentScene],
          opacity: currentScene >= 3 ? 0.25 : 0.4,
        }}
        transition={{ duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Scene-specific foreground */}
      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="danger" />}
        {currentScene === 2 && <Scene3 key="solution" />}
        {currentScene === 3 && <Scene4 key="people" />}
        {currentScene === 4 && <Scene5 key="close" />}
      </AnimatePresence>
    </div>
  );
}
