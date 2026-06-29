export enum DiagnosticCode {
  // Composition / children
  MissingRequiredChild = 'COMP1001',
  InvalidParent = 'COMP1002',
  InvalidChild = 'COMP1003',

  // ARIA
  MissingAriaRelationship = 'ARIA2001',

  // HTML
  InvalidHeadingHierarchy = 'HTML3001',

  // Rendering
  InvalidRenderingTarget = 'RENDER4001',

  // Internal
  InternalError = 'INTERNAL9000',
}
