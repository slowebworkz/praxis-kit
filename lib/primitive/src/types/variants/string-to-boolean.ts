export type StringToBoolean<T> = T extends 'true' | 'false' ? boolean : T
