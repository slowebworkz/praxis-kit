# @praxis-kit/primitive

The render primitive — the lowest layer of the stack. Tag resolution (`as`-prop dispatch), prop
merging with event chaining, the slot protocol types, and the shared type vocabulary
(`ClassPluginFactory`, capabilities, resolver and factory option types) that everything above builds
on. Zero framework dependencies.

Private workspace; nothing imports downward from here — `contract`, `styling`, `core`, and the
adapters all sit above it (enforced by `pnpm arch:validate`).

---

## Source layout

| Area         | Purpose                                                                            |
| ------------ | ---------------------------------------------------------------------------------- |
| `tag/`       | `resolveTag` — `as ?? defaultTag`, element-type narrowing helpers                  |
| `merge/`     | Prop merge with event-handler chaining                                             |
| `guards/`    | Runtime type guards shared across layers                                           |
| `types/`     | Factory options, resolver, class-plugin, capabilities, validation, ARIA rule types |
| `constants/` | Shared constants                                                                   |
| `utils/`     | Small dependency-free helpers                                                      |

When a type is needed by more than one layer (e.g. `ClassPluginFactory`, `DiagnosticInput`
consumers), it belongs here or in `@praxis-kit/diagnostics` — not duplicated per layer.

Development: `pnpm --filter @praxis-kit/primitive test`, `typecheck`, `lint`.
