import { describe, expect, it } from 'vitest'
import { buildPaginationResponse, parsePaginationParams } from '../pagination'

function params(query = '') {
  return new URLSearchParams(query)
}

describe('parsePaginationParams', () => {
  it('usa page 1 y limit 10 por defecto', () => {
    expect(parsePaginationParams(params())).toEqual({ page: 1, limit: 10, skip: 0 })
  })

  it('calcula skip desde page y limit válidos', () => {
    expect(parsePaginationParams(params('page=3&limit=25'))).toEqual({
      page: 3,
      limit: 25,
      skip: 50,
    })
  })

  it('usa fallback para NaN, strings basura y valores vacíos', () => {
    expect(parsePaginationParams(params('page=NaN&limit=nope'))).toEqual({
      page: 1,
      limit: 10,
      skip: 0,
    })
    expect(parsePaginationParams(params('page=&limit='), 20)).toEqual({
      page: 1,
      limit: 20,
      skip: 0,
    })
  })

  it('limita cero y negativos al mínimo permitido', () => {
    expect(parsePaginationParams(params('page=0&limit=0'))).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
    })
    expect(parsePaginationParams(params('page=-8&limit=-50'))).toEqual({
      page: 1,
      limit: 1,
      skip: 0,
    })
  })

  it('trunca floats antes de calcular skip', () => {
    expect(parsePaginationParams(params('page=2.9&limit=10.8'))).toEqual({
      page: 2,
      limit: 10,
      skip: 10,
    })
  })

  it('limita limit al máximo 100', () => {
    expect(parsePaginationParams(params('page=2&limit=1000'))).toEqual({
      page: 2,
      limit: 100,
      skip: 100,
    })
  })

  it('normaliza defaultLimit al rango permitido', () => {
    expect(parsePaginationParams(params(), 0)).toEqual({ page: 1, limit: 1, skip: 0 })
    expect(parsePaginationParams(params(), 500)).toEqual({ page: 1, limit: 100, skip: 0 })
  })
})

describe('buildPaginationResponse', () => {
  it('calcula totalPages desde total y limit', () => {
    expect(buildPaginationResponse(2, 25, 60)).toEqual({
      page: 2,
      limit: 25,
      total: 60,
      totalPages: 3,
    })
  })
})
