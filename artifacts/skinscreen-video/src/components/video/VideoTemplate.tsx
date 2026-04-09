// Video Template - Main orchestrator
import { motion, AnimatePresence } from 'framer-motion';
import { useVideoPlayer } from '@/lib/video';
import { Scene1 } from './video_scenes/Scene1';
import { Scene2 } from './video_scenes/Scene2';
import { Scene3 } from './video_scenes/Scene3';
import { Scene4 } from './video_scenes/Scene4';
import { Scene5 } from './video_scenes/Scene5';
import { Scene6 } from './video_scenes/Scene6';

const SCENE_DURATIONS = { 
  hook: 3000, 
  problem: 4000, 
  product: 5000, 
  howItWorks: 4000, 
  social: 3000,
  closing: 4000
};

export default function VideoTemplate() {
  const { currentScene } = useVideoPlayer({ durations: SCENE_DURATIONS });

  return (
    <div className="relative w-full h-screen overflow-hidden bg-[#0d0d0d]">
      
      {/* Persistent background layers */}
      {/* These live outside AnimatePresence so they don't jump/reset on scene change */}
      
      <motion.div 
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }}
      />

      <AnimatePresence mode="popLayout">
        {currentScene === 0 && <Scene1 key="hook" />}
        {currentScene === 1 && <Scene2 key="problem" />}
        {currentScene === 2 && <Scene3 key="product" />}
        {currentScene === 3 && <Scene4 key="howItWorks" />}
        {currentScene === 4 && <Scene5 key="social" />}
        {currentScene === 5 && <Scene6 key="closing" />}
      </AnimatePresence>
    </div>
  );
}
