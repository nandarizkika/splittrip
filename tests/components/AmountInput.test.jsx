import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import AmountInput from '../../src/components/AmountInput'

describe('AmountInput', () => {
  it('displays dot-formatted value', () => {
    render(<AmountInput value={1500000} onChange={() => {}} />)
    expect(screen.getByDisplayValue('1.500.000')).toBeInTheDocument()
  })

  it('calls onChange with parsed numeric value', () => {
    const onChange = vi.fn()
    render(<AmountInput value={0} onChange={onChange} />)
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '300000' } })
    expect(onChange).toHaveBeenCalledWith(300000)
  })
})
