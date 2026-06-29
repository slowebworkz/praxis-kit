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
  AriaAttributeInvalid = 'ARIA2003',
  AriaMissingLiveRegion = 'ARIA2004',
  AriaMissingAtomic = 'ARIA2005',
  AriaRelevantInvalidToken = 'ARIA2006',
  AriaRelevantSuperseded = 'ARIA2007',
  AriaInvalidRole = 'ARIA2008',

  // HTML
  InvalidHeadingHierarchy = 'HTML3001',
  HtmlEmptyRole = 'HTML3002',
  HtmlImplicitRoleRedundant = 'HTML3003',
  HtmlImplicitRoleOverride = 'HTML3004',
  HtmlStandaloneRegionOverride = 'HTML3005',
  HtmlLandmarkRoleOverride = 'HTML3006',
  HtmlInvalidChild = 'HTML3007',

  // Rendering
  InvalidRenderingTarget = 'RENDER4001',

  // Lint (static analysis only — no runtime counterpart)
  LintDeadCompoundKey = 'LINT5001',
  LintDeadCompoundValue = 'LINT5002',
  LintDeadCompoundNonLiteral = 'LINT5003',
  LintMissingStrict = 'LINT5004',
  LintInvalidDefaultKey = 'LINT5005',
  LintInvalidDefaultValue = 'LINT5006',
  LintInvalidDefaultNonLiteral = 'LINT5007',
  LintNegativeMin = 'LINT5008',
  LintNegativeMax = 'LINT5009',
  LintMaxLessThanMin = 'LINT5010',
  LintZeroMax = 'LINT5011',
  LintMultipleFirst = 'LINT5012',
  LintMultipleLast = 'LINT5013',
  LintMinSumExceedsCapacity = 'LINT5014',
  LintCardinalityViolation = 'LINT5015',
  LintAriaTagOverride = 'LINT5016',

  // Contract — configuration violations (factory-time and render-time)
  ContractUnknownVariantDim = 'COMP1010',
  ContractUnknownVariantValue = 'COMP1011',
  ContractUnknownRecipeKey = 'COMP1012',
  ContractInvalidVariantValue = 'COMP1013',

  // Tailwind / CSS pipeline
  TailwindMultipleDisplayProps = 'CSS6001',
  TailwindReservedLayoutLiteral = 'CSS6002',
  TailwindDeadVariantClass = 'CSS6003',

  // Internal
  InternalError = 'INTERNAL9000',
}
