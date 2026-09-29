import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@heroui/react';
import { statusItemVariants } from '../../lib/motion-variants';

/**
 * Shared status-card footer with an animated navigation link.
 */
interface StatusFooterLinkProps {
  to: string;
  children: ReactNode;
}

function StatusLink({ to, children }: StatusFooterLinkProps) {
  return (
    <Card.Footer className="justify-center border-t border-white/10 px-6 py-5">
      <motion.div
        variants={statusItemVariants}
        whileHover={{ x: 3 }}
        transition={{ duration: 0.2 }}
      >
        <Link
          to={to}
          className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
        >
          {children}
        </Link>
      </motion.div>
    </Card.Footer>
  );
}

export default StatusLink;
