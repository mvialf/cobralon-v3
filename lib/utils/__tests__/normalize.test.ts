/**
 * Tests para funciones de normalización de búsqueda
 *
 * Verifica que las búsquedas ignoren tildes/acentos correctamente.
 * Este es un requisito crítico para UX en español.
 */

import { describe, it, expect } from 'vitest'
import { normalizeForSearch, textMatchesSearch, anyFieldMatchesSearch } from '../normalize'

describe('normalizeForSearch', () => {
  describe('casos básicos', () => {
    it('convierte a minúsculas', () => {
      expect(normalizeForSearch('HOLA')).toBe('hola')
      expect(normalizeForSearch('HoLa MuNdO')).toBe('hola mundo')
    })

    it('elimina espacios al inicio y final', () => {
      expect(normalizeForSearch('  hola  ')).toBe('hola')
      expect(normalizeForSearch('\thola\n')).toBe('hola')
    })

    it('maneja strings vacíos', () => {
      expect(normalizeForSearch('')).toBe('')
      expect(normalizeForSearch('   ')).toBe('')
    })

    it('maneja null/undefined', () => {
      expect(normalizeForSearch(null as unknown as string)).toBe('')
      expect(normalizeForSearch(undefined as unknown as string)).toBe('')
    })
  })

  describe('normalización de acentos (crítico para español)', () => {
    it('remueve tildes de vocales', () => {
      expect(normalizeForSearch('José')).toBe('jose')
      expect(normalizeForSearch('María')).toBe('maria')
      expect(normalizeForSearch('Andrés')).toBe('andres')
      expect(normalizeForSearch('Ramón')).toBe('ramon')
      expect(normalizeForSearch('Jesús')).toBe('jesus')
    })

    it('remueve diéresis', () => {
      expect(normalizeForSearch('Güemes')).toBe('guemes')
      expect(normalizeForSearch('pingüino')).toBe('pinguino')
    })

    it('convierte ñ a n', () => {
      expect(normalizeForSearch('Ñuñoa')).toBe('nunoa')
      expect(normalizeForSearch('España')).toBe('espana')
      expect(normalizeForSearch('señor')).toBe('senor')
      expect(normalizeForSearch('niño')).toBe('nino')
    })

    it('maneja nombres completos con tildes', () => {
      expect(normalizeForSearch('José García')).toBe('jose garcia')
      expect(normalizeForSearch('María José Pérez')).toBe('maria jose perez')
      expect(normalizeForSearch('Andrés Núñez')).toBe('andres nunez')
    })

    it('maneja direcciones chilenas con tildes', () => {
      expect(normalizeForSearch('Valparaíso')).toBe('valparaiso')
      expect(normalizeForSearch('Concepción')).toBe('concepcion')
      expect(normalizeForSearch('Región Metropolitana')).toBe('region metropolitana')
      expect(normalizeForSearch('Biobío')).toBe('biobio')
    })
  })

  describe('casos edge', () => {
    it('maneja múltiples acentos en una palabra', () => {
      expect(normalizeForSearch('teléfono')).toBe('telefono')
      expect(normalizeForSearch('dirección')).toBe('direccion')
      expect(normalizeForSearch('número')).toBe('numero')
    })

    it('preserva números', () => {
      expect(normalizeForSearch('Proyecto 123')).toBe('proyecto 123')
      expect(normalizeForSearch('P-2024-001')).toBe('p-2024-001')
    })

    it('preserva caracteres especiales', () => {
      expect(normalizeForSearch('email@test.com')).toBe('email@test.com')
      expect(normalizeForSearch('100%')).toBe('100%')
    })
  })
})

