declare const config: ({
    files: string[];
    name?: string;
    rules?: object;
} | {
    files: string[];
    languageOptions: {
        parserOptions: {
            projectService: {
                allowDefaultProject: string[];
            };
        };
    };
    rules: {
        '@typescript-eslint/consistent-type-exports': ["error", {
            fixMixedExportsWithInlineTypeSpecifier: boolean;
        }];
    };
})[];
export default config;
//# sourceMappingURL=typescript.d.ts.map