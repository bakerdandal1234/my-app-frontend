import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccessTokenResponse,
  isAdminUser,
  isAdminUserArray,
  isAuthUser,
  isMessageResponse,
  isPermissionItem,
  isPermissionItemArray,
  isRoleItem,
  isRoleItemArray,
  isSessionItem,
  isSessionItemArray,
  isTwoFactorRequiredResponse,
  isTwoFactorSetupResponse,
  isUserAccess,
} from '../src/api/guards.ts';

type Guard = (value: unknown) => boolean;
type Cases = Record<string, unknown>;

const DATE = '2024-01-15T10:30:00.000Z';

// Values that are never a valid API object, whatever the guard.
const NOT_OBJECTS: Cases = {
  null: null,
  undefined: undefined,
  'a string': 'x',
  'a number': 1,
  'an array': [],
};

// Values that are never a valid API array.
const NOT_ARRAYS: Cases = {
  null: null,
  undefined: undefined,
  'a string': 'x',
  'a number': 1,
  'a plain object': {},
};

function describeGuard(
  name: string,
  guard: Guard,
  accepts: Cases,
  rejects: Cases,
): void {
  describe(name, () => {
    for (const [label, value] of Object.entries(accepts)) {
      it(`accepts ${label}`, () => {
        assert.equal(guard(value), true);
      });
    }

    for (const [label, value] of Object.entries(rejects)) {
      it(`rejects ${label}`, () => {
        assert.equal(guard(value), false);
      });
    }
  });
}

// --- Fixtures ---------------------------------------------------------------

const authUser = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: 'Ada',
  lastName: null,
  isEmailVerified: true,
  isTwoFactorEnabled: false,
  googleId: null,
  githubId: undefined,
  createdAt: DATE,
};

const adminUser = {
  id: 'u1',
  email: 'ada@example.com',
  firstName: null,
  isEmailVerified: false,
  createdAt: DATE,
};

const permission = {
  id: 'p1',
  resource: 'roles',
  action: 'read',
  description: null,
};

const role = {
  id: 'r1',
  name: 'admin',
  description: null,
  rolePermissions: [{ permissionId: 'p1', permission }],
};

const session = {
  id: 's1',
  userAgent: 'Mozilla/5.0',
  ipAddress: '127.0.0.1',
  createdAt: DATE,
  lastUsedAt: null,
  expiresAt: DATE,
  revokedAt: null,
};

// --- Auth responses ---------------------------------------------------------

describeGuard(
  'isAccessTokenResponse',
  isAccessTokenResponse,
  {
    'a token': { accessToken: 'tok' },
    'a token with twoFactorRequired false': {
      accessToken: 'tok',
      twoFactorRequired: false,
    },
  },
  {
    ...NOT_OBJECTS,
    'an empty object': {},
    'an empty token': { accessToken: '' },
    'a whitespace-only token': { accessToken: '   ' },
    'a non-string token': { accessToken: 123 },
    'a token alongside twoFactorRequired true': {
      accessToken: 'tok',
      twoFactorRequired: true,
    },
  },
);

describeGuard(
  'isTwoFactorRequiredResponse',
  isTwoFactorRequiredResponse,
  {
    'twoFactorRequired true': { twoFactorRequired: true },
  },
  {
    ...NOT_OBJECTS,
    'an empty object': {},
    'twoFactorRequired false': { twoFactorRequired: false },
    'twoFactorRequired as a string': { twoFactorRequired: 'true' },
    'twoFactorRequired with a token': {
      twoFactorRequired: true,
      accessToken: 'tok',
    },
  },
);

// --- Current user -----------------------------------------------------------

