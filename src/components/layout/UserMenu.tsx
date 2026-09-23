import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@heroui/react';
import { AnimatePresence, motion } from 'framer-motion';
export interface HeaderUser {
  email?: string;
  firstName?: string;
  lastName?: string;
}

interface UserMenuProps {
  user: HeaderUser;
  onLogout: () => void | Promise<void>;
  isLoggingOut?: boolean;
  profileHref?: string;
  sessionsHref?: string;
  securityHref?: string;
  changePasswordHref?: string;
}
export default function UserMenu({
  user,
  onLogout,
  isLoggingOut = false,
  profileHref = '/profile',
  sessionsHref = '/sessions',
  securityHref = '/settings/2fa',
  changePasswordHref = '/settings/change-password',
}: UserMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const displayName =
    [user.firstName, user.lastName].filter(Boolean).join(' ') ||
    user.email?.split('@')[0] ||
    'User';

  const initial = displayName.charAt(0).toUpperCase();
console.log(user)
  
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, []);

  async function handleLogout() {
    setIsOpen(false);
    await onLogout();
  }

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((previous) => !previous)}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/10 text-sm font-semibold text-indigo-300 transition-all hover:border-indigo-400/30 hover:bg-white/15 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
      >
        {initial}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-3 w-64 origin-top-right overflow-hidden rounded-2xl border border-white/10 bg-slate-900/95 shadow-2xl backdrop-blur-xl"
            role="menu"
          >
            {/* User information */}
            <div className="border-b border-white/10 px-4 py-4">
              <p className="truncate text-sm font-semibold text-white">
                {displayName}
              </p>

              {user.email && (
                <p className="mt-1 truncate text-xs text-slate-400">
                  {user.email}
                </p>
              )}
            </div>

            {/* Menu items */}
            <div className="p-2">
              <Link
                to={profileHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center rounded-xl px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                role="menuitem"
              >
                Profile
              </Link>

              <Link
                to={sessionsHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center rounded-xl px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                role="menuitem"
              >
                Sessions
              </Link>

              <Link
                to={securityHref}
                onClick={() => setIsOpen(false)}
                className="flex items-center rounded-xl px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                role="menuitem"
              >
                Security
              </Link>

                <Link
                  to={changePasswordHref}
                  onClick={() => setIsOpen(false)}
                  className="flex items-center rounded-xl px-3 py-2.5 text-sm text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
                  role="menuitem"
                >
                  change password
                </Link>


            </div>

            {/* Logout */}
            <div className="border-t border-white/10 p-2">
              <Button
                type="button"
                variant="ghost"
                onPress={handleLogout}
                isDisabled={isLoggingOut}
                className="w-full justify-start border border-red-400/10 bg-red-500/5 text-red-300 hover:bg-red-500/15"
              >
                {isLoggingOut ? 'Logging out…' : 'Log out'}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}