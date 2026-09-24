import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
export interface HeaderNavigationItem {
  label: string;
  href: string;
}

interface AppHeaderProps {
  appName: string;
  navigation?: HeaderNavigationItem[];
  actions?: ReactNode;
}


export default function AppHeader({
  appName,
  navigation = [],
  actions,
}: AppHeaderProps) {
  return (
    <header className="relative z-40 border-b border-white/10 bg-slate-950/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4 lg:px-8">
        <div className="flex items-center gap-8">
          <Link
            to="/"
            className="text-xl font-bold tracking-tight text-white transition-colors hover:text-indigo-300"
          >
            {appName}
          </Link>



          {navigation.length > 0 && (
            <nav className="hidden items-center gap-2 md:flex">
              {navigation.map((item) => {
                

                return (
                  <Link
                    key={`${item.label}-${item.href}`}
                    to={item.href}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          )}
        </div>

        {actions && (
          <motion.div
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.2 }}
            className="flex items-center gap-4"
          >
            {actions}
          </motion.div>
        )}
      </div>
    </header>
  );
}