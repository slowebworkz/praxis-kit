// src/constants/aria/global-aria-attributes.ts
var GLOBAL_ARIA_ATTRIBUTES = /* @__PURE__ */ new Set([
  "aria-atomic",
  "aria-busy",
  "aria-controls",
  "aria-current",
  "aria-describedby",
  "aria-details",
  "aria-disabled",
  "aria-errormessage",
  "aria-flowto",
  "aria-hidden",
  "aria-keyshortcuts",
  "aria-label",
  "aria-labelledby",
  "aria-live",
  "aria-owns",
  "aria-relevant",
  "aria-roledescription"
]);

// src/constants/aria/implicit-role-record.ts
var IMPLICIT_ROLE_RECORD = {
  article: "article",
  aside: "complementary",
  footer: "contentinfo",
  header: "banner",
  main: "main",
  nav: "navigation",
  button: "button",
  a: "link",
  select: "listbox",
  h1: "heading",
  h2: "heading",
  h3: "heading",
  h4: "heading",
  h5: "heading",
  h6: "heading",
  ul: "list",
  ol: "list",
  li: "listitem",
  table: "table",
  tr: "row",
  td: "cell",
  th: "columnheader"
};
var STRONG_ROLES = [
  "main",
  "navigation",
  "complementary",
  "contentinfo",
  "banner"
];
var STANDALONE_ROLES = ["article"];
var STRONG_ROLES_SET = new Set(STRONG_ROLES);
var STANDALONE_ROLES_SET = new Set(STANDALONE_ROLES);

// src/constants/aria/known-aria-roles.ts
var KNOWN_ARIA_ROLES = [
  "alert",
  "alertdialog",
  "application",
  "article",
  "banner",
  "blockquote",
  "button",
  "caption",
  "cell",
  "checkbox",
  "code",
  "columnheader",
  "combobox",
  "complementary",
  "contentinfo",
  "definition",
  "deletion",
  "dialog",
  "document",
  "emphasis",
  "feed",
  "figure",
  "form",
  "generic",
  "grid",
  "gridcell",
  "group",
  "heading",
  "img",
  "insertion",
  "link",
  "list",
  "listbox",
  "listitem",
  "log",
  "main",
  "marquee",
  "math",
  "menu",
  "menubar",
  "menuitem",
  "menuitemcheckbox",
  "menuitemradio",
  "meter",
  "navigation",
  "none",
  "note",
  "option",
  "paragraph",
  "presentation",
  "progressbar",
  "radio",
  "radiogroup",
  "region",
  "row",
  "rowgroup",
  "rowheader",
  "scrollbar",
  "search",
  "searchbox",
  "separator",
  "slider",
  "spinbutton",
  "status",
  "strong",
  "subscript",
  "superscript",
  "switch",
  "tab",
  "table",
  "tablist",
  "tabpanel",
  "term",
  "textbox",
  "time",
  "timer",
  "toolbar",
  "tooltip",
  "tree",
  "treegrid",
  "treeitem"
];
var KNOWN_ARIA_ROLES_SET = new Set(KNOWN_ARIA_ROLES);

// src/constants/aria/role-restricted-attributes.ts
var ROLE_RESTRICTED_ATTRIBUTES = /* @__PURE__ */ new Map([
  [
    "aria-activedescendant",
    /* @__PURE__ */ new Set([
      "application",
      "combobox",
      "grid",
      "group",
      "listbox",
      "menu",
      "menubar",
      "radiogroup",
      "spinbutton",
      "tablist",
      "toolbar",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  ["aria-autocomplete", /* @__PURE__ */ new Set(["combobox", "searchbox", "textbox"])],
  [
    "aria-checked",
    /* @__PURE__ */ new Set(["checkbox", "menuitemcheckbox", "option", "radio", "switch", "treeitem"])
  ],
  ["aria-colcount", /* @__PURE__ */ new Set(["grid", "table", "treegrid"])],
  ["aria-colindex", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "row", "rowheader"])],
  ["aria-colspan", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "rowheader"])],
  [
    "aria-expanded",
    /* @__PURE__ */ new Set([
      "button",
      "combobox",
      "gridcell",
      "listbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "row",
      "rowheader",
      "tab",
      "treeitem"
    ])
  ],
  [
    "aria-haspopup",
    /* @__PURE__ */ new Set([
      "button",
      "combobox",
      "gridcell",
      "listbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "tab",
      "treeitem"
    ])
  ],
  ["aria-level", /* @__PURE__ */ new Set(["heading", "listitem", "row", "treeitem"])],
  ["aria-modal", /* @__PURE__ */ new Set(["alertdialog", "dialog"])],
  ["aria-multiline", /* @__PURE__ */ new Set(["textbox"])],
  ["aria-multiselectable", /* @__PURE__ */ new Set(["grid", "listbox", "tablist", "tree", "treegrid"])],
  [
    "aria-orientation",
    /* @__PURE__ */ new Set(["scrollbar", "select", "separator", "slider", "tablist", "toolbar", "tree"])
  ],
  ["aria-placeholder", /* @__PURE__ */ new Set(["searchbox", "textbox"])],
  [
    "aria-posinset",
    /* @__PURE__ */ new Set([
      "article",
      "listitem",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "row",
      "tab"
    ])
  ],
  ["aria-pressed", /* @__PURE__ */ new Set(["button"])],
  [
    "aria-readonly",
    /* @__PURE__ */ new Set([
      "combobox",
      "grid",
      "gridcell",
      "listbox",
      "radiogroup",
      "slider",
      "spinbutton",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  [
    "aria-required",
    /* @__PURE__ */ new Set([
      "combobox",
      "gridcell",
      "listbox",
      "radiogroup",
      "spinbutton",
      "textbox",
      "tree",
      "treegrid"
    ])
  ],
  ["aria-rowcount", /* @__PURE__ */ new Set(["grid", "table", "treegrid"])],
  ["aria-rowindex", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "row", "rowheader"])],
  ["aria-rowspan", /* @__PURE__ */ new Set(["cell", "columnheader", "gridcell", "rowheader"])],
  [
    "aria-selected",
    /* @__PURE__ */ new Set(["columnheader", "gridcell", "option", "row", "rowheader", "tab", "treeitem"])
  ],
  [
    "aria-setsize",
    /* @__PURE__ */ new Set([
      "article",
      "listitem",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "row",
      "tab"
    ])
  ],
  ["aria-sort", /* @__PURE__ */ new Set(["columnheader", "rowheader"])],
  [
    "aria-valuemax",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuemin",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuenow",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ],
  [
    "aria-valuetext",
    /* @__PURE__ */ new Set(["meter", "progressbar", "scrollbar", "separator", "slider", "spinbutton"])
  ]
]);

export {
  GLOBAL_ARIA_ATTRIBUTES,
  IMPLICIT_ROLE_RECORD,
  STRONG_ROLES,
  STANDALONE_ROLES,
  STRONG_ROLES_SET,
  STANDALONE_ROLES_SET,
  KNOWN_ARIA_ROLES,
  KNOWN_ARIA_ROLES_SET,
  ROLE_RESTRICTED_ATTRIBUTES
};
