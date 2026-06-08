import { A as AnyRecord } from '../any-record-CarbE-Qh.js';

declare function isArray<T = unknown>(value: unknown): value is T[];

declare function isBoolean(value: unknown): value is boolean;

declare function isDefined<T>(value: T | undefined): value is T;
declare function isUndefined(value: unknown): value is undefined;

declare function isFunction(value: unknown): value is (...args: unknown[]) => unknown;

declare function isNull(value: unknown): value is null;
declare function isNullish(value: unknown): value is null | undefined;

declare function isNumber(value: unknown): value is number;

declare function isObject(value: unknown): value is object;

declare function isRecord(value: unknown): value is AnyRecord;

declare function isString(value: unknown): value is string;

export { isArray, isBoolean, isDefined, isFunction, isNull, isNullish, isNumber, isObject, isRecord, isString, isUndefined };
