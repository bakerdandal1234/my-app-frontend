import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { itemVariants } from '../../lib/motion-variants';

interface BackLinkProps {
  to: string;
  children: ReactNode;
  fullWidth?: boolean;
}

function BackLink({
  to,
  children,
  fullWidth = false,
}: BackLinkProps) {
  return (
    <motion.div
      variants={itemVariants}
      className={fullWidth ? 'w-full' : 'inline-block'}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Link
        to={to}
        className={`block rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-center text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 ${
          fullWidth ? 'w-full' : ''
        }`}
      >
        {children}
      </Link>
    </motion.div>
  );
}

export default BackLink;