import * as _typescript_eslint_utils_ts_eslint from '@typescript-eslint/utils/ts-eslint';

type Options$4 = [{
    calleeNames?: string[];
}];
type MessageIds$3 = 'multipleFirst' | 'multipleLast' | 'minSumExceedsCapacity';
declare const validChildrenConfig: _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$3, Options$4, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

type Options$3 = [{
    calleeNames?: string[];
}];
type MessageIds$2 = 'negativeMin' | 'negativeMax' | 'maxLessThanMin' | 'zeroMax';
declare const validCardinality: _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$2, Options$3, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

type Options$2 = [{
    calleeNames?: string[];
    reportNonLiteral?: boolean;
}];
type MessageIds$1 = 'unknownDefaultKey' | 'unknownDefaultValue' | 'nonLiteralValue';
declare const noInvalidDefault: _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$1, Options$2, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

type Options$1 = [{
    calleeNames?: string[];
}];
declare const noEnforcementWithoutStrict: _typescript_eslint_utils_ts_eslint.RuleModule<"missingStrict", Options$1, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

type Options = [{
    calleeNames?: string[];
    reportNonLiteral?: boolean;
}];
type MessageIds = 'unknownVariantKey' | 'unknownVariantValue' | 'nonLiteralValue';
declare const noDeadCompound: _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds, Options, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

declare const noInvalidHtmlNesting: _typescript_eslint_utils_ts_eslint.RuleModule<"invalidChild", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

declare const noRedundantRole: _typescript_eslint_utils_ts_eslint.RuleModule<"redundantRole", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
    name: string;
};

declare const plugin: {
    readonly meta: {
        readonly name: "@praxis-ui/eslint-plugin";
        readonly version: "1.0.0";
    };
    readonly rules: {
        readonly 'no-dead-compound': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds, Options, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'no-enforcement-without-strict': _typescript_eslint_utils_ts_eslint.RuleModule<"missingStrict", Options$1, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'no-invalid-default': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$1, Options$2, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'no-invalid-html-nesting': _typescript_eslint_utils_ts_eslint.RuleModule<"invalidChild", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'no-redundant-role': _typescript_eslint_utils_ts_eslint.RuleModule<"redundantRole", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'valid-cardinality': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$2, Options$3, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
        readonly 'valid-children-config': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$3, Options$4, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
            name: string;
        };
    };
    readonly configs: {};
};
declare const recommended: {
    readonly name: "@praxis-ui/recommended";
    readonly plugins: {
        readonly '@praxis-ui': {
            readonly meta: {
                readonly name: "@praxis-ui/eslint-plugin";
                readonly version: "1.0.0";
            };
            readonly rules: {
                readonly 'no-dead-compound': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds, Options, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'no-enforcement-without-strict': _typescript_eslint_utils_ts_eslint.RuleModule<"missingStrict", Options$1, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'no-invalid-default': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$1, Options$2, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'no-invalid-html-nesting': _typescript_eslint_utils_ts_eslint.RuleModule<"invalidChild", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'no-redundant-role': _typescript_eslint_utils_ts_eslint.RuleModule<"redundantRole", [], unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'valid-cardinality': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$2, Options$3, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
                readonly 'valid-children-config': _typescript_eslint_utils_ts_eslint.RuleModule<MessageIds$3, Options$4, unknown, _typescript_eslint_utils_ts_eslint.RuleListener> & {
                    name: string;
                };
            };
            readonly configs: {};
        };
    };
    readonly rules: {
        readonly '@praxis-ui/no-dead-compound': "error";
        readonly '@praxis-ui/no-enforcement-without-strict': "error";
        readonly '@praxis-ui/no-invalid-default': "error";
        readonly '@praxis-ui/no-invalid-html-nesting': "error";
        readonly '@praxis-ui/no-redundant-role': "warn";
        readonly '@praxis-ui/valid-cardinality': "error";
        readonly '@praxis-ui/valid-children-config': "error";
    };
};

export { plugin as default, noDeadCompound, noEnforcementWithoutStrict, noInvalidDefault, noInvalidHtmlNesting, noRedundantRole, plugin, recommended, validCardinality, validChildrenConfig };
