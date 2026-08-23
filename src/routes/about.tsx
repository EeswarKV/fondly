import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/about')({
  component: About,
})

function About() {
  return (
    <main style={{ maxWidth: 640, margin: '0 auto', padding: '4rem 1.5rem', fontFamily: 'Helvetica Neue, Arial, sans-serif' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 8, color: '#1B2A33' }}>Chocolatehouse HQ</h1>
      <p style={{ fontSize: 15, lineHeight: 1.7, color: '#4A6472' }}>
        Internal platform for the Chocolatehouse founding team — tracking roadmap progress,
        pre-launch budgets, blockers, and private notes.
      </p>
    </main>
  )
}
