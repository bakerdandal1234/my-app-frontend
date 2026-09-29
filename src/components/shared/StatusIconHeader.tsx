import type { ReactNode } from 'react';
import { motion } from 'framer-motion';
import { Card } from '@heroui/react';
import { statusItemVariants, statusIconVariants } from '../../lib/motion-variants';

/**
 * Presentational status header with an animated icon, title and description.
 */
interface StatusIconHeaderProps {
  /** The icon itself, already sized/colored (an <svg> or a <Spinner />). */
  icon: ReactNode;
  /** Border/background utility classes for the circle behind the icon, e.g. "border-emerald-400/20 bg-emerald-500/10". */
  circleClassName: string;
  title: string;
  description: ReactNode;
}

function StatusIconHeader({
  icon,
  circleClassName,
  title,
  description,
}: StatusIconHeaderProps) {
  return (
    <Card.Header className="flex flex-col items-center gap-4 px-6 pt-8 text-center">
      <motion.div
        variants={statusIconVariants}
        className={`flex h-16 w-16 items-center justify-center rounded-full border ${circleClassName}`}
      >
        {icon}
      </motion.div>

      <motion.div variants={statusItemVariants}>
        <Card.Title className="text-2xl font-semibold text-white">
          {title}
        </Card.Title>

        <p className="mt-2 text-sm text-slate-400">{description}</p>
      </motion.div>
    </Card.Header>
  );
}

export default StatusIconHeader;
