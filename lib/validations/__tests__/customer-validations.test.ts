import { describe, it, expect } from 'vitest'
import { customerSchema, type CustomerFormData } from '../customer-validations'

describe('customerSchema', () => {
  const validCustomer: CustomerFormData = {
    name: 'Juan Pérez',
    phone: '+56912345678',
    email: 'juan@example.com',
  }

  describe('validación completa', () => {
    it('debe validar un cliente completo válido', () => {
      const result = customerSchema.safeParse(validCustomer)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Juan Pérez')
        expect(result.data.phone).toBe('+56912345678')
        expect(result.data.email).toBe('juan@example.com')
      }
    })

    it('debe validar cliente con nombre largo', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'María Fernanda González Martínez de la Cruz',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de name', () => {
    it('debe aceptar nombre de 2 caracteres (mínimo)', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'AB',
      })

      expect(result.success).toBe(true)
    })

    it('debe rechazar nombre de 1 carácter', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'A',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 2 caracteres')
      }
    })

    it('debe rechazar nombre vacío', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: '',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('al menos 2 caracteres')
      }
    })

    it('debe rechazar sin el campo name', () => {
      const { name, ...customer } = validCustomer
      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('name')
      }
    })

    it('debe aceptar nombres con caracteres especiales', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: "O'Brien José María-Fernández",
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar nombres con tildes', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'José María Ángel',
      })

      expect(result.success).toBe(true)
    })

    it('debe aceptar nombres con ñ', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'Peña Muñoz',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('validación de phone', () => {
    describe('normalización automática', () => {
      it('debe normalizar teléfono sin +56', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '912345678',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con espacios', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56 9 1234 5678',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con guiones', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56-9-1234-5678',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con paréntesis', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56 (9) 1234 5678',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('+56912345678')
        }
      })

      it('debe normalizar teléfono con puntos', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56.9.1234.5678',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.phone).toBe('+56912345678')
        }
      })
    })

    describe('validación de formato', () => {
      it('debe aceptar teléfonos móviles válidos (9XXXXXXXX)', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56912345678',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar teléfonos fijos válidos (2XXXXXXXX)', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56223456789',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar teléfonos que comienzan con 3-9', () => {
        const validPrefixes = ['2', '3', '4', '5', '6', '7', '8', '9']

        validPrefixes.forEach((prefix) => {
          const result = customerSchema.safeParse({
            ...validCustomer,
            phone: `+56${prefix}12345678`,
          })

          expect(result.success).toBe(true)
        })
      })

      it('debe rechazar teléfono que comienza con 0', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56012345678',
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('teléfono chileno válido')
        }
      })

      it('debe rechazar teléfono que comienza con 1', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+56112345678',
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('teléfono chileno válido')
        }
      })

      it('debe rechazar teléfono muy corto', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '123',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono muy largo', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+569123456789999',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono vacío', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '',
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('requerido')
        }
      })

      it('debe rechazar sin el campo phone', () => {
        const { phone, ...customer } = validCustomer
        const result = customerSchema.safeParse(customer)

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].path).toContain('phone')
        }
      })
    })

    describe('formatos internacionales incorrectos', () => {
      it('debe rechazar teléfono con prefijo argentino', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+54911234567',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono con prefijo mexicano', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+5215512345678',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar teléfono estadounidense', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          phone: '+12025551234',
        })

        expect(result.success).toBe(false)
      })
    })
  })

  describe('validación de email', () => {
    describe('emails válidos', () => {
      it('debe aceptar email básico válido', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'test@example.com',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar email con subdominios', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user@mail.example.com',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar email con números', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user123@example.com',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar email con guiones y puntos', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user.name-test@example.com',
        })

        expect(result.success).toBe(true)
      })

      it('debe aceptar email con plus addressing', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user+tag@example.com',
        })

        expect(result.success).toBe(true)
      })
    })

    describe('emails inválidos', () => {
      it('debe rechazar email sin @', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'userexample.com',
        })

        expect(result.success).toBe(false)
        if (!result.success) {
          expect(result.error.issues[0].message).toContain('Correo electrónico inválido')
        }
      })

      it('debe rechazar email sin dominio', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user@',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar email sin usuario', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: '@example.com',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar email con espacios', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user name@example.com',
        })

        expect(result.success).toBe(false)
      })

      it('debe rechazar email con múltiples @', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: 'user@@example.com',
        })

        expect(result.success).toBe(false)
      })
    })

    describe('email opcional', () => {
      it('debe aceptar email undefined', () => {
        const { email, ...customer } = validCustomer
        const result = customerSchema.safeParse(customer)

        expect(result.success).toBe(true)
      })

      it('debe aceptar email vacío (string literal)', () => {
        const result = customerSchema.safeParse({
          ...validCustomer,
          email: '',
        })

        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.email).toBe('')
        }
      })

      it('debe aceptar sin el campo email completamente', () => {
        const customer = {
          name: 'Test User',
          phone: '+56912345678',
        }
        const result = customerSchema.safeParse(customer)

        expect(result.success).toBe(true)
      })
    })
  })

  describe('integración completa - casos de negocio', () => {
    it('debe validar cliente típico con todos los campos', () => {
      const customer = {
        name: 'María González',
        phone: '9 8765 4321',
        email: 'maria.gonzalez@gmail.com',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('María González')
        expect(result.data.phone).toBe('+56987654321')
        expect(result.data.email).toBe('maria.gonzalez@gmail.com')
      }
    })

    it('debe validar cliente sin email', () => {
      const customer = {
        name: 'Pedro Silva',
        phone: '223456789',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Pedro Silva')
        expect(result.data.phone).toBe('+56223456789')
        expect(result.data.email).toBeUndefined()
      }
    })

    it('debe validar cliente con email vacío explícito', () => {
      const customer = {
        name: 'Ana Torres',
        phone: '+56945678901',
        email: '',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('')
      }
    })

    it('debe rechazar cliente con nombre muy corto', () => {
      const customer = {
        name: 'A',
        phone: '+56912345678',
        email: 'test@example.com',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(false)
    })

    it('debe rechazar cliente con teléfono inválido', () => {
      const customer = {
        name: 'Juan Pérez',
        phone: '123',
        email: 'juan@example.com',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(false)
    })

    it('debe rechazar cliente con email inválido pero no opcional', () => {
      const customer = {
        name: 'María López',
        phone: '+56912345678',
        email: 'email-invalido',
      }

      const result = customerSchema.safeParse(customer)

      expect(result.success).toBe(false)
    })
  })

  describe('edge cases', () => {
    it('debe trimear nombre con espacios alrededor', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: '  Juan Pérez  ',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.name).toBe('Juan Pérez')
      }
    })

    it('debe manejar email en mayúsculas', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        email: 'USER@EXAMPLE.COM',
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.email).toBe('USER@EXAMPLE.COM')
      }
    })

    it('debe manejar nombre de una sola palabra', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'Madonna',
      })

      expect(result.success).toBe(true)
    })

    it('debe manejar nombre con muchas palabras', () => {
      const result = customerSchema.safeParse({
        ...validCustomer,
        name: 'José María de la Cruz González Martínez Fernández',
      })

      expect(result.success).toBe(true)
    })
  })

  describe('type safety', () => {
    it('el tipo inferido debe incluir todos los campos correctos', () => {
      const customer: CustomerFormData = {
        name: 'Test',
        phone: '+56912345678',
        email: 'test@example.com',
      }

      // TypeScript compile-time check
      expect(customer.name).toBeDefined()
      expect(customer.phone).toBeDefined()
      expect(customer.email).toBeDefined()
    })

    it('email debe poder ser undefined en el tipo inferido', () => {
      const customer: CustomerFormData = {
        name: 'Test',
        phone: '+56912345678',
        // email es opcional
      }

      expect(customer.email).toBeUndefined()
    })
  })
})
