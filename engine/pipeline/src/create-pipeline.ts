import type {
  NodeOwner,
  NodeRegistry,
  PipelineNode,
  Pipeline,
  PipelineOptions,
  Plugin,
} from './types'

function pipelineOwner(name: string): NodeOwner {
  return { kind: 'pipeline', name }
}

function pluginOwner(name: string): NodeOwner {
  return { kind: 'plugin', name }
}

function describeOwner(owner: NodeOwner): string {
  return `${owner.kind} "${owner.name}"`
}

function duplicateNodeError(pluginName: string, key: string, owner: NodeOwner): Error {
  return new Error(
    `Plugin "${pluginName}" tried to inject node "${key}", but "${key}" was already registered by ${describeOwner(owner)}.`,
  )
}

function createNodeRegistry<TContext>(options: PipelineOptions<TContext>): NodeRegistry<TContext> {
  const nodes = new Map(options.nodes)
  const owners = new Map<string, NodeOwner>()
  for (const key of nodes.keys()) {
    owners.set(key, pipelineOwner(options.name))
  }
  return { nodes, owners }
}

function injectNode<TContext>(
  registry: NodeRegistry<TContext>,
  plugin: Plugin<TContext>,
  key: string,
  node: PipelineNode<TContext>,
): void {
  const owner = registry.owners.get(key)
  if (owner) {
    throw duplicateNodeError(plugin.name, key, owner)
  }
  registry.nodes.set(key, node)
  registry.owners.set(key, pluginOwner(plugin.name))
}

function injectPlugin<TContext>(registry: NodeRegistry<TContext>, plugin: Plugin<TContext>): void {
  for (const [key, node] of plugin.nodes) {
    injectNode(registry, plugin, key, node)
  }
}

// Plugins are applied in declaration order. Key collisions throw — "inject" implies additive
// contribution only, not replacement (ADR-008). Pipeline.nodes is ReadonlyMap (compile-time) and
// the returned object is Object.freeze'd (runtime), though the Map's contents remain mutable at
// runtime via a cast. Full deep immutability is a consumer responsibility (ADR-008).
export function createPipeline<TContext>(options: PipelineOptions<TContext>): Pipeline<TContext> {
  const registry = createNodeRegistry(options)

  for (const plugin of options.plugins ?? []) {
    injectPlugin(registry, plugin)
  }

  return Object.freeze({
    name: options.name,
    strategy: options.strategy,
    merge: options.merge,
    nodes: registry.nodes,
  }) satisfies Pipeline<TContext>
}
