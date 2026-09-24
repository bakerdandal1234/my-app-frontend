Now the remaining components, landing/404 pages, and config files.The path is reachable now. `clean-code-guard` also turned out to be in your project (`.claude/skills/clean-code-guard`), so I followed its review mode and checklist over all of `src/` plus the config files. Nothing was modified. The file reader gives no line numbers, so findings cite the file plus the function or quoted code. Items that would change behavior are marked "confirm with author".

# Code review: my-app-frontend (`src/` + config)

## Summary
Needs work. The auth and HTTP core is careful and well reasoned. The debt is in the pages: heavy copy-paste, several oversized components, leftovers from a removed "customer" feature, debug logging, and a few real bugs.
Counts: 2 critical, 12 important, 3 nits

## Critical findings
- `src/pages/NotFoundPage.tsx` — correctness: `to={user?.email ? '/home' : '/customer/account'}`. `App.tsx` has no `/customer/account` route, so a logged-out visitor clicking "Back to home" lands on the 404 page again. Fix: use `'/'` for logged-out users.
- `src/pages/auth/RegisterPage.tsx` — correctness: `.max(100, ...).min(3, 'First name is required.')` (same for `lastName`). `min(3)` rejects real 2-letter names (Li, Wu, Al), and the message says "required" when the rule is length. It also makes `...(values.firstName ? { firstName } : {})` always true, although `AuthUser` treats both names as optional. Fix: `.trim().min(1, ...)` if required, or `.optional()`, after checking `CreateUserDto`, and drop the dead conditional spread.

## Important findings
- **I1** `RegisterPage`, `ResetPasswordPage`, `ChangePasswordPage` and others — DRY (duplicated knowledge):
  - `PASSWORD_RULE`, `PASSWORD_MESSAGE` and the `.min(8).max(128).regex()` chain are copied three times.
  - The 6-digit code rule is in `LoginPage` (`twoFactorSchema`), `SecurityPage` (`codeSchema`) and `OAuthCallbackPage` (`/^\d{6}$/.test`).
  - `resource:action` formatting is `permissionLabel()` in `AdminRolesPage` but inlined about 5 times in `AdminPermissionsPage`.
  - `'roles:read'` and `'permissions:read'` repeat in `App.tsx`, `AuthenticatedLayout` and `AdminRolesPage`.
  - `showToast(\`Role "${values.name.toLowerCase().trim()}" created\`)` re-implements the server's normalization.
  
  Fix: add `lib/validation.ts` (`passwordSchema`, `twoFactorCodeSchema`), `auth/permissions.ts` (constants plus `formatPermission`) and a `ROUTES` map. Drop the client-side normalization in the toast.
- **I2** `api/client.ts` and `LoginPage.tsx` — boundary: `const API_URL = import.meta.env.VITE_API_URL as string;` appears twice.
  - The `as string` cast contradicts AGENTS.md, and nothing checks the variable exists, so a missing value silently gives `baseURL: undefined`. `vite-env.d.ts` declares no `ImportMetaEnv`.
  - The sequence "GET → `isX(res.data)` → `throw new Error('Unexpected … response')`" appears about a dozen times, with endpoint strings inline in components.
  
  Fix: add `api/config.ts` exporting a validated `API_URL` that throws at startup if unset, and type `ImportMetaEnv`. Add a `getValidated(url, guard)` helper or per-domain modules.
- **I3** UI shell duplication — DRY (helpers exist but are bypassed):
  - The page shell (`relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4` plus `<AnimatedBackground />`) is copied more than a dozen times.
  - The animated error banner and the Label + Input + error field block are repeated dozens of times.
  - Nine pages define their own `*_BACKGROUND_BLOBS`, differing by a few pixels, although `AnimatedBackground` already has defaults.
  - There are three spinners: `ui/Spinner`, HeroUI's `Spinner` in `VerifyEmailPage`, and inline `animate-spin` divs in Sessions, AdminUsers, AdminRoles and AdminPermissions.
  - `LandingPage` defines its own local `AnimatedBackground` (same name as the shared one, same numbers as `HOME_BACKGROUND_BLOBS`) and local `containerVariants`/`itemVariants`.
  
  Fix: extract `AuthPageShell`, `FormField` and `FormErrorBanner`, give `AnimatedBackground` two presets, reuse `ui/Spinner`, and delete Landing's local copies.
