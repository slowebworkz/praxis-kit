export { K as KNOWN_ARIA_ROLES, a as KNOWN_ARIA_ROLES_SET, b as KnownAriaRole } from '../known-aria-roles-BIF1I0MH.js';

declare const GLOBAL_ARIA_ATTRIBUTES: ReadonlySet<string>;

declare const IMPLICIT_ROLE_RECORD: {
    readonly article: "article";
    readonly aside: "complementary";
    readonly footer: "contentinfo";
    readonly header: "banner";
    readonly main: "main";
    readonly nav: "navigation";
    readonly button: "button";
    readonly a: "link";
    readonly select: "listbox";
    readonly h1: "heading";
    readonly h2: "heading";
    readonly h3: "heading";
    readonly h4: "heading";
    readonly h5: "heading";
    readonly h6: "heading";
    readonly ul: "list";
    readonly ol: "list";
    readonly li: "listitem";
    readonly table: "table";
    readonly tr: "row";
    readonly td: "cell";
    readonly th: "columnheader";
};
declare const STRONG_ROLES: readonly ["main", "navigation", "complementary", "contentinfo", "banner"];
declare const STANDALONE_ROLES: readonly ["article"];
declare const STRONG_ROLES_SET: ReadonlySet<string>;
declare const STANDALONE_ROLES_SET: ReadonlySet<string>;

declare const ROLE_RESTRICTED_ATTRIBUTES: ReadonlyMap<string, ReadonlySet<string>>;

export { GLOBAL_ARIA_ATTRIBUTES, IMPLICIT_ROLE_RECORD, ROLE_RESTRICTED_ATTRIBUTES, STANDALONE_ROLES, STANDALONE_ROLES_SET, STRONG_ROLES, STRONG_ROLES_SET };
