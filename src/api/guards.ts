// Compatibility exports for existing pages; new code imports auth contracts.
export {
  type AuthUser,
  type SessionItem,
  type TwoFactorSetupResponse,
  type MessageResponse,
  isAccessTokenResponse,
  isTwoFactorRequiredResponse,
  isAuthUser,
  isSessionItem,
  isSessionItemArray,
  isTwoFactorSetupResponse,
  isMessageResponse,
} from "../auth/contracts.ts";
export {
  type UserAccess,
  type AdminUser,
  type PermissionItem,
  type RolePermissionItem,
  type RoleItem,
  isUserAccess,
  isAdminUser,
  isAdminUserArray,
  isPermissionItem,
  isPermissionItemArray,
  isRoleItem,
  isRoleItemArray,
} from "../auth/authorization-contracts.ts";