- **I4** `LoginPage`, `SecurityPage`, `SessionsPage`, `AdminUsersPage`, `AdminRolesPage` — KISS/SRP:
  - Each is one large component. `AdminUsersPage` and `AdminRolesPage` run to hundreds of lines with 8–12 levels of JSX nesting, each owning loading, forms and mutations.
  - The `{/* Header */}`, `{/* Email */}` and `{/* Loading */}` banners mark components that don't exist yet.
  - `AdminUsersPage` also hand-rolls race protection with four refs (`selectionRef`, `accessRequestIdRef`, `mutationPendingRef`, `mountedRef`) mirrored by state, plus an `AccessSelection` wrapper that exists only for object identity.
  
  Fix: split into `LoginCredentialsForm`/`TwoFactorStep`, `RoleRow`/`CreateRoleForm`/`RolePermissionsPanel` and `UserRow`/`UserAccessPanel`. Move access loading into a `useUserAccess(userId)` hook that uses axios `signal`, which removes the ref bookkeeping.
- **I5** `OAuthCallbackPage`, `VerifyEmailPage` — correctness: one-shot requests sit in a `useEffect` with a `cancelled` flag, and `main.tsx` wraps everything in `<React.StrictMode>`.
  - In development StrictMode mounts, cleans up and re-mounts, so `POST /auth/oauth/exchange { code }` (single-use per your own comment) and `GET /auth/verify-email` are sent twice. The first result is discarded, and the second may come back as "already used", showing a failure for a successful sign-in. This depends on backend semantics and is development-only.
  - The comment "establishSession/navigate are stable across renders" is wrong: `establishSession` is re-created on every render in `AuthProvider`. The `eslint-disable react-hooks/exhaustive-deps` hides it.
  
  Fix: run the request once per `code` (ref guard) without discarding the first result on cleanup, and delete the false comment.
- **I6** `ChangePasswordPage` — correctness (behavior change, confirm with author): on success it says "All active sessions have been signed out… Please log in again" and offers a button to `/login`, but never clears the local session. The page is nested in `AuthenticatedLayout`, so the header and user menu remain and `isAuthenticated` stays true until a later request gets a 401. Fix: call `setAccessToken(null)` on success, then go to `/login` (with a success toast).
- **I7** `UserMenu.tsx`, `NotFoundPage.tsx`, `RegisterPage.tsx` — leftover debug logging:
  - `console.log(user)` runs on every render of `UserMenu` and in `NotFoundPage`, dumping email, name, ids and linked-account ids to the console.
  - `handleSubmit(onSubmit,(errors)=>console.log('❌ ZOD FAILED:', errors))` is in `RegisterPage`.
  
  Fix: delete all three; the second `handleSubmit` argument isn't needed.
- **I8** `package.json`, `tsconfig*.json` — tooling and tests:
  - `"test:api": "node --experimental-strip-types --test tests/api-validation.test.ts"` points at a `tests/` folder that doesn't exist. `guards.ts`, the trust-boundary validation that AGENTS.md requires tests for, has none.
  - No ESLint or Prettier is installed, yet `ErrorBoundary.tsx` and `OAuthCallbackPage.tsx` carry `eslint-disable` directives, and indentation drifts (`SessionsPage`, `AdminPermissionsPage.loadPermissions`, `AuthenticatedLayout`).
  - `tsconfig.json` sets `"types": ["node"]` for browser code, and `tsconfig.node.json` has no `strict`.
  
  Fix: add `tests/api-validation.test.ts` (accept/reject cases per guard) or delete the script. Install ESLint (`react-hooks`) and Prettier, drop `types: ["node"]` from the app config, and add `"strict": true` to the node config.
- **I9** Remnants and journal comments — comments:
  - `App.tsx` has a long comment about `CustomerProtectedRoute` and `/customer/oauth/callback` with no routes after it.
  - `.gitignore` lists `**/customer/`, `CustomerOAuthCallbackPage.tsx` and `src/pages/customer`.
  - `motion-variants.ts`, `StatusIconHeader`, `StatusLink` and `GlassCard` still cite the customer pages.
  - Change-log comments ("now come from the shared…", "approved as part of the UI dedup pass", "used to each hand-roll…") appear in about ten files.
  - `AuthContext` has a "Phase 8/9" doc comment.
  - `LoginPage` has an orphan `/** POST /auth/login returns either shape… */`.
  - `api/guards.ts` still contains pasted instructions ("أضف التالي أسفل الكود الموجود", "المرحلة الثالثة…") and a `C:/Users/b/...` path.
  
  Fix: delete all of these (git keeps the history) and keep only why-comments like those in `client.ts` and `tokenStore.ts`.
