<script lang="ts">
  import TabsRoot from './TabsRoot.svelte'
  import TabsList from './TabsList.svelte'
  import TabsTrigger from './TabsTrigger.svelte'
  import TabsContent from './TabsContent.svelte'
  import TabsIndicator from './TabsIndicator.svelte'

  interface Props {
    defaultValue?: string
    value?: string
    onValueChange?: (v: string) => void
    showIndicator?: boolean
  }

  let { defaultValue = 'a', value, onValueChange, showIndicator = false }: Props = $props()
</script>

<TabsRoot {defaultValue} {value} {onValueChange}>
  <TabsList>
    <TabsTrigger value="a">Tab A</TabsTrigger>
    <TabsTrigger value="b">Tab B</TabsTrigger>
    {#if showIndicator}
      <TabsIndicator />
    {/if}
  </TabsList>
  <TabsContent value="a">Panel A</TabsContent>
  <TabsContent value="b">Panel B</TabsContent>
</TabsRoot>
