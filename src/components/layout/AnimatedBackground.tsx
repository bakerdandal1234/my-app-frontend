import { motion } from 'framer-motion';

export interface AnimatedBackgroundBlob {
  className: string;
  x: [number, number, number];
  y: [number, number, number];
  scale: [number, number, number];
  duration: number;
}

export interface AnimatedBackgroundPulseBlob {
  className: string;
  opacity: [number, number, number];
  scale: [number, number, number];
  duration: number;
}

interface AnimatedBackgroundProps {
  /** Positioning wrapper around the blobs. Defaults to the original auth-form pages' wrapper. */
  wrapperClassName?: string;
  /** The blurred orbs themselves. Defaults to the original auth-form pages' two-orb pair. */
  blobs?: AnimatedBackgroundBlob[];
  /**
   * An optional third, centered orb that only pulses opacity/scale in
   * place (no drift). Used by a handful of status pages (OAuth callback,
   * email verification) on top of the usual two drifting orbs.
   */
  pulseBlob?: AnimatedBackgroundPulseBlob;
}

const DEFAULT_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 -z-10 overflow-hidden';

const DEFAULT_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 60, 0],
    y: [0, 40, 0],
    scale: [1, 1.2, 1],
    duration: 12,
    className:
      'absolute -left-24 -top-24 h-96 w-96 rounded-full bg-indigo-600/25 blur-3xl',
  },
  {
    x: [0, -50, 0],
    y: [0, 60, 0],
    scale: [1, 1.25, 1],
    duration: 15,
    className:
      'absolute -bottom-24 -right-24 h-96 w-96 rounded-full bg-purple-600/20 blur-3xl',
  },
];

/**
 * Shared decorative background for every FlowDesk-themed page — large
 * blurred, slowly-animating orbs behind the content. Every page used to
 * carry its own hand-copied version of this effect with slightly different
 * numbers; this component takes those numbers as props (falling back to
 * the original auth-form pages' values) so the animation logic itself
 * lives in exactly one place instead of drifting apart per page.
 */
function AnimatedBackground({
  wrapperClassName = DEFAULT_WRAPPER_CLASSNAME,
  blobs = DEFAULT_BLOBS,
  pulseBlob,
}: AnimatedBackgroundProps) {
  return (
    <div className={wrapperClassName}>
      {blobs.map((blob, index) => (
        <motion.div
          key={index}
          animate={{
            x: blob.x,
            y: blob.y,
            scale: blob.scale,
          }}
          transition={{
            duration: blob.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={blob.className}
        />
      ))}

      {pulseBlob && (
        <motion.div
          animate={{
            opacity: pulseBlob.opacity,
            scale: pulseBlob.scale,
          }}
          transition={{
            duration: pulseBlob.duration,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
          className={pulseBlob.className}
        />
      )}
    </div>
  );
}

export default AnimatedBackground;
