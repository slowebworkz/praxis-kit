import { I as IntrinsicProps, P as PropsWithRole } from '../props-with-role-C9Qj1cmA.js';
import { V as ValidResult, I as InvalidResult } from '../valid-result-CSOzaXJz.js';
import { b as KnownAriaRole } from '../known-aria-roles-BIF1I0MH.js';
import '../any-record-CarbE-Qh.js';
import '../severity-D5t9u4XZ.js';
import 'type-fest';

declare function hasRole(props: IntrinsicProps): props is PropsWithRole;

declare function isGlobalAriaAttribute(attr: string): boolean;
declare function isAriaAttributeValidForRole(attr: string, role: string | undefined): boolean;

declare function isStrongImplicitRole(tag: string): boolean;
declare function isStandaloneTag(tag: string): boolean;

type AriaResult = ValidResult | InvalidResult;
declare function isInvalid(result: AriaResult): result is InvalidResult;

declare function isKnownAriaRole(value: unknown): value is KnownAriaRole;

export { KnownAriaRole, hasRole, isAriaAttributeValidForRole, isGlobalAriaAttribute, isInvalid, isKnownAriaRole, isStandaloneTag, isStrongImplicitRole };