describeGuard(
  'isAuthUser',
  isAuthUser,
  {
    'a full user': authUser,
    'a user without optional fields': {
      id: 'u1',
      email: 'ada@example.com',
      isEmailVerified: false,
      isTwoFactorEnabled: true,
      createdAt: DATE,
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing id': { ...authUser, id: undefined },
    'a non-string email': { ...authUser, email: 42 },
    'a string isEmailVerified': { ...authUser, isEmailVerified: 'true' },
    'a missing isTwoFactorEnabled': {
      ...authUser,
      isTwoFactorEnabled: undefined,
    },
    'a non-string firstName': { ...authUser, firstName: 5 },
    'an unparseable createdAt': { ...authUser, createdAt: 'not-a-date' },
  },
);

describeGuard(
  'isUserAccess',
  isUserAccess,
  {
    'roles and permissions': {
      userId: 'u1',
      roles: ['admin'],
      permissions: ['roles:read'],
    },
    'empty roles and permissions': {
      userId: 'u1',
      roles: [],
      permissions: [],
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing userId': { roles: [], permissions: [] },
    'roles as a string': { userId: 'u1', roles: 'admin', permissions: [] },
    'a non-string permission': {
      userId: 'u1',
      roles: [],
      permissions: ['roles:read', 7],
    },
  },
);

// --- Admin: users -----------------------------------------------------------

describeGuard(
  'isAdminUser',
  isAdminUser,
  { 'an admin user': adminUser },
  {
    ...NOT_OBJECTS,
    'a numeric id': { ...adminUser, id: 1 },
    'a missing isEmailVerified': { ...adminUser, isEmailVerified: undefined },
    'an unparseable createdAt': { ...adminUser, createdAt: 'yesterday' },
  },
);

describeGuard(
  'isAdminUserArray',
  isAdminUserArray,
  {
    'an empty array': [],
    'an array of admin users': [adminUser, adminUser],
  },
  {
    ...NOT_ARRAYS,
    'an array with one invalid item': [adminUser, {}],
  },
);

// --- Admin: permissions and roles ------------------------------------------

describeGuard(
  'isPermissionItem',
  isPermissionItem,
  {
    'a permission': permission,
    'a permission without a description': {
      id: 'p1',
      resource: 'roles',
      action: 'read',
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing action': { ...permission, action: undefined },
    'a numeric resource': { ...permission, resource: 1 },
    'a numeric description': { ...permission, description: 5 },
  },
);

describeGuard(
  'isPermissionItemArray',
  isPermissionItemArray,
  {
    'an empty array': [],
    'an array of permissions': [permission],
  },
  {
    ...NOT_ARRAYS,
    'an array with one invalid item': [permission, { id: 'p2' }],
  },
);

describeGuard(
  'isRoleItem',
  isRoleItem,
  {
    'a role with permissions': role,
    'a role without permissions': { ...role, rolePermissions: [] },
  },
  {
    ...NOT_OBJECTS,
    'a numeric name': { ...role, name: 1 },
    'rolePermissions as an object': { ...role, rolePermissions: {} },
    'a rolePermission without a permission': {
      ...role,
      rolePermissions: [{ permissionId: 'p1' }],
    },
    'a rolePermission with an invalid permission': {
      ...role,
      rolePermissions: [{ permissionId: 'p1', permission: { id: 'p1' } }],
    },
  },
);

describeGuard(
  'isRoleItemArray',
  isRoleItemArray,
  {
    'an empty array': [],
    'an array of roles': [role],
  },
  {
    ...NOT_ARRAYS,
    'an array with one invalid item': [role, { id: 'r2' }],
  },
);

// --- Sessions ---------------------------------------------------------------

describeGuard(
  'isSessionItem',
  isSessionItem,
  {
    'a full session': session,
    'a session with only required fields': {
      id: 's1',
      createdAt: DATE,
      expiresAt: DATE,
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing createdAt': { ...session, createdAt: undefined },
    'an unparseable expiresAt': { ...session, expiresAt: 'soon' },
    'an unparseable revokedAt': { ...session, revokedAt: 'bad' },
    'a numeric lastUsedAt': { ...session, lastUsedAt: 5 },
  },
);

describeGuard(
  'isSessionItemArray',
  isSessionItemArray,
  {
    'an empty array': [],
    'an array of sessions': [session, session],
  },
  {
    ...NOT_ARRAYS,
    'an array with one invalid item': [session, { id: 's2' }],
  },
);

// --- 2FA setup and generic message -----------------------------------------

describeGuard(
  'isTwoFactorSetupResponse',
  isTwoFactorSetupResponse,
  {
    'a QR code and secret': {
      qrCodeDataUrl: 'data:image/png;base64,AAAA',
      secret: 'JBSWY3DPEHPK3PXP',
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing secret': { qrCodeDataUrl: 'data:image/png;base64,AAAA' },
    'an empty secret': {
      qrCodeDataUrl: 'data:image/png;base64,AAAA',
      secret: '',
    },
    'a whitespace-only QR code': { qrCodeDataUrl: '  ', secret: 'ABC' },
    'a non-string secret': {
      qrCodeDataUrl: 'data:image/png;base64,AAAA',
      secret: 123,
    },
  },
);

describeGuard(
  'isMessageResponse',
  isMessageResponse,
  {
    'an empty object': {},
    'a message': { message: 'ok' },
  },
  {
    ...NOT_OBJECTS,
    'a non-string message': { message: 5 },
  },
);
