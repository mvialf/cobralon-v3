import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Button } from '../button'

describe('Button', () => {
  it('debe renderizar correctamente', () => {
    render(<Button>Click me</Button>)
    expect(screen.getByRole('button', { name: /click me/i })).toBeInTheDocument()
  })

  it('debe renderizar variante default por defecto', () => {
    render(<Button>Default Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-primary')
  })

  it('debe aplicar variante destructive', () => {
    render(<Button variant="destructive">Delete</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('bg-destructive')
  })

  it('debe aplicar variante outline', () => {
    render(<Button variant="outline">Outline</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('border')
  })

  it('debe aplicar variante ghost', () => {
    render(<Button variant="ghost">Ghost</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('hover:bg-accent')
  })

  it('debe aplicar variante link', () => {
    render(<Button variant="link">Link</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('underline-offset-4')
  })

  it('debe aplicar size default por defecto', () => {
    render(<Button>Default Size</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-9')
  })

  it('debe aplicar size sm', () => {
    render(<Button size="sm">Small</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-8')
  })

  it('debe aplicar size lg', () => {
    render(<Button size="lg">Large</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('h-10')
  })

  it('debe aplicar size icon', () => {
    render(<Button size="icon">X</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('size-9')
  })

  it('debe estar deshabilitado cuando disabled es true', () => {
    render(<Button disabled>Disabled</Button>)
    const button = screen.getByRole('button')
    expect(button).toBeDisabled()
  })

  it('debe manejar onClick cuando está habilitado', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(<Button onClick={handleClick}>Click me</Button>)
    const button = screen.getByRole('button')

    await user.click(button)
    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('NO debe llamar onClick cuando está deshabilitado', async () => {
    const handleClick = vi.fn()
    const user = userEvent.setup()

    render(
      <Button onClick={handleClick} disabled>
        Disabled
      </Button>
    )
    const button = screen.getByRole('button')

    await user.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('debe funcionar como child de formulario (type submit)', () => {
    const handleSubmit = vi.fn((e) => e.preventDefault())

    render(
      <form onSubmit={handleSubmit}>
        <Button type="submit">Submit</Button>
      </form>
    )

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'submit')
  })

  it('debe poder especificar type explícitamente', () => {
    render(<Button type="button">Button</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('type', 'button')
  })

  it('debe aplicar className personalizado', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
  })

  it('debe mantener clases base al agregar className personalizado', () => {
    render(<Button className="custom-class">Custom</Button>)
    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('inline-flex')
  })

  it('debe pasar props adicionales al elemento button', () => {
    render(<Button data-testid="custom-button">Test</Button>)
    expect(screen.getByTestId('custom-button')).toBeInTheDocument()
  })
})
