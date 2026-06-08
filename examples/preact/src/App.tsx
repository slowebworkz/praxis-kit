import type { ComponentChildren } from 'preact'
import { Box } from './box/box'
import { Button } from './button/button'
import { Tabs } from './tabs/index'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const toC = (c: unknown): any => c

const BoxC = toC(Box)
const ButtonC = toC(Button)
const TabsRoot = toC(Tabs.Root)
const TabsList = toC(Tabs.List)
const TabsTrigger = toC(Tabs.Trigger)
const TabsContent = toC(Tabs.Content)
const TabsIndicator = toC(Tabs.Indicator)

function Section({ title, children }: { title: string; children: ComponentChildren }) {
  return (
    <section style={{ marginBottom: '2rem' }}>
      <h2 style={{ fontSize: '1rem', fontWeight: 600, marginBottom: '0.75rem', color: '#374151' }}>
        {title}
      </h2>
      {children}
    </section>
  )
}

export function App() {
  return (
    <div
      style={{ fontFamily: 'sans-serif', maxWidth: 640, margin: '2rem auto', padding: '0 1rem' }}
    >
      <h1 style={{ fontSize: '1.25rem', fontWeight: 700, marginBottom: '2rem' }}>
        praxis-kit · Preact examples
      </h1>

      <Section title="Box — Tailwind layout pipeline">
        <BoxC
          flex
          direction="row"
          gap="md"
          align="center"
          style={{ padding: '1rem', background: '#f9fafb', borderRadius: 6 }}
        >
          <div style={{ width: 40, height: 40, background: '#3b82f6', borderRadius: 4 }} />
          <div style={{ width: 40, height: 40, background: '#10b981', borderRadius: 4 }} />
          <div style={{ width: 40, height: 40, background: '#f59e0b', borderRadius: 4 }} />
        </BoxC>
      </Section>

      <Section title="Button — variants + presets">
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
          <ButtonC intent="primary">Primary</ButtonC>
          <ButtonC intent="secondary">Secondary</ButtonC>
          <ButtonC intent="ghost">Ghost</ButtonC>
          <ButtonC variantKey="cta">CTA preset</ButtonC>
          <ButtonC variantKey="subtle">Subtle preset</ButtonC>
        </div>
      </Section>

      <Section title="Tabs — compound component">
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
      </Section>
    </div>
  )
}
