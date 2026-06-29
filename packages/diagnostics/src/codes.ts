export enum DiagnosticCode {
  // Composition / children
  MissingRequiredChild = 'COMP1001',
  InvalidParent = 'COMP1002',
  InvalidChild = 'COMP1003',
  UnexpectedChild = 'COMP1004',
  AmbiguousChild = 'COMP1005',
  CardinalityMin = 'COMP1006',
  CardinalityMax = 'COMP1007',
  PositionViolation = 'COMP1008',
  AllowedAsViolation = 'COMP1009',

  // Slot protocol
  SlotExclusive = 'SLOT1001',
  SlotSingleChild = 'SLOT1002',
  SlotDiscardedChildren = 'SLOT1003',
  SlotRenderFn = 'SLOT1004',

  // ARIA
  MissingAriaRelationship = 'ARIA2001',
  AriaViolation = 'ARIA2002',

  // HTML
  InvalidHeadingHierarchy = 'HTML3001',

  // Rendering
  InvalidRenderingTarget = 'RENDER4001',

  // Internal
  InternalError = 'INTERNAL9000',
}
