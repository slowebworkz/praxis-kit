import { S as Severity } from './severity-D5t9u4XZ.js';

type ValidationViolation = {
    message: string;
    tag: string;
    role: string | undefined;
    attribute: string | undefined;
    severity: Severity;
    phase: 'evaluate' | 'fix';
};

type ValidationResult = {
    props: Record<string, unknown>;
    violations: ReadonlyArray<ValidationViolation>;
};

export type { ValidationResult as V, ValidationViolation as a };
