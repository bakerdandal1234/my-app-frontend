import type { ReactNode } from 'react';
import AnimatedBackground from './AnimatedBackground';

interface AuthPageShellProps {
  children: ReactNode;
}

/**
 * Shared outer wrapper for every auth-form page (login, register,
 * forgot/reset password, change password): a centered card over the
 * default animated background, full viewport height. This exact className
 * string plus <AnimatedBackground /> was copy-pasted onto more than a
 * dozen return statements across those pages.
 */
function AuthPageShell({ children }: AuthPageShellProps) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4">
      <AnimatedBackground />
      {children}
    </div>
  );
}

export default AuthPageShell;
