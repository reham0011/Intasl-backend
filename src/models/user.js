// Central place for role constants & helpers.
// We're using MongoDB's native driver (no Mongoose schema), so this
// file just centralizes role logic so it's consistent everywhere.

export const ROLES = {
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  MODERATOR: "moderator",
  USER: "user",
};

export const ROLE_HIERARCHY = {
  [ROLES.SUPER_ADMIN]: 4,
  [ROLES.ADMIN]: 3,
  [ROLES.MODERATOR]: 2,
  [ROLES.USER]: 1,
};

// True if `role` is at least as powerful as `minRole`
export function hasMinimumRole(role, minRole) {
  return (ROLE_HIERARCHY[role] || 0) >= (ROLE_HIERARCHY[minRole] || 0);
}

// Used on registration — never trust client input for this
export function defaultAccountRole() {
  return ROLES.USER;
}

// Builds the safe, public-facing shape of a user's role info
export function toPublicRole(user) {
  return {
    accountRole: user.accountRole || ROLES.USER,
    isAdmin: [ROLES.ADMIN, ROLES.SUPER_ADMIN].includes(user.accountRole),
    isSuperAdmin: user.accountRole === ROLES.SUPER_ADMIN,
    isModerator: user.accountRole === ROLES.MODERATOR,
  };
}