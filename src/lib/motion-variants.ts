import type { Variants } from 'framer-motion';

/**
 * Shared framer-motion variants for the FlowDesk design system — extracted
 * from HomePage/ChangePasswordPage (where they were duplicated) so every
 * page's entrance animation stays consistent instead of copy-pasted values
 * drifting apart over time.
 */

/** Card/form container: fades + rises + scales in, staggering its children. */
export const containerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 30,
    scale: 0.96,
  },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

/** Individual fields/sections inside a staggered container. */
export const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 15,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      type: 'spring',
      stiffness: 260,
      damping: 20,
    },
  },
};

/** Error/status banners shown via AnimatePresence. */
export const errorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -10,
  },
  visible: {
    opacity: 1,
    y: 0,
  },
};

/**
 * "Status page" family — for single-outcome pages (email verification,
 * OAuth callback) rather than multi-field forms. Extracted from
 * VerifyEmailPage/OAuthCallbackPage/CustomerOAuthCallbackPage, where all
 * three defined the exact same values independently.
 */

/** Status card container: fades + rises in, staggering its children (no scale). */
export const statusContainerVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 20,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: 'easeOut',
      staggerChildren: 0.08,
    },
  },
};

/** Text/content blocks inside a statusContainerVariants container. */
export const statusItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.4,
      ease: 'easeOut',
    },
  },
};

/** The icon circle at the top of a status card. */
export const statusIconVariants: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.7,
  },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      type: 'spring',
      stiffness: 180,
      damping: 12,
    },
  },
};

/**
 * "Admin list page" family — for the admin Users/Roles/Permissions pages.
 * itemVariants and errorVariants were defined identically, independently,
 * in all three pages, and are consolidated here. containerVariants is only
 * shared between AdminUsersPage and AdminPermissionsPage, which fade the
 * whole page in on load (opacity 0→1); AdminRolesPage's own container
 * variant has no opacity step (it only staggers children) and is
 * deliberately kept local rather than forced to match, since unifying it
 * would be a real, visible change to that page's load animation.
 */

/** Admin list container: fades the page in, staggering its children. */
export const adminListContainerVariants: Variants = {
  hidden: {
    opacity: 0,
  },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.06,
    },
  },
};

/** Header/card blocks inside an admin list page container. */
export const adminListItemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: 'easeOut',
    },
  },
};

/** Error banners on an admin list page, shown via AnimatePresence. */
export const adminListErrorVariants: Variants = {
  hidden: {
    opacity: 0,
    y: -8,
  },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
    },
  },
};
