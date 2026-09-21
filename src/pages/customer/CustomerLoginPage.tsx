import { Navigate } from 'react-router-dom';
import { Button, Card } from '@heroui/react';
import { motion, useReducedMotion, type Variants } from 'framer-motion';
import { ArrowRight, ShoppingBag } from 'lucide-react';
import AnimatedBackground from '../../components/layout/AnimatedBackground';
import { startCustomerGoogleLogin } from '../../customer/api/customerClient';
import { useCustomerAuth } from '../../customer/CustomerAuthContext';
import GlassCard from '../../components/shared/GlassCard';
import { itemVariants,containerVariants } from '../../lib/motion-variants';


function GoogleIcon() {
  return (
    <svg
      className="h-5 w-5 shrink-0"
      viewBox="0 0 48 48"
      aria-hidden="true"
      focusable="false"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.6 1.2 9 3.6l6.7-6.7C35.6 2.6 30.2.5 24 .5 14.6.5 6.5 5.9 2.6 13.8l7.8 6.1C12.3 13.8 17.6 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v8.3h12.7c-.3 2.1-1.6 5.2-4.7 7.3l7.6 5.9c4.5-4.2 6.9-10.3 6.9-17.4z"
      />
      <path
        fill="#FBBC05"
        d="M10.4 28.1a14.6 14.6 0 0 1 0-9.3l-7.8-6.1a24 24 0 0 0 0 21.5l7.8-6.1z"
      />
      <path
        fill="#34A853"
        d="M24 47.5c6.2 0 11.4-2 15.2-5.6l-7.6-5.9c-2 1.4-4.7 2.4-7.6 2.4-6.4 0-11.7-4.3-13.6-10.3l-7.8 6.1C6.5 42.1 14.6 47.5 24 47.5z"
      />
    </svg>
  );
}



function CustomerLoginPage() {
  const { isAuthenticated, isLoading } = useCustomerAuth();
  const reduceMotion = useReducedMotion();

  if (isLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">
        <div role="status" className="flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-indigo-400 motion-reduce:animate-none"
          />
          <span className="text-sm">Loading your account…</span>
        </div>
      </main>
    );
  }

  if (isAuthenticated) {
    return <Navigate to="/customer/account" replace />;
  }

  return (
    <main className="relative isolate flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-12 text-white">
      
      <AnimatedBackground />

      <motion.div
        variants={containerVariants}
        initial={reduceMotion ? false : 'hidden'}
        animate="visible"
        className="relative z-10 w-full max-w-md"
      >
        <GlassCard className="mx-auto flex min-h-[calc(100vh-69px)] max-w-7xl items-center justify-center px-6 py-8 lg:px-8">
          <Card.Content className="px-8 py-12 text-center">
            <motion.div
              variants={itemVariants}
              className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-indigo-400/20 bg-indigo-400/10 text-indigo-300 shadow-[0_0_35px_rgba(129,140,248,0.35)]"
            >
              <ShoppingBag aria-hidden="true" className="h-7 w-7" strokeWidth={1.5} />
            </motion.div>

            <motion.h1
              variants={itemVariants}
              className="mt-6 text-3xl font-bold tracking-tight"
            >
              Your orders, one place.
            </motion.h1>

            <motion.p
              variants={itemVariants}
              className="mx-auto mt-3 max-w-md text-sm leading-6 text-slate-400"
            >
              Sign in with Google to view your orders and manage your
              account.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8">
              <motion.div
                whileHover={reduceMotion ? undefined : { y: -2 }}
                whileTap={reduceMotion ? undefined : { scale: 0.98 }}
              >
                <Button
                  type="button"
                  size="lg"
                  onPress={() => startCustomerGoogleLogin()}
                  className="flex min-h-12 w-full items-center justify-center gap-3 rounded-xl bg-gradient-to-b from-white to-slate-50 px-4 py-3 font-medium text-slate-900 shadow-sm transition-colors hover:from-slate-50 hover:to-slate-100 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-indigo-400"
                >
                  <GoogleIcon />
                  <span>Continue with Google</span>
                  <ArrowRight
                    aria-hidden="true"
                    className="h-4 w-4 shrink-0 text-slate-500"
                  />
                </Button>
              </motion.div>
            </motion.div>

            <motion.p
              variants={itemVariants}
              className="mt-4 text-xs leading-5 text-slate-400"
            >
              New here? Your account will be created when you sign in.
            </motion.p>

            <motion.div variants={itemVariants} className="mt-8">
              <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent" />

              <p className="mt-5 text-center text-xs text-slate-400">
                Staff accounts sign in separately.
              </p>
            </motion.div>
          </Card.Content>
        </GlassCard>
      </motion.div>
    </main>
  );
}

export default CustomerLoginPage;