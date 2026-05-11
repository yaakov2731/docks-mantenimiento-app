import { describe, expect, it } from 'vitest'
import { parsePlanificacionResponse } from './engine'

describe('parsePlanificacionResponse', () => {
  it('returns null for standalone "1" (menu navigation, not planificacion)', () => {
    expect(parsePlanificacionResponse('1')).toBeNull()
  })

  it('returns null for standalone "2" (menu navigation, not planificacion)', () => {
    expect(parsePlanificacionResponse('2')).toBeNull()
  })

  it('parses "1 Confirmo" button-like reply as confirmado', () => {
    const result = parsePlanificacionResponse('1 Confirmo')
    expect(result).toMatchObject({ respuesta: 'confirmado', planningSpecific: true })
  })

  it('parses "2 No puedo" button-like reply as no_trabaja', () => {
    const result = parsePlanificacionResponse('2 No puedo')
    expect(result).toMatchObject({ respuesta: 'no_trabaja', planningSpecific: true })
  })

  it('parses "confirmo 77" as confirmado with turnoId', () => {
    const result = parsePlanificacionResponse('confirmo 77')
    expect(result).toMatchObject({ turnoId: 77, respuesta: 'confirmado', planningSpecific: true })
  })

  it('parses "no 77" as no_trabaja with turnoId', () => {
    const result = parsePlanificacionResponse('no 77')
    expect(result).toMatchObject({ turnoId: 77, respuesta: 'no_trabaja', planningSpecific: true })
  })

  it('parses "dale" as confirmado', () => {
    const result = parsePlanificacionResponse('dale')
    expect(result).toMatchObject({ respuesta: 'confirmado', planningSpecific: true })
  })

  it('parses "no puedo" as no_trabaja', () => {
    const result = parsePlanificacionResponse('no puedo')
    expect(result).toMatchObject({ respuesta: 'no_trabaja', planningSpecific: true })
  })

  it('returns null for ambiguous input like "puede ser"', () => {
    expect(parsePlanificacionResponse('puede ser')).toBeNull()
  })

  it('returns null for random text', () => {
    expect(parsePlanificacionResponse('hola que tal')).toBeNull()
  })

  it('returns null for emoji only', () => {
    expect(parsePlanificacionResponse('👍')).toBeNull()
  })
})
