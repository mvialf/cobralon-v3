import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../card'

describe('Card', () => {
  describe('Card (container principal)', () => {
    it('debe renderizar correctamente', () => {
      render(<Card data-testid="card">Content</Card>)
      expect(screen.getByTestId('card')).toBeInTheDocument()
    })

    it('debe renderizar children', () => {
      render(
        <Card>
          <div data-testid="child">Child content</div>
        </Card>
      )
      expect(screen.getByTestId('child')).toBeInTheDocument()
    })

    it('debe aplicar clases base', () => {
      render(<Card data-testid="card">Content</Card>)
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('rounded-xl')
      expect(card).toHaveClass('border')
    })

    it('debe aplicar className personalizado', () => {
      render(
        <Card className="custom-class" data-testid="card">
          Content
        </Card>
      )
      const card = screen.getByTestId('card')
      expect(card).toHaveClass('custom-class')
      expect(card).toHaveClass('rounded-xl') // Mantiene clases base
    })
  })

  describe('CardHeader', () => {
    it('debe renderizar correctamente', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      expect(screen.getByTestId('header')).toBeInTheDocument()
    })

    it('debe aplicar layout grid', () => {
      render(<CardHeader data-testid="header">Header</CardHeader>)
      const header = screen.getByTestId('header')
      expect(header).toHaveClass('grid')
      expect(header).toHaveClass('auto-rows-min')
    })
  })

  describe('CardTitle', () => {
    it('debe renderizar correctamente', () => {
      render(<CardTitle>Title Text</CardTitle>)
      expect(screen.getByText('Title Text')).toBeInTheDocument()
    })

    it('debe ser un div con data-slot', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveAttribute('data-slot', 'card-title')
      expect(title.tagName).toBe('DIV')
    })

    it('debe aplicar estilos de tipografía', () => {
      render(<CardTitle data-testid="title">Title</CardTitle>)
      const title = screen.getByTestId('title')
      expect(title).toHaveClass('font-semibold')
    })
  })

  describe('CardDescription', () => {
    it('debe renderizar correctamente', () => {
      render(<CardDescription>Description text</CardDescription>)
      expect(screen.getByText('Description text')).toBeInTheDocument()
    })

    it('debe ser un div con data-slot', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc.tagName).toBe('DIV')
      expect(desc).toHaveAttribute('data-slot', 'card-description')
    })

    it('debe aplicar estilos muted', () => {
      render(<CardDescription data-testid="desc">Description</CardDescription>)
      const desc = screen.getByTestId('desc')
      expect(desc).toHaveClass('text-muted-foreground')
    })
  })

  describe('CardContent', () => {
    it('debe renderizar correctamente', () => {
      render(<CardContent data-testid="content">Content</CardContent>)
      expect(screen.getByTestId('content')).toBeInTheDocument()
    })

    it('debe renderizar children', () => {
      render(
        <CardContent>
          <p data-testid="paragraph">Paragraph content</p>
        </CardContent>
      )
      expect(screen.getByTestId('paragraph')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('debe renderizar correctamente', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      expect(screen.getByTestId('footer')).toBeInTheDocument()
    })

    it('debe aplicar flex layout', () => {
      render(<CardFooter data-testid="footer">Footer</CardFooter>)
      const footer = screen.getByTestId('footer')
      expect(footer).toHaveClass('flex')
    })
  })

  describe('Composición completa', () => {
    it('debe renderizar Card con todos los subcomponentes', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Card Title</CardTitle>
            <CardDescription>Card Description</CardDescription>
          </CardHeader>
          <CardContent>
            <p>Main content here</p>
          </CardContent>
          <CardFooter>
            <button>Action</button>
          </CardFooter>
        </Card>
      )

      expect(screen.getByText('Card Title')).toBeInTheDocument()
      expect(screen.getByText('Card Description')).toBeInTheDocument()
      expect(screen.getByText('Main content here')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /action/i })).toBeInTheDocument()
    })

    it('debe permitir composición flexible', () => {
      render(
        <Card>
          <CardHeader>
            <CardTitle>Only Title</CardTitle>
          </CardHeader>
          <CardContent>Content without footer</CardContent>
        </Card>
      )

      expect(screen.getByText('Only Title')).toBeInTheDocument()
      expect(screen.getByText('Content without footer')).toBeInTheDocument()
    })

    it('debe permitir Card sin header', () => {
      render(
        <Card>
          <CardContent>Direct content</CardContent>
        </Card>
      )

      expect(screen.getByText('Direct content')).toBeInTheDocument()
    })
  })
})
