<script lang="ts">
  import Box from './box/Box.svelte'
  import Button from './button/Button.svelte'
  import TabsRoot from './tabs/TabsRoot.svelte'
  import TabsList from './tabs/TabsList.svelte'
  import TabsTrigger from './tabs/TabsTrigger.svelte'
  import TabsContent from './tabs/TabsContent.svelte'
  import TabsIndicator from './tabs/TabsIndicator.svelte'
</script>

<div style="font-family: sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem">
  <h1 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 2rem">
    praxis-kit · Svelte examples
  </h1>

  <section style="margin-bottom: 2rem">
    <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
      Box — Tailwind layout pipeline
    </h2>
    <Box flex direction="row" gap="md" align="center" style="padding: 1rem; background: #f9fafb; border-radius: 6px">
      <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 4px"></div>
      <div style="width: 40px; height: 40px; background: #10b981; border-radius: 4px"></div>
      <div style="width: 40px; height: 40px; background: #f59e0b; border-radius: 4px"></div>
    </Box>
  </section>

  <section style="margin-bottom: 2rem">
    <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
      Button — variants + presets
    </h2>
    <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap">
      <Button intent="primary">Primary</Button>
      <Button intent="secondary">Secondary</Button>
      <Button intent="ghost">Ghost</Button>
      <Button variantKey="cta">CTA preset</Button>
      <Button variantKey="subtle">Subtle preset</Button>
    </div>
  </section>

  <section style="margin-bottom: 2rem">
    <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
      Tabs — compound component
    </h2>
    <TabsRoot defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="settings">Settings</TabsTrigger>
        <TabsTrigger value="billing">Billing</TabsTrigger>
        <TabsIndicator />
      </TabsList>
      <TabsContent value="profile">
        <p>Your profile information goes here.</p>
      </TabsContent>
      <TabsContent value="settings">
        <p>Application settings go here.</p>
      </TabsContent>
      <TabsContent value="billing">
        <p>Billing and subscription details go here.</p>
      </TabsContent>
    </TabsRoot>
  </section>
</div>
