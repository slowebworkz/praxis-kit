export type Registry = readonly (readonly [PropertyKey, unknown])[]

export type ImplicitRoleTuple<T extends Registry> = T[number]

export type ImplicitTag<T extends Registry> = ImplicitRoleTuple<T>[0]

export type ImplicitRole<T extends Registry> = ImplicitRoleTuple<T>[1]

export type ImplicitRoleMap<T extends Registry> = {
  [K in ImplicitRoleTuple<T> as K[0]]: K[1]
}