- **I10** Dead or half-finished code — YAGNI:
  - `HomePage`, the post-login landing page, renders only a background and `<div className="relative z-10 min-h-screen" />`.
  - `ProtectedRoute` passes `state={{ from: location }}`, but `LoginPage` and `OAuthCallbackPage` always `navigate('/home')`, so deep links are lost.
  - `UserMenu` has `isLoggingOut`, `profileHref`, `sessionsHref`, `securityHref` and `changePasswordHref` props that no caller passes.
  - `lucide-react` is in `dependencies` but never imported; the code uses emoji and glyphs (👥 🔐 ↓ ×).
  
  Fix: implement or redirect `HomePage`. Either read `location.state.from` after login or drop the `state`. Delete the unused props and the dependency, or use it for the icons.
- **I11** Layout and stacking — correctness (reasoned from the CSS, not seen in a browser):
  - `AuthenticatedLayout` renders `AppHeader` and then `<Outlet />`, but every page root is `min-h-screen` (Profile, Sessions, Security, ChangePassword, Admin*, Home and the denied screen). Page height becomes header + 100vh, so it always scrolls.
  - The default `AnimatedBackground` wrapper and the Profile, Security and Sessions wrappers use `-z-10` inside roots that have an opaque `bg-slate-950` and no stacking context. The blobs should paint underneath that background and never show, while their infinite animations still run.
  - `FullPageLoading`, `ErrorBoundary` and `RequirePermissionRoute` use light `bg-slate-100` in a dark app.
  
  Fix: make the layout `flex min-h-screen flex-col` with pages using `flex-1`. Add `isolate` to page roots, or use non-negative wrappers with `relative z-10` content as `HomePage` does. Use `bg-slate-950` on those three screens.
- **I12** `AuthContext.tsx`, `SessionsPage.tsx` — DRY and swallowed errors:
  - (a) The restore effect and `establishSession` repeat the same "GET /users/me → `isAuthUser` → `loadAccess` → version checks" sequence. The effect also repeats `if (cancelled || restoreVersion !== getAuthVersion()) return;` twice with no `await` in between.
  - (b) The restore `catch { … setAccessToken(null) … }` treats every failure (network drop, 500, unexpected shape) as "logged out" with no trace (behavior change, confirm with author). `SessionsPage.handleRevoke` does the same for a failed `refreshAccessToken()` and has no why-comment for calling it.
  
  Fix: extract one `loadSession(version)` returning `{ user, access }` and use it in both places. Treat only auth failures (401 or refresh rejected) as signed-out, and log or surface the rest. Add the why-comment.

## Nits
- **N1** Naming and copy: `SecurityPage.tsx` exports `TwoFactorSetupPage`. Three imports use `'././pages/...'` (`OAuthCallbackPage`, `SessionsPage`, `ChangePasswordPage`). The menu label `change password` is lower-case beside Profile, Sessions and Security. `index.html` says `my-app-frontend` while the product is FlowDesk. Fix: rename the component, normalize the import paths, use "Change password", and set `<title>FlowDesk</title>`.
- **N2** Form accessibility: the role `<select>` label in `AdminUsersPage` and every field in `AdminPermissionsPage` have `<label>` without `htmlFor`/`id`. The auth pages and `AdminRolesPage` do this correctly. `RegisterPage` also uses `type="text"` for email while other forms use `type="email"`. Fix: add matching `id`/`htmlFor`, use `type="email"` and add `autoComplete`.
- **N3** `OAuthCallbackPage` success path: `navigate('/home')` (the 2FA path uses `{ replace: true }`), so Back returns to a callback URL whose code is already spent. Fix: `navigate('/home', { replace: true })`.

## What's good
- Every API response is typed `unknown` and validated by a type guard before use (`api/guards.ts`). There is no `any` or `@ts-ignore`, and `strict` is on, which matches AGENTS.md.
- The auth plumbing is thoughtful: in-memory access token, CSRF header from the cookie, `authVersion` to stop stale retries, and coalesced refresh, all with why-comments.
- Extracting `motion-variants.ts`, `GlassCard` and `StatusLink` is the right direction; it just stopped halfway.

