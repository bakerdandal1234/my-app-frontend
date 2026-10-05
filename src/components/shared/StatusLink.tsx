import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card } from '@heroui/react';
import { itemVariants } from '../../lib/motion-variants';

interface StatusLinkProps {
  to: string;
  children: ReactNode;
  action?: ReactNode;
  text?: string;
}

function StatusLink({ to, children, action, text }: StatusLinkProps) {
  return (
    <Card.Footer className="flex flex-col gap-3">
      {action != null && (
        <motion.div
          variants={itemVariants}
          className="w-full"
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          {action}
        </motion.div>
      )}

      <motion.p
        variants={itemVariants}
        className="text-center text-sm text-slate-400"
      >
        {text && <>{text}{' '}</>}
        <Link
          to={to}
          className="text-indigo-400 transition-colors hover:text-indigo-300 hover:underline"
        >
          {children}
        </Link>
      </motion.p>
    </Card.Footer>
  );
}

export default StatusLink;