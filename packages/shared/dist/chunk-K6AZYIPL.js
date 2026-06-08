import {
  GLOBAL_ARIA_ATTRIBUTES,
  IMPLICIT_ROLE_RECORD,
  KNOWN_ARIA_ROLES_SET,
  ROLE_RESTRICTED_ATTRIBUTES,
  STANDALONE_ROLES_SET,
  STRONG_ROLES_SET
} from "./chunk-XAYPESEI.js";
import {
  isUndefined
} from "./chunk-IVRDE7BY.js";
import {
  isString
} from "./chunk-BF772XIC.js";

// src/guards/aria/has-role.ts
function hasRole(props) {
  return isString(props.role);
}

// src/guards/aria/is-aria-attribute.ts
function isGlobalAriaAttribute(attr) {
  return GLOBAL_ARIA_ATTRIBUTES.has(attr);
}
function isAriaAttributeValidForRole(attr, role) {
  const allowedRoles = ROLE_RESTRICTED_ATTRIBUTES.get(attr);
  if (isUndefined(allowedRoles)) return true;
  if (isUndefined(role)) return false;
  return allowedRoles.has(role);
}

// src/guards/aria/is-aria-role.ts
function isStrongImplicitRole(tag) {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false;
  return STRONG_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag]);
}
function isStandaloneTag(tag) {
  if (!(tag in IMPLICIT_ROLE_RECORD)) return false;
  return STANDALONE_ROLES_SET.has(IMPLICIT_ROLE_RECORD[tag]);
}

// src/guards/aria/is-invalid.ts
function isInvalid(result) {
  return result.valid === false;
}

// src/guards/aria/is-known-aria-role.ts
function isKnownAriaRole(value) {
  return isString(value) && KNOWN_ARIA_ROLES_SET.has(value);
}

export {
  hasRole,
  isGlobalAriaAttribute,
  isAriaAttributeValidForRole,
  isStrongImplicitRole,
  isStandaloneTag,
  isInvalid,
  isKnownAriaRole
};