## Coverage
- Section A (naming and functions): I4 (oversized components) and N1. No banned generic names, boolean flag args or CQS violations found.
- Section B (comments and formatting): I9, I8 (formatting drift), N1.
- Section C (SOLID): I4 and I12 (SRP: pages own fetching, forms and mutations; `AuthProvider` mixes token sync, restore, login and logout), I2 (pages call `apiClient` and endpoint strings directly). OCP, LSP and ISP are clean: no inheritance and no type-tag dispatch.
- Section D (DRY/KISS/YAGNI): I1, I2, I3, I4, I10.
- Section E (AI failure modes): I5, I7, I10, I12. No hardcoded "success" returns or mock fixtures, and no boundary validation was removed.

## Not verified
- I didn't run `tsc -b`, the build or any tests.
- I didn't open `.env`, since it holds secrets; `.gitignore` excludes it.
- I5 and I11 are reasoned from the code, not observed in a browser.
- I didn't compare installed package versions against `package-lock.json`, or check backend DTOs such as the name rules behind Critical 2.

I haven't changed any files. Tell me which findings to fix first and I'll make those changes.


///////////////////////////////////////////////////////////////////
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import { Button, Input } from '@heroui/react';

import { apiClient } from '../../api/client';
import { getErrorMessage } from '../../api/errors';
import { useToast } from '../../ui/ToastContext';
import AnimatedBackground, {
  type AnimatedBackgroundBlob,
  type AnimatedBackgroundPulseBlob,
} from '../../components/layout/AnimatedBackground';
import GlassCard from '../../components/shared/GlassCard';
import {
  adminListItemVariants as itemVariants,
  adminListErrorVariants as errorVariants,
} from '../../lib/motion-variants';
import {
  isRoleItemArray,
  isPermissionItemArray,
  type RoleItem,
  type PermissionItem,
} from '../../api/guards';



/** Mirrors CreateRoleDto/UpdateRoleDto — name is lowercased/trimmed server-side. */
const roleSchema = z.object({
  name: z
    .string()
    .min(2, 'Name must be 2-50 characters.')
    .max(50, 'Name must be 2-50 characters.'),
  description: z
    .string()
    .max(255, 'Description must be at most 255 characters.')
    .optional(),
});

type RoleFormValues = z.infer<typeof roleSchema>;

function permissionLabel(permission: PermissionItem): string {
  return `${permission.resource}:${permission.action}`;
}

// This page's containerVariants intentionally has no opacity step (see
// ../../lib/motion-variants for the shared adminListContainerVariants used
// by AdminUsersPage/AdminPermissionsPage, which do fade in on load — kept
// separate here rather than changing this page's load animation).
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: {
      staggerChildren: 0.06,
    },
  },
};

// itemVariants / errorVariants now come from the shared
// ../../lib/motion-variants (this "admin list page" family is also used by
// AdminUsersPage and AdminPermissionsPage).

const ADMIN_ROLES_BACKGROUND_WRAPPER_CLASSNAME =
  'pointer-events-none absolute inset-0 overflow-hidden';

const ADMIN_ROLES_BACKGROUND_BLOBS: AnimatedBackgroundBlob[] = [
  {
    x: [0, 45, 0],
    y: [0, 30, 0],
    scale: [1, 1.12, 1],
    duration: 14,
    className:
      'absolute -left-32 -top-32 h-96 w-96 rounded-full bg-indigo-600/15 blur-3xl',
  },
  {
    x: [0, -40, 0],
    y: [0, -30, 0],
    scale: [1, 1.15, 1],
    duration: 17,
    className:
      'absolute -bottom-40 -right-32 h-96 w-96 rounded-full bg-purple-600/15 blur-3xl',
  },
];

// The original had no `scale` on this pulse (only opacity); [1, 1, 1] keeps
// the prop required while animating between three identical values, which
// is visually a no-op — same as omitting it.
const ADMIN_ROLES_BACKGROUND_PULSE_BLOB: AnimatedBackgroundPulseBlob = {
  opacity: [0.15, 0.3, 0.15],
  scale: [1, 1, 1],
  duration: 8,
  className:
    'absolute left-1/2 top-1/3 h-72 w-72 -translate-x-1/2 rounded-full bg-blue-500/5 blur-3xl',
};

