import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';

/**
 * The "Back to X" pill-button link used in the header row of ProfilePage
 * and SessionsPage (user pages). Deliberately a plain link, not wrapped in
 * a Card element: both usages sit in a page header row, not inside a
 * Card's own footer (unlike StatusLink, which is used on the OAuth/verify
 * status pages and stays as-is).
 */
interface BackLinkProps {
  to: string;
  children: ReactNode;
}

function BackLink({ to, children }: BackLinkProps) {
  return (
    <Link
      to={to}
      className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
    >
      {children}
    </Link>
  );
}

export default BackLink;
