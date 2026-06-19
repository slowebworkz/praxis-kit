import type { JSX } from 'solid-js'
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

function Section(props: { title: string; children: JSX.Element }) {
  return (
    <section style={{ 'margin-bottom': '2rem' }}>
      <h2
        style={{
          'font-size': '1rem',
          'font-weight': 600,
          'margin-bottom': '0.75rem',
          color: '#374151',
        }}
      >
        {props.title}
      </h2>
      {props.children}
    </section>
  )
}

export function App() {
  return (
    <div
      style={{
        'font-family': 'sans-serif',
        'max-width': '640px',
        margin: '2rem auto',
        padding: '0 1rem',
      }}
    >
      <h1 style={{ 'font-size': '1.25rem', 'font-weight': 700, 'margin-bottom': '2rem' }}>
        praxis-kit · Solid examples
      </h1>

      <Section title="Box — Tailwind layout pipeline">
        <BoxC
          flex
          direction="row"
          gap="md"
          align="center"
          style={{ padding: '1rem', background: '#f9fafb', 'border-radius': '6px' }}
        >
          <div
            style={{ width: '40px', height: '40px', background: '#3b82f6', 'border-radius': '4px' }}
          />
          <div
            style={{ width: '40px', height: '40px', background: '#10b981', 'border-radius': '4px' }}
          />
          <div
            style={{ width: '40px', height: '40px', background: '#f59e0b', 'border-radius': '4px' }}
          />
        </BoxC>
      </Section>

      <Section title="Button — variants + presets">
        <div
          style={{ display: 'flex', gap: '0.5rem', 'align-items': 'center', 'flex-wrap': 'wrap' }}
        >
          <ButtonC intent="primary">Primary</ButtonC>
          <ButtonC intent="secondary">Secondary</ButtonC>
          <ButtonC intent="ghost">Ghost</ButtonC>
          <ButtonC recipe="cta">CTA preset</ButtonC>
          <ButtonC recipe="subtle">Subtle preset</ButtonC>
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
