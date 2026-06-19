import type { RecipeTarget, VariantMap } from '../variants'

export interface RecipeOptions<TVariants extends VariantMap = VariantMap> {
  recipeMap?: Record<string, RecipeTarget<TVariants>>
}
