
import { Link } from 'react-router-dom';
import { Card } from '@heroui/react';
import { motion, type Variants } from 'framer-motion';
import AppHeader from '../components/layout/AppHeader';
import GlassCard from '../components/shared/GlassCard';

const containerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 16,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.45,
      ease: 'easeOut',
    },
  },
};

function AnimatedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 overflow-hidden">
      <motion.div
        animate={{
          x: [0, 60, 0],
          y: [0, 40, 0],
          scale: [1, 1.12, 1],
        }}
        transition={{
          duration: 16,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -left-40 -top-40 h-[30rem] w-[30rem] rounded-full bg-indigo-600/10 blur-3xl"
      />

      <motion.div
        animate={{
          x: [0, -50, 0],
          y: [0, -35, 0],
          scale: [1, 1.15, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -bottom-48 -right-40 h-[32rem] w-[32rem] rounded-full bg-purple-600/10 blur-3xl"
      />
    </div>
  );
}

function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <AnimatedBackground />

      <div className="relative z-10 min-h-screen">
        <AppHeader appName="FlowDesk" />

        <main className="mx-auto flex min-h-[calc(100vh-64px)] max-w-7xl items-center justify-center px-6 py-10 lg:px-8">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="w-full max-w-lg"
          >
            <GlassCard>
              <Card.Content className="px-8 py-12 text-center">
                <motion.div
                  variants={itemVariants}
                  className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-500/10"
                >
                  <span className="text-2xl font-bold text-indigo-300">
                    F
                  </span>
                </motion.div>

                <motion.h1
                  variants={itemVariants}
                  className="mt-6 text-3xl font-bold tracking-tight"
                >
                  Welcome to FlowDesk
                </motion.h1>

                <motion.p
                  variants={itemVariants}
                  className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400"
                >
                  Manage your business operations from one simple and
                  powerful workspace.
                </motion.p>

                <motion.div
                  variants={itemVariants}
                  className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center"
                >
                  <Link
                    to="/login"
                    className="rounded-lg bg-indigo-600 px-5 py-2.5 text-sm font-medium text-white shadow-lg shadow-indigo-950/30 transition-all hover:bg-indigo-500"
                  >
                    Log in
                  </Link>

                  <Link
                    to="/register"
                    className="rounded-lg border border-white/10 bg-white/5 px-5 py-2.5 text-sm font-medium text-white transition-all hover:bg-white/10"
                  >
                    Create an account
                  </Link>
                </motion.div>
              </Card.Content>
            </GlassCard>
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export default LandingPage;