function AdminRolesPage() {
  const { showToast } = useToast();

  const [roles, setRoles] = useState<RoleItem[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [expandedRoleId, setExpandedRoleId] = useState<string | null>(null);
  const [selectedPermissionId, setSelectedPermissionId] = useState('');
  const [isMutating, setIsMutating] = useState(false);
  const [rowError, setRowError] = useState<string | null>(null);

  const createForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  const editForm = useForm<RoleFormValues>({
    resolver: zodResolver(roleSchema),
    defaultValues: {
      name: '',
      description: '',
    },
  });

  async function loadRolesAndPermissions(): Promise<void> {
    setError(null);

    try {
      const [rolesRes, permissionsRes] = await Promise.all([
        apiClient.get<unknown>('/authorization/roles'),
        apiClient.get<unknown>('/authorization/permissions'),
      ]);

      if (!isRoleItemArray(rolesRes.data)) {
        throw new Error('Unexpected roles response');
      }

      if (!isPermissionItemArray(permissionsRes.data)) {
        throw new Error('Unexpected permissions response');
      }

      setRoles(rolesRes.data);
      setPermissions(permissionsRes.data);
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    }
  }

  useEffect(() => {
    loadRolesAndPermissions();
  }, []);

  async function onCreateRole(values: RoleFormValues) {
    setRowError(null);

    try {
      await apiClient.post('/authorization/roles', {
        name: values.name,
        ...(values.description
          ? { description: values.description }
          : {}),
      });

      createForm.reset();
      setShowCreateForm(false);

      await loadRolesAndPermissions();

      showToast(`Role "${values.name.toLowerCase().trim()}" created`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  function startEditing(role: RoleItem) {
    setEditingRoleId(role.id);
    setRowError(null);

    editForm.reset({
      name: role.name,
      description: role.description ?? '',
    });
  }

  async function onSaveEdit(values: RoleFormValues) {
    if (!editingRoleId) return;

    setRowError(null);

    try {
      await apiClient.patch(`/authorization/roles/${editingRoleId}`, {
        name: values.name,
        description: values.description || undefined,
      });

      setEditingRoleId(null);

      await loadRolesAndPermissions();

      showToast('Role updated');
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  async function handleDeleteRole(role: RoleItem) {
    if (
      !window.confirm(
        `Delete role "${role.name}"? This also removes it from every user who has it.`,
      )
    ) {
      return;
    }

    setRowError(null);

    try {
      await apiClient.delete(`/authorization/roles/${role.id}`);

      await loadRolesAndPermissions();

      showToast(`Role "${role.name}" deleted`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    }
  }

  function toggleExpand(roleId: string) {
    setExpandedRoleId(
      expandedRoleId === roleId ? null : roleId,
    );

    setSelectedPermissionId('');
    setRowError(null);
  }

  async function handleAssignPermission(roleId: string) {
    if (!selectedPermissionId) return;

    const permission = permissions.find(
      (item) => item.id === selectedPermissionId,
    );

    setIsMutating(true);
    setRowError(null);

    try {
      await apiClient.post(
        `/authorization/roles/${roleId}/permissions/${selectedPermissionId}`,
      );

      setSelectedPermissionId('');

      await loadRolesAndPermissions();

      showToast(
        `Assigned "${permission
          ? permissionLabel(permission)
          : 'permission'
        }"`,
      );
    } catch (err) {
      setRowError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  async function handleRemovePermission(
    roleId: string,
    permissionId: string,
    label: string,
  ) {
    setIsMutating(true);
    setRowError(null);

    try {
      await apiClient.delete(
        `/authorization/roles/${roleId}/permissions/${permissionId}`,
      );

      await loadRolesAndPermissions();

      showToast(`Removed "${label}"`);
    } catch (err) {
      setRowError(getErrorMessage(err));
    } finally {
      setIsMutating(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-8">
      <AnimatedBackground
        wrapperClassName={ADMIN_ROLES_BACKGROUND_WRAPPER_CLASSNAME}
        blobs={ADMIN_ROLES_BACKGROUND_BLOBS}
        pulseBlob={ADMIN_ROLES_BACKGROUND_PULSE_BLOB}
      />

      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative mx-auto max-w-5xl"
      >
        {/* Header */}
        <motion.header
          variants={itemVariants}
          className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"
        >
          <div>
            <div className="mb-2 flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600/20 ring-1 ring-indigo-400/20">
                <span className="text-lg font-bold text-indigo-300">
                  F
                </span>
              </div>

              <div>
                <p className="text-xs font-medium uppercase tracking-[0.2em] text-indigo-300/80">
                  FlowDesk
                </p>

                <h1 className="text-2xl font-bold tracking-tight text-white">
                  Roles
                </h1>
              </div>
            </div>

            <p className="max-w-xl text-sm text-slate-400">
              Manage application roles and control which permissions
              each role can access.
            </p>
          </div>
        </motion.header>

        {/* Main Card */}
        <motion.div variants={itemVariants}>
          <GlassCard>
            <div className="p-5 sm:p-6">
              {/* Card Header */}
              <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Role registry
                  </h2>

                  <p className="mt-1 text-sm text-slate-400">
                    Create roles, update them, or manage their
                    assigned permissions.
                  </p>
                </div>

                <Button
                  type="button"
                  variant="primary"
                  onPress={() =>
                    setShowCreateForm((value) => !value)
                  }
                  className="bg-indigo-600 text-white hover:bg-indigo-500"
                >
                  {showCreateForm ? 'Cancel' : '+ New role'}
                </Button>
              </div>

              {/* Errors */}
              <AnimatePresence mode="wait">
                {error && (
                  <motion.p
                    key="main-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {error}
                  </motion.p>
                )}

                {rowError && (
                  <motion.p
                    key="row-error"
                    variants={errorVariants}
                    initial="hidden"
                    animate="visible"
                    exit="hidden"
                    className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200"
                    role="alert"
                  >
                    {rowError}
                  </motion.p>
                )}
              </AnimatePresence>

              {/* Create Role */}
              <AnimatePresence>
                {showCreateForm && (
                  <motion.form
                    initial={{
                      opacity: 0,
                      height: 0,
                      y: -10,
                    }}
                    animate={{
                      opacity: 1,
                      height: 'auto',
                      y: 0,
                    }}
                    exit={{
                      opacity: 0,
                      height: 0,
                      y: -10,
                    }}
                    transition={{ duration: 0.3 }}
                    onSubmit={createForm.handleSubmit(onCreateRole)}
                    className="mb-6 overflow-hidden"
                  >
                    <div className="rounded-xl border border-white/10 bg-slate-900/60 p-4">
                      <div className="mb-4">
                        <h3 className="text-sm font-semibold text-white">
                          Create new role
                        </h3>

                        <p className="mt-1 text-xs text-slate-400">
                          Role names are normalized by the server.
                        </p>
                      </div>

                      <div className="grid gap-4 sm:grid-cols-2">
                        <div>
                          <label
                            htmlFor="create-role-name"
                            className="mb-2 block text-sm font-medium text-slate-200"
                          >
                            Name
                          </label>

                          <Input
                            id="create-role-name"
                            placeholder="e.g. manager"
                            {...createForm.register('name')}
                            className="text-white"
                          />

                          {createForm.formState.errors.name && (
                            <p className="mt-1.5 text-xs text-red-300">
                              {
                                createForm.formState.errors.name
                                  .message
                              }
                            </p>
                          )}
                        </div>

                        <div>
                          <label
                            htmlFor="create-role-description"
                            className="mb-2 block text-sm font-medium text-slate-200"
                          >
                            Description
                          </label>

                          <Input
                            id="create-role-description"
                            placeholder="Optional description"
                            {...createForm.register('description')}
                            className="text-white"
                          />

                          {createForm.formState.errors.description && (
                            <p className="mt-1.5 text-xs text-red-300">
                              {
                                createForm.formState.errors
                                  .description?.message
                              }
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="mt-4 flex justify-end">
                        <Button
                          type="submit"
                          variant="primary"
                          isDisabled={
                            createForm.formState.isSubmitting
                          }
                          className="bg-indigo-600 text-white hover:bg-indigo-500"
                        >
                          {createForm.formState.isSubmitting
                            ? 'Creating…'
                            : 'Create role'}
                        </Button>
                      </div>
                    </div>
                  </motion.form>
                )}
              </AnimatePresence>

              {/* Loading */}
              {roles === null && !error && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center py-16"
                >
                  <div className="flex items-center gap-3 text-sm text-slate-400">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{
                        duration: 1,
                        repeat: Infinity,
                        ease: 'linear',
                      }}
                      className="h-5 w-5 rounded-full border-2 border-indigo-400/30 border-t-indigo-400"
                    />

                    Loading roles…
                  </div>
                </motion.div>
              )}

              {/* Empty */}
              {roles && roles.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-xl border border-dashed border-white/10 bg-white/5 px-6 py-12 text-center"
                >
                  <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500/10 text-indigo-300">
                    <span className="text-xl">+</span>
                  </div>

                  <h3 className="text-sm font-semibold text-white">
                    No roles yet
                  </h3>

                  <p className="mt-1 text-sm text-slate-400">
                    Create your first role to start managing
                    permissions.
                  </p>
                </motion.div>
              )}

              {/* Roles */}
              {roles && roles.length > 0 && (
                <div className="space-y-3">
                  {roles.map((role) => {
                    const assignedIds = new Set(
                      role.rolePermissions.map(
                        (rolePermission) =>
                          rolePermission.permissionId,
                      ),
                    );

                    const assignablePermissions =
                      permissions.filter(
                        (permission) =>
                          !assignedIds.has(permission.id),
                      );

                    const isExpanded =
                      expandedRoleId === role.id;

                    return (
                      <motion.div
                        key={role.id}
                        variants={itemVariants}
                        layout
                        className="overflow-hidden rounded-xl border border-white/10 bg-white/5 transition-colors hover:bg-white/[0.07]"
                      >
                        {/* Role Row */}
                        {editingRoleId === role.id ? (
                          <form
                            onSubmit={editForm.handleSubmit(
                              onSaveEdit,
                            )}
                            className="p-4"
                          >
                            <div className="grid gap-4 sm:grid-cols-2">
                              <div>
                                <label
                                  htmlFor={`edit-role-name-${role.id}`}
                                  className="mb-2 block text-sm font-medium text-slate-200"
                                >
                                  Role name
                                </label>

                                <Input
                                  id={`edit-role-name-${role.id}`}
                                  {...editForm.register('name')}
                                  className="text-white"
                                />

                                {editForm.formState.errors.name && (
                                  <p className="mt-1.5 text-xs text-red-300">
                                    {
                                      editForm.formState.errors
                                        .name.message
                                    }
                                  </p>
                                )}
                              </div>

                              <div>
                                <label
                                  htmlFor={`edit-role-description-${role.id}`}
                                  className="mb-2 block text-sm font-medium text-slate-200"
                                >
                                  Description
                                </label>

                                <Input
                                  id={`edit-role-description-${role.id}`}
                                  {...editForm.register(
                                    'description',
                                  )}
                                  className="text-white"
                                />
                              </div>
                            </div>

                            <div className="mt-4 flex flex-wrap justify-end gap-2">
                              <Button
                                type="submit"
                                variant="primary"
                                isDisabled={
                                  editForm.formState.isSubmitting
                                }
                                className="bg-indigo-600 text-white hover:bg-indigo-500"
                              >
                                {editForm.formState.isSubmitting
                                  ? 'Saving…'
                                  : 'Save'}
                              </Button>

                              <Button
                                type="button"
                                variant="ghost"
                                onPress={() =>
                                  setEditingRoleId(null)
                                }
                                className="text-slate-300 hover:bg-white/10 hover:text-white"
                              >
                                Cancel
                              </Button>
                            </div>
                          </form>
                        ) : (
                          <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
                            <button
                              type="button"
                              onClick={() =>
                                toggleExpand(role.id)
                              }
                              className="min-w-0 text-left"
                            >
                              <div className="flex items-center gap-3">
                                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-sm font-semibold text-indigo-300 ring-1 ring-indigo-400/10">
                                  {role.name
                                    .slice(0, 1)
                                    .toUpperCase()}
                                </div>

                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-white">
                                    {role.name}
                                  </p>

                                  <p className="mt-0.5 truncate text-xs text-slate-400">
                                    {role.description ||
                                      'No description'}
                                  </p>
                                </div>
                              </div>
                            </button>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                onClick={() =>
                                  toggleExpand(role.id)
                                }
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-indigo-300 transition-colors hover:bg-indigo-500/10 hover:text-indigo-200"
                              >
                                {isExpanded
                                  ? 'Hide permissions'
                                  : 'Manage permissions'}
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  startEditing(role)
                                }
                                className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-300 transition-colors hover:bg-white/10 hover:text-white"
                              >
                                Edit
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  handleDeleteRole(role)
                                }
                                className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/20 hover:text-red-200"
                              >
                                Delete
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Permissions Panel */}
                        <AnimatePresence initial={false}>
                          {isExpanded && (
                            <motion.div
                              initial={{
                                opacity: 0,
                                height: 0,
                              }}
                              animate={{
                                opacity: 1,
                                height: 'auto',
                              }}
                              exit={{
                                opacity: 0,
                                height: 0,
                              }}
                              transition={{ duration: 0.25 }}
                              className="overflow-hidden"
                            >
                              <div className="border-t border-white/10 bg-slate-950/40 p-4">
                                <div className="mb-4">
                                  <h3 className="text-sm font-semibold text-white">
                                    Assigned permissions
                                  </h3>

                                  <p className="mt-1 text-xs text-slate-400">
                                    Manage the permissions available
                                    to this role.
                                  </p>
                                </div>

                                {/* Assigned permissions */}
                                <div className="flex flex-wrap gap-2">
                                  {role.rolePermissions.length ===
                                    0 && (
                                      <span className="rounded-lg border border-dashed border-white/10 bg-white/5 px-3 py-2 text-xs text-slate-500">
                                        No permissions assigned.
                                      </span>
                                    )}

                                  {role.rolePermissions.map(
                                    (rolePermission) => {
                                      const label =
                                        permissionLabel(
                                          rolePermission.permission,
                                        );

                                      return (
                                        <motion.span
                                          key={
                                            rolePermission.permissionId
                                          }
                                          initial={{
                                            opacity: 0,
                                            scale: 0.9,
                                          }}
                                          animate={{
                                            opacity: 1,
                                            scale: 1,
                                          }}
                                          className="inline-flex items-center gap-1 rounded-full border border-indigo-400/20 bg-indigo-500/10 px-3 py-1.5 text-xs font-medium text-indigo-200"
                                        >
                                          {label}

                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemovePermission(
                                                role.id,
                                                rolePermission.permissionId,
                                                label,
                                              )
                                            }
                                            disabled={isMutating}
                                            aria-label={`Remove ${label}`}
                                            className="-mr-1 rounded-full p-1 text-indigo-300 transition-colors hover:bg-indigo-400/20 hover:text-white disabled:opacity-50"
                                          >
                                            ×
                                          </button>
                                        </motion.span>
                                      );
                                    },
                                  )}
                                </div>

                                {/* Assign permission */}
                                {assignablePermissions.length >
                                  0 && (
                                    <div className="mt-5 rounded-xl border border-white/10 bg-white/5 p-3">
                                      <div className="mb-3">
                                        <p className="text-xs font-medium text-slate-300">
                                          Add permission
                                        </p>

                                        <p className="mt-1 text-xs text-slate-500">
                                          Select a permission that is
                                          not already assigned.
                                        </p>
                                      </div>

                                      <div className="flex flex-col gap-2 sm:flex-row">
                                        <select
                                          value={
                                            selectedPermissionId
                                          }
                                          onChange={(event) =>
                                            setSelectedPermissionId(
                                              event.target.value,
                                            )
                                          }
                                          className="min-h-10 flex-1 rounded-lg border border-white/10 bg-slate-900 px-3 text-sm text-slate-200 outline-none transition focus:border-indigo-400/50 focus:ring-2 focus:ring-indigo-500/20"
                                        >
                                          <option value="">
                                            Add a permission…
                                          </option>

                                          {assignablePermissions.map(
                                            (permission) => (
                                              <option
                                                key={permission.id}
                                                value={permission.id}
                                              >
                                                {permissionLabel(
                                                  permission,
                                                )}
                                              </option>
                                            ),
                                          )}
                                        </select>

                                        <Button
                                          type="button"
                                          variant="primary"
                                          onPress={() =>
                                            handleAssignPermission(
                                              role.id,
                                            )
                                          }
                                          isDisabled={
                                            !selectedPermissionId ||
                                            isMutating
                                          }
                                          className="bg-indigo-600 text-white hover:bg-indigo-500"
                                        >
                                          {isMutating
                                            ? 'Assigning…'
                                            : 'Assign'}
                                        </Button>
                                      </div>
                                    </div>
                                  )}

                                {assignablePermissions.length ===
                                  0 &&
                                  permissions.length > 0 && (
                                    <div className="mt-5 rounded-lg border border-emerald-500/10 bg-emerald-500/5 px-3 py-2">
                                      <p className="text-xs text-emerald-300">
                                        All available permissions are
                                        assigned to this role.
                                      </p>
                                    </div>
                                  )}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </GlassCard>
        </motion.div>
      </motion.div>
    </div>
  );
}

export default AdminRolesPage;