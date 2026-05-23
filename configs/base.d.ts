declare const config: ({
    ignores: string[];
} | {
    files: string[];
    rules: Readonly<import("eslint").Linter.RulesRecord>;
    ignores?: never;
})[];
export default config;
//# sourceMappingURL=base.d.ts.map