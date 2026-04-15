import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import NameChip from '../../src/components/NameChip'

describe('NameChip', () => {
  it('renders the name', () => {
    render(<NameChip name="Nanda" selected={false} onToggle={() => {}} />)
    expect(screen.getByText('Nanda')).toBeInTheDocument()
  })

  it('calls onToggle when clicked', () => {
    const onToggle = vi.fn()
    render(<NameChip name="Nanda" selected={false} onToggle={onToggle} />)
    fireEvent.click(screen.getByText('Nanda'))
    expect(onToggle).toHaveBeenCalledOnce()
  })

  it('shows checkmark when selected', () => {
    render(<NameChip name="Nanda" selected={true} onToggle={() => {}} />)
    expect(screen.getByText('✓')).toBeInTheDocument()
  })
})
