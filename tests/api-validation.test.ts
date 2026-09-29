import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isAccessTokenResponse,
  isAuthUser,
  isLoginHistoryItem,
  isLoginHistoryItemArray,
  isMessageResponse,
  isSessionItem,
  isSessionItemArray,
  isTwoFactorRequiredResponse,
  isTwoFactorSetupResponse,
  isUserIdentity,
} from '../src/auth/contracts.ts';
import {
  isAdminUser,
  isAdminUserArray,
  isPermissionItem,
  isPermissionItemArray,
  isRoleItem,
  isRoleItemArray,
  isRoleSummary,
  isRoleSummaryArray,
  isUserAccess,
} from '../src/auth/authorization-contracts.ts';
import {
  InvalidApiResponseError,
  isArrayOf,
  isRecord,
  parseResponse,
} from '../src/api/validation.ts';

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
  'a boolean': true,
};

// Values that are never a valid API array.
const NOT_ARRAYS: Cases = {
  null: null,
  undefined: undefined,
  'a string': 'x',
  'a number': 1,
  'a plain object': {},
  'a boolean': false,
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
  hasPassword: true,
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

const loginHistoryItem = {
  id: 'h1',
  userId: 'u1',
  ipAddress: '127.0.0.1',
  userAgent: 'Mozilla/5.0',
  success: false,
  failureReason: 'Invalid credentials',
  createdAt: DATE,
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
    'a null token': { accessToken: null },
    'a string twoFactorRequired flag': {
      accessToken: 'tok',
      twoFactorRequired: 'false',
    },
    'a null twoFactorRequired flag': {
      accessToken: 'tok',
      twoFactorRequired: null,
    },
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
    'a challenge with a positive lifetime': {
      twoFactorRequired: true,
      expiresIn: 120,
    },
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
    'twoFactorRequired with an empty token': {
      twoFactorRequired: true,
      accessToken: '',
    },
    'twoFactorRequired with a null token': {
      twoFactorRequired: true,
      accessToken: null,
    },
    'a zero lifetime': { twoFactorRequired: true, expiresIn: 0 },
    'a negative lifetime': { twoFactorRequired: true, expiresIn: -1 },
    'a string lifetime': { twoFactorRequired: true, expiresIn: '120' },
    'a null lifetime': { twoFactorRequired: true, expiresIn: null },
    'an infinite lifetime': { twoFactorRequired: true, expiresIn: Infinity },
    'a non-number lifetime': { twoFactorRequired: true, expiresIn: NaN },
  },
);

// --- Current user -----------------------------------------------------------

