import { motion, type Variants } from 'framer-motion';
import { Card } from '@heroui/react';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
} from '../components/layout/AnimatedBackground';
import GlassCard from '../components/shared/GlassCard';
import { useAuth } from '../auth/AuthContext';
import StatusLink from '../components/shared/StatusLink';
const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

const numberVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.8,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: 'easeOut',
    },
  },
};

const NOT_FOUND_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const NOT_FOUND_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 50, 0],
    y: [0, 35, 0],
    scale: [1, 1.15, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -40, 0],
    y: [0, -30, 0],
    scale: [1, 1.1, 1],
    duration: 16,
    className:
      'absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

function NotFoundPage() {
  const { user } = useAuth();
  console.log(user)
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 text-white">
      <AnimatedBackground
        wrapperClassName={NOT_FOUND_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={NOT_FOUND_BACKGROUND_BLOBS}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard>
          <Card.Content className="px-6 py-10 text-center">
            <motion.div
              variants={numberVariants}
              className="select-none text-8xl font-black tracking-tight text-white/10"
            >
              404
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="-mt-6"
            >
              <h1 className="text-2xl font-semibold text-white">
                Page not found
              </h1>

              <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-400">
                The page you&apos;re looking for doesn&apos;t exist or may have
                been moved.
              </p>
            </motion.div>

            <motion.div
              variants={itemVariants}
              className="mt-7"
            >
              <StatusLink
                to='/home'>
                Back to home
              </StatusLink>

            </motion.div>
          </Card.Content>
        </GlassCard>
      </motion.div>
    </div>
  );
}

export default NotFoundPage;