<script setup lang="ts">
import { h } from 'vue'
import { Button } from './button/button'
import { Box } from './box/box'
import { Tabs } from './tabs/index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const C = (c: unknown): any => c
</script>

<template>
  <div style="font-family: sans-serif; max-width: 640px; margin: 2rem auto; padding: 0 1rem">
    <h1 style="font-size: 1.25rem; font-weight: 700; margin-bottom: 2rem">
      praxis-ui · Vue examples
    </h1>

    <section style="margin-bottom: 2rem">
      <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
        Box — Tailwind layout pipeline
      </h2>
      <component
        :is="C(Box)"
        :flex="true"
        direction="row"
        gap="md"
        align="center"
        style="padding: 1rem; background: #f9fafb; border-radius: 6px"
      >
        <div style="width: 40px; height: 40px; background: #3b82f6; border-radius: 4px" />
        <div style="width: 40px; height: 40px; background: #10b981; border-radius: 4px" />
        <div style="width: 40px; height: 40px; background: #f59e0b; border-radius: 4px" />
      </component>
    </section>

    <section style="margin-bottom: 2rem">
      <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
        Button — variants + presets
      </h2>
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap">
        <component :is="C(Button)" intent="primary">Primary</component>
        <component :is="C(Button)" intent="secondary">Secondary</component>
        <component :is="C(Button)" intent="ghost">Ghost</component>
        <component :is="C(Button)" variantKey="cta">CTA preset</component>
        <component :is="C(Button)" variantKey="subtle">Subtle preset</component>
      </div>
    </section>

    <section style="margin-bottom: 2rem">
      <h2 style="font-size: 1rem; font-weight: 600; margin-bottom: 0.75rem; color: #374151">
        Tabs — compound component
      </h2>
      <component :is="C(Tabs.Root)" default-value="profile">
        <component :is="C(Tabs.List)">
          <component :is="C(Tabs.Trigger)" value="profile">Profile</component>
          <component :is="C(Tabs.Trigger)" value="settings">Settings</component>
          <component :is="C(Tabs.Trigger)" value="billing">Billing</component>
          <component :is="C(Tabs.Indicator)" />
        </component>
        <component :is="C(Tabs.Content)" value="profile">
          <p>Your profile information goes here.</p>
        </component>
        <component :is="C(Tabs.Content)" value="settings">
          <p>Application settings go here.</p>
        </component>
        <component :is="C(Tabs.Content)" value="billing">
          <p>Billing and subscription details go here.</p>
        </component>
      </component>
    </section>
  </div>
</template>