describeGuard(
  'isUserIdentity',
  isUserIdentity,
  {
    'identity fields without password or two-factor state': adminUser,
    'a current user identity': authUser,
    'an identity without optional names': {
      id: 'u1',
      email: 'ada@example.com',
      isEmailVerified: false,
      createdAt: DATE,
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing email': { ...adminUser, email: undefined },
    'a null id': { ...adminUser, id: null },
    'a non-boolean verification flag': { ...adminUser, isEmailVerified: 1 },
    'a non-string lastName': { ...adminUser, lastName: {} },
    'a missing creation date': { ...adminUser, createdAt: undefined },
    'a Date instead of a JSON date string': { ...adminUser, createdAt: new Date(DATE) },
  },
);

describeGuard(
  'isAuthUser',
  isAuthUser,
  {
    'a full user': authUser,
    'an OAuth-only user with no password': { ...authUser, hasPassword: false },
    'a user without optional fields': {
      id: 'u1',
      email: 'ada@example.com',
      isEmailVerified: false,
      isTwoFactorEnabled: true,
      hasPassword: false,
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
    'a missing hasPassword': { ...authUser, hasPassword: undefined },
    'a null hasPassword': { ...authUser, hasPassword: null },
    'a string hasPassword': { ...authUser, hasPassword: 'false' },
    'a numeric hasPassword': { ...authUser, hasPassword: 1 },
    'a null isTwoFactorEnabled': { ...authUser, isTwoFactorEnabled: null },
    'an invalid Google identifier': { ...authUser, googleId: {} },
    'an invalid GitHub identifier': { ...authUser, githubId: 42 },
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
    'a null permission': { userId: 'u1', roles: [], permissions: [null] },
    'an object in roles': { userId: 'u1', roles: [{ name: 'admin' }], permissions: [] },
    'missing permissions': { userId: 'u1', roles: [] },
    'null roles': { userId: 'u1', roles: null, permissions: [] },
    'sparse roles': { userId: 'u1', roles: new Array<unknown>(1), permissions: [] },
    'sparse permissions': { userId: 'u1', roles: [], permissions: new Array<unknown>(1) },
  },
);

// --- Admin: users -----------------------------------------------------------

describeGuard(
  'isAdminUser',
  isAdminUser,
  {
    'an admin user without current-user password state': adminUser,
    'an admin user with nullable names': { ...adminUser, lastName: null },
  },
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
    'a nested array': [[adminUser]],
    'a sparse array': new Array<unknown>(1),
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
    'a nested array': [[permission]],
    'a sparse array': new Array<unknown>(1),
  },
);

describeGuard(
  'isRoleSummary',
  isRoleSummary,
  {
    'a role without loaded permissions': { id: 'r1', name: 'admin' },
    'a role with a nullable description': { id: 'r1', name: 'admin', description: null },
    'a role with a description': { id: 'r1', name: 'admin', description: 'Administrators' },
  },
  {
    ...NOT_OBJECTS,
    'a missing id': { name: 'admin' },
    'a non-string name': { id: 'r1', name: 1 },
    'a non-string description': { id: 'r1', name: 'admin', description: [] },
  },
);

describeGuard(
  'isRoleSummaryArray',
  isRoleSummaryArray,
  {
    'an empty array': [],
    'roles without loaded permissions': [{ id: 'r1', name: 'admin' }],
  },
  {
    ...NOT_ARRAYS,
    'an invalid member': [{ id: 'r1', name: 'admin' }, { id: 'r2' }],
    'a nested array': [[{ id: 'r1', name: 'admin' }]],
    'a sparse array': new Array<unknown>(1),
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
    'missing rolePermissions': { ...role, rolePermissions: undefined },
    'null rolePermissions': { ...role, rolePermissions: null },
    'sparse rolePermissions': { ...role, rolePermissions: new Array<unknown>(1) },
    'a null rolePermission': { ...role, rolePermissions: [null] },
    'a rolePermission without its identifier': {
      ...role,
      rolePermissions: [{ permission }],
    },
    'a rolePermission with a numeric identifier': {
      ...role,
      rolePermissions: [{ permissionId: 1, permission }],
    },
    'a rolePermission without a permission': {
      ...role,
      rolePermissions: [{ permissionId: 'p1' }],
    },
    'a rolePermission with an invalid permission': {
      ...role,
      rolePermissions: [{ permissionId: 'p1', permission: { id: 'p1' } }],
    },
    'a rolePermission with a null permission': {
      ...role,
      rolePermissions: [{ permissionId: 'p1', permission: null }],
    },
    'a nested permission with an invalid optional description': {
      ...role,
      rolePermissions: [{ permissionId: 'p1', permission: { ...permission, description: 7 } }],
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
    'a nested array': [[role]],
    'a sparse array': new Array<unknown>(1),
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
    'a null createdAt': { ...session, createdAt: null },
    'a Date instead of a JSON date string': { ...session, expiresAt: new Date(DATE) },
    'a non-string user agent': { ...session, userAgent: [] },
    'a non-string IP address': { ...session, ipAddress: 123 },
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
    'a nested array': [[session]],
    'a sparse array': new Array<unknown>(1),
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
    'a whitespace-only secret': { qrCodeDataUrl: 'data:image/png;base64,AAAA', secret: ' \t ' },
    'a null QR code': { qrCodeDataUrl: null, secret: 'ABC' },
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
    'a null message': { message: null },
    'an array of messages': { message: ['error'] },
  },
);

// --- Login history ---------------------------------------------------------

describeGuard(
  'isLoginHistoryItem',
  isLoginHistoryItem,
  {
    'a failed login event': loginHistoryItem,
    'a successful event with nullable metadata': {
      ...loginHistoryItem,
      success: true,
      ipAddress: null,
      userAgent: null,
      failureReason: null,
    },
  },
  {
    ...NOT_OBJECTS,
    'a missing id': { ...loginHistoryItem, id: undefined },
    'a non-string id': { ...loginHistoryItem, id: 42 },
    'a missing userId': { ...loginHistoryItem, userId: undefined },
    'a null userId': { ...loginHistoryItem, userId: null },
    'a missing success flag': { ...loginHistoryItem, success: undefined },
    'a string success flag': { ...loginHistoryItem, success: 'false' },
    'a null success flag': { ...loginHistoryItem, success: null },
    'a missing IP address': { ...loginHistoryItem, ipAddress: undefined },
    'a numeric IP address': { ...loginHistoryItem, ipAddress: 127 },
    'a missing user agent': { ...loginHistoryItem, userAgent: undefined },
    'an object user agent': { ...loginHistoryItem, userAgent: {} },
    'a missing failure reason': { ...loginHistoryItem, failureReason: undefined },
    'an array failure reason': { ...loginHistoryItem, failureReason: ['invalid'] },
    'a missing creation date': { ...loginHistoryItem, createdAt: undefined },
    'a null creation date': { ...loginHistoryItem, createdAt: null },
    'an unparseable creation date': { ...loginHistoryItem, createdAt: 'yesterday' },
    'a Date instead of a JSON date string': { ...loginHistoryItem, createdAt: new Date(DATE) },
  },
);

describeGuard(
  'isLoginHistoryItemArray',
  isLoginHistoryItemArray,
  {
    'an empty history': [],
    'multiple login events': [loginHistoryItem, { ...loginHistoryItem, id: 'h2', success: true, failureReason: null }],
  },
  {
    ...NOT_ARRAYS,
    'an invalid event': [loginHistoryItem, { id: 'h2' }],
    'a null event': [loginHistoryItem, null],
    'a nested array': [[loginHistoryItem]],
    'a sparse array': new Array<unknown>(1),
  },
);

// --- Validation boundary ---------------------------------------------------

describeGuard(
  'isRecord',
  isRecord,
  { 'an empty object': {}, 'a response object': { accessToken: 'tok' } },
  NOT_OBJECTS,
);

describe('isArrayOf', () => {
  it('accepts empty and valid arrays', () => {
    assert.equal(isArrayOf([], isAuthUser), true);
    assert.equal(isArrayOf([authUser], isAuthUser), true);
  });

  it('rejects a malformed later element and sparse arrays', () => {
    assert.equal(isArrayOf([authUser, { id: 'u2' }], isAuthUser), false);
    assert.equal(isArrayOf(new Array<unknown>(1), isAuthUser), false);
  });
});

describe('parseResponse', () => {
  it('returns the validated object without replacing it', () => {
    assert.strictEqual(parseResponse(authUser, isAuthUser), authUser);
  });

  it('returns the validated array without replacing it', () => {
    const history = [loginHistoryItem];
    assert.strictEqual(parseResponse(history, isLoginHistoryItemArray), history);
  });

  it('rejects a malformed response without leaking its contents', () => {
    const confidentialResponse = {
      accessToken: 'sensitive-access-token',
      email: 'private@example.com',
      password: 'sensitive-password',
      twoFactorRequired: true,
    };

    assert.throws(
      () => parseResponse(confidentialResponse, isAccessTokenResponse),
      (error: unknown) => {
        assert.ok(error instanceof InvalidApiResponseError);
        const exposedError = `${String(error)} ${JSON.stringify(error)}`;
        for (const secret of ['sensitive-access-token', 'private@example.com', 'sensitive-password']) {
          assert.equal(exposedError.includes(secret), false);
        }
        return true;
      },
    );
  });
});
