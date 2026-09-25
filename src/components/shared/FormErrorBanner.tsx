import { AnimatePresence, motion } from 'framer-motion';
import { errorVariants } from '../../lib/motion-variants';

interface FormErrorBannerProps {
  message: string | null;
  /** Distinguishes this banner's AnimatePresence key when a page shows more than one at once. */
  bannerKey?: string;
}

/**
 * The animated "{apiError}" banner shown above a form after a failed API
 * call. Copy-pasted across every auth and settings form with a slight
 * className drift (some used "rounded", others "rounded-lg"); this
 * standardizes on "rounded-lg" to match the majority.
 */
function FormErrorBanner({
  message,
  bannerKey = 'form-error',
}: FormErrorBannerProps) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.p
          key={bannerKey}
          variants={errorVariants}
          initial="hidden"
          animate="visible"
          exit="hidden"
          className="rounded-lg border border-red-500/30 bg-red-500/20 px-3 py-2 text-sm text-red-200"
          role="alert"
        >
          {message}
        </motion.p>
      )}
    </AnimatePresence>
  );
}

export default FormErrorBanner;
