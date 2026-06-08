import { S as Severity } from './severity-D5t9u4XZ.js';
import { Simplify } from 'type-fest';

type InvalidBase<M extends string = string> = {
    valid: false;
    severity: Severity;
    message: M;
    attribute?: string;
};
type InvalidWithFix<M extends string = string> = Simplify<InvalidBase<M> & {
    fixable: true;
}>;
type InvalidWithoutFix<M extends string = string> = Simplify<InvalidBase<M> & {
    fixable: false;
}>;
type InvalidResult<M extends string = string> = InvalidWithFix<M> | InvalidWithoutFix<M>;

type ValidResult = {
    valid: true;
};

export type { InvalidResult as I, ValidResult as V, InvalidWithFix as a, InvalidWithoutFix as b };