describe('textMatchesSearch', () => {
  describe('búsqueda insensible a tildes', () => {
    it('encuentra "José" buscando "jose"', () => {
      expect(textMatchesSearch('José García', 'jose')).toBe(true)
      expect(textMatchesSearch('José García', 'Jose')).toBe(true)
      expect(textMatchesSearch('José García', 'JOSE')).toBe(true)
    })

    it('encuentra "García" buscando "garcia"', () => {
      expect(textMatchesSearch('José García', 'garcia')).toBe(true)
    })

    it('encuentra "Ñuñoa" buscando "nunoa"', () => {
      expect(textMatchesSearch('Ñuñoa, Santiago', 'nunoa')).toBe(true)
    })

    it('encuentra "Valparaíso" buscando "valparaiso"', () => {
      expect(textMatchesSearch('Región de Valparaíso', 'valparaiso')).toBe(true)
    })

    it('encuentra texto con tilde buscando con tilde', () => {
      expect(textMatchesSearch('José', 'José')).toBe(true)
      expect(textMatchesSearch('María', 'María')).toBe(true)
    })
  })

  describe('casos negativos', () => {
    it('no encuentra texto que no está', () => {
      expect(textMatchesSearch('José García', 'pedro')).toBe(false)
      expect(textMatchesSearch('Santiago', 'valparaiso')).toBe(false)
    })

    it('no encuentra en texto vacío', () => {
      expect(textMatchesSearch('', 'jose')).toBe(false)
    })
  })

  describe('casos edge', () => {
    it('búsqueda vacía retorna true (match todo)', () => {
      expect(textMatchesSearch('José García', '')).toBe(true)
      expect(textMatchesSearch('cualquier texto', '')).toBe(true)
    })

    it('maneja null/undefined en texto', () => {
      expect(textMatchesSearch(null as unknown as string, 'jose')).toBe(false)
      expect(textMatchesSearch(undefined as unknown as string, 'jose')).toBe(false)
    })

    it('búsqueda parcial funciona', () => {
      expect(textMatchesSearch('José García López', 'gar')).toBe(true)
      expect(textMatchesSearch('P-2024-001', '2024')).toBe(true)
    })
  })
})

describe('anyFieldMatchesSearch', () => {
  it('encuentra en cualquier campo del array', () => {
    const fields = ['José García', 'jose@email.com', 'Santiago']

    expect(anyFieldMatchesSearch(fields, 'jose')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'garcia')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'email')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'santiago')).toBe(true)
  })

  it('ignora tildes en todos los campos', () => {
    const fields = ['María José', 'Valparaíso', 'Ñuñoa']

    expect(anyFieldMatchesSearch(fields, 'maria')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'valparaiso')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'nunoa')).toBe(true)
  })

  it('maneja campos null/undefined', () => {
    const fields = ['José', null, undefined, 'García']

    expect(anyFieldMatchesSearch(fields, 'jose')).toBe(true)
    expect(anyFieldMatchesSearch(fields, 'garcia')).toBe(true)
  })

  it('retorna false si ningún campo contiene el término', () => {
    const fields = ['José', 'García', 'Santiago']

    expect(anyFieldMatchesSearch(fields, 'pedro')).toBe(false)
  })

  it('búsqueda vacía retorna true', () => {
    expect(anyFieldMatchesSearch(['cualquier', 'cosa'], '')).toBe(true)
  })

  it('array vacío retorna false para búsqueda no vacía', () => {
    expect(anyFieldMatchesSearch([], 'jose')).toBe(false)
  })
})

describe('casos de uso reales', () => {
  it('búsqueda de clientes por nombre', () => {
    const clientName = 'José Antonio García López'

    // Usuario busca sin tildes (muy común)
    expect(textMatchesSearch(clientName, 'jose')).toBe(true)
    expect(textMatchesSearch(clientName, 'garcia')).toBe(true)
    expect(textMatchesSearch(clientName, 'antonio')).toBe(true)
    // Nota: "jose garcia" no es substring continuo de "jose antonio garcia"
    // Esto es comportamiento esperado - la búsqueda es por substring, no palabras separadas
    expect(textMatchesSearch(clientName, 'jose antonio')).toBe(true)
  })

  it('búsqueda de proyectos por dirección', () => {
    const address = 'Av. Providencia 1234, Ñuñoa, Región Metropolitana'

    expect(textMatchesSearch(address, 'nunoa')).toBe(true)
    expect(textMatchesSearch(address, 'providencia')).toBe(true)
    expect(textMatchesSearch(address, 'region')).toBe(true)
  })

  it('búsqueda multi-campo de aftersale', () => {
    const aftersaleFields = ['P-2024-001', 'María José Pérez', 'Problema con instalación eléctrica']

    expect(anyFieldMatchesSearch(aftersaleFields, 'maria')).toBe(true)
    expect(anyFieldMatchesSearch(aftersaleFields, 'perez')).toBe(true)
    expect(anyFieldMatchesSearch(aftersaleFields, 'electrica')).toBe(true)
    expect(anyFieldMatchesSearch(aftersaleFields, '2024')).toBe(true)
  })
})
