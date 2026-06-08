import { ElementType, VariantMap, PresetMap, EmptyRecord, AnyRecord, FactoryOptions, IntrinsicTag, PolymorphicGenerics, DefaultOf, PropsOf, VariantProps, VariantsOf, ClassName, PresetOf } from '@praxis-ui/core';
import { ComponentType, PropsWithChildren, ReactElement, JSX, Ref, ReactNode } from 'react';
import { Simplify } from 'type-fest';

type UnknownProps = Record<string, unknown>;
type SlotComponent = ComponentType<UnknownProps>;

/**
 * Props passed to the `render` callback — the component's resolved className,
 * filtered own props, and ref. Spread these onto the target element.
 *
 * Typed loosely to accommodate any element tag the user chooses.
 */
type RenderCallbackProps = Readonly<Record<string, unknown>>;

/**
 * Extends FactoryOptions with React-specific configuration.
 * slotComponent is intentionally not in core — it is a React rendering concern.
 */
type ReactFactoryOptions<TDefault extends ElementType, Props extends UnknownProps, Variants extends Readonly<VariantMap>, TPreset extends PresetMap<Variants> = Readonly<EmptyRecord>, TPluginProps extends AnyRecord = EmptyRecord> = FactoryOptions<TDefault, Props, Variants, TPreset, TPluginProps> & {
    /** Component used to render the asChild slot. Defaults to the built-in Slot. */
    slotComponent?: SlotComponent;
    /**
     * Return true for any prop key that should be consumed but not forwarded to the DOM.
     * The adapter strips nothing by default — implementations decide what is safe to drop.
     * Receives `runtime.options.variantKeys` as a convenience if needed.
     */
    filterProps?: (key: string, variantKeys: ReadonlySet<string>) => boolean;
};

type SlottableProps = PropsWithChildren;
declare function Slottable({ children }: SlottableProps): ReactElement;

/** Maps a core ElementType to its DOM instance type for ref inference. */
type ElementRef<T extends ElementType> = T extends IntrinsicTag ? HTMLElementTagNameMap[T] : unknown;
/** @internal React JSX intrinsic props for a given element type. */
type IntrinsicJSXProps<T extends ElementType> = T extends IntrinsicTag ? JSX.IntrinsicElements[T] : UnknownProps;
/**
 * @internal
 * Removes index signatures (e.g. `[key: string]: T`) from a type, keeping only
 * explicitly named properties. Used to prevent fallback-to-constraint generics
 * like `Record<string, unknown>` or `Readonly<VariantMap>` from producing a
 * `[key: string]: T` member that makes `keyof` resolve to `string` — which
 * would cause `Omit<IntrinsicJSXProps<TAs>, string>` to remove all HTML props.
 */
type StripIndexSignature<T> = {
    [K in keyof T as string extends K ? never : K]: T[K];
};
/**
 * @internal
 * Control props owned by the polymorphic system. Separated so they can be
 * stripped from the intrinsic props via Omit before intersecting, which is
 * what lets TypeScript infer TAs from the `as` prop value.
 *
 * `asChild` and `children` are excluded — they are typed separately in the
 * discriminated union below so the slot and non-slot branches can enforce
 * different child constraints.
 *
 * `StripIndexSignature` is applied to `PropsOf<G>` and `VariantProps` so that
 * when TypeScript falls back to the constraint bound for an unresolved generic
 * (`Record<string, unknown>` or `Readonly<VariantMap>`), the resulting index
 * signature does not propagate into `keyof ControlProps` and collapse the Omit.
 */
type ControlProps<G extends PolymorphicGenerics, TAs extends ElementType> = StripIndexSignature<PropsOf<G>> & StripIndexSignature<VariantProps<VariantsOf<G>>> & {
    as?: TAs;
    className?: ClassName | undefined;
    variantKey?: keyof PresetOf<G>;
    ref?: Ref<ElementRef<TAs>>;
};
/**
 * @internal
 * Intrinsic HTML attributes merged with control props, with `children` removed
 * so each branch of the discriminated union can type it independently.
 */
type SharedProps<G extends PolymorphicGenerics, TAs extends ElementType> = Omit<IntrinsicJSXProps<TAs>, keyof ControlProps<G, TAs> | 'children'> & ControlProps<G, TAs>;
/**
 * Props for the normal (non-slot) render path. `asChild` is absent or `false`;
 * `children` accepts any `ReactNode`.
 *
 * HTML attributes are inferred from `TAs`, merged with component-defined `Props`
 * and `Variants`. Control props win on key conflicts. `Omit + intersection` is used
 * instead of `Merge` so TypeScript can infer `TAs` from the `as` prop value.
 */
type PolymorphicProps<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<SharedProps<G, TAs> & {
    asChild?: false;
    children?: ReactNode | undefined;
}>;
/**
 * Props for the slot render path (`asChild: true`). One or more `ReactElement`
 * children are required. Multiple children are permitted for the Slottable
 * sibling pattern where one child is a `<Slottable>` wrapper.
 *
 * `as` is forbidden — combining `as` with `asChild` is a runtime invariant
 * violation, so it is rejected at the type level too.
 */
type PolymorphicWithAsChild<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<SharedProps<G, TAs> & {
    asChild: true;
    as?: never;
    children: ReactElement | ReactElement[];
}>;
/**
 * Props for the render-prop path. The `render` callback receives all resolved
 * props (className, ref, filtered component props) and returns the target element.
 * Spread the callback argument onto the element you want to receive the resolved
 * styles and attributes.
 *
 * This is the output form for the compile-time `asChild` transform: keeps the
 * same rendering flexibility as `asChild` without the `cloneElement` cost at
 * runtime. Unlike `asChild`, the render callback does not auto-merge conflicting
 * event handlers — spread position determines precedence.
 *
 * ```tsx
 * <Button render={(p) => <a href="/home" {...p} />} size="lg" />
 * ```
 */
type PolymorphicWithRender<G extends PolymorphicGenerics, TAs extends ElementType = DefaultOf<G>> = Simplify<Omit<SharedProps<G, TAs>, 'children'> & {
    render: (props: RenderCallbackProps) => ReactElement;
    asChild?: never;
    children?: never;
}>;
/**
 * A polymorphic component that infers HTML attributes and ref type from the `as` prop.
 *
 * Three call signatures form a discriminated union:
 * - `render` present       → render-prop path; no Slot or cloneElement at runtime
 * - `asChild: true`        → slot path; exactly one `ReactElement` child required
 * - `asChild?: false`      → normal path; any `ReactNode` children accepted
 */
type PolymorphicComponent<G extends PolymorphicGenerics> = {
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithRender<G, TAs>): ReactElement;
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicWithAsChild<G, TAs>): ReactElement;
    <TAs extends ElementType = DefaultOf<G>>(props: PolymorphicProps<G, TAs>): ReactElement;
    displayName?: string;
};

declare function mergeRefs<T>(...refs: (Ref<T> | null | undefined)[]): Ref<T> | null;

export { type ElementRef as E, type PolymorphicComponent as P, type ReactFactoryOptions as R, Slottable as S, type UnknownProps as U, type PolymorphicProps as a, type PolymorphicWithAsChild as b, type PolymorphicWithRender as c, type RenderCallbackProps as d, type SlottableProps as e, mergeRefs as m };
