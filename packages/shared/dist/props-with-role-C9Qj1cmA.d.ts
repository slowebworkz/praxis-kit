import { A as AnyRecord } from './any-record-CarbE-Qh.js';
import { b as KnownAriaRole } from './known-aria-roles-BIF1I0MH.js';

type AriaRole = KnownAriaRole | (string & {});

type IntrinsicProps = AnyRecord & {
    role?: AriaRole;
};

type PropsWithRole = Readonly<IntrinsicProps & {
    role: string;
}>;

export type { AriaRole as A, IntrinsicProps as I, PropsWithRole as P };
