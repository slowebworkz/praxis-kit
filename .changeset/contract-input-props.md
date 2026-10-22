---
'praxis-kit': minor
---

Add `ContractInputProps<T, Mode>` to the React and Preact adapters: the strict, unflattened counterpart to `ContractProps`. It describes the component's own call signature (mutually exclusive plugin props such as `flex`/`grid` stay exclusive), so a value annotated with it can be spread back into the component, which a flattened `ContractProps` value cannot.
