<script lang="ts">
  // Fixture: a plain Svelte component usable as a component-reference `as` target in tests
  // (`<Polymorphic {bundle} as={InnerButton} />`). Spreads whatever props it's handed onto a real
  // `<button>`, so a test can assert the outer bundle's resolved classes/attrs reached it.
  let { children, ...rest }: Record<string, unknown> = $props()
</script>

<button data-testid="inner" {...rest}>
  {@render (children as (() => unknown) | undefined)?.()}
</button>
