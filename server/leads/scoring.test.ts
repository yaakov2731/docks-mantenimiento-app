import { describe, it, expect } from 'vitest'
import { calcularScore, getTemperature } from './scoring'

describe('calcularScore', () => {
  it('score máximo con todos los criterios óptimos', () => {
    const score = calcularScore({
      rubro: 'Indumentaria / Moda',
      instagramOrWeb: '@mimarca',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(100) // 20+10+20+25+25
  })

  it('gastronomía no suma puntos de rubro', () => {
    const score = calcularScore({
      rubro: 'Gastronomía',
      instagramOrWeb: '@resto',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(80) // 0+10+20+25+25
  })

  it('sin instagram/web no suma los 10 puntos de ig', () => {
    const score = calcularScore({
      rubro: 'Belleza / Estética',
      instagramOrWeb: 'No tiene',
      tipoEspacio: 'Stand / Módulo',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBe(85) // 20+0+15+25+25
  })

  it('plazo "más adelante" no suma puntos de tiempo', () => {
    const score = calcularScore({
      rubro: 'Deco / Hogar',
      instagramOrWeb: '',
      tipoEspacio: 'No lo tengo claro todavía',
      desdeCuando: 'más adelante, todavía no lo sé',
      seguimiento: 'Prefiere recibir información por WhatsApp',
    })
    expect(score).toBe(30) // 20+0+5+0+5
  })

  it('texto libre no reconocido en desdeCuando da 10 puntos neutros', () => {
    const score = calcularScore({
      rubro: 'Arte / Artesanías',
      instagramOrWeb: '',
      tipoEspacio: 'Espacio exterior',
      desdeCuando: 'cuando tenga el dinero listo',
      seguimiento: 'Prefiere llamada',
    })
    expect(score).toBe(55) // 20+0+10+10+15
  })

  it('score nunca supera 100', () => {
    const score = calcularScore({
      rubro: 'Moda',
      instagramOrWeb: '@algo',
      tipoEspacio: 'Local',
      desdeCuando: 'lo antes posible',
      seguimiento: 'Quiere coordinar una visita',
    })
    expect(score).toBeLessThanOrEqual(100)
  })
})

describe('getTemperature', () => {
  it('75+ es hot',      () => expect(getTemperature(75)).toBe('hot'))
  it('74 es warm',      () => expect(getTemperature(74)).toBe('warm'))
  it('50 es warm',      () => expect(getTemperature(50)).toBe('warm'))
  it('49 es cold',      () => expect(getTemperature(49)).toBe('cold'))
  it('25 es cold',      () => expect(getTemperature(25)).toBe('cold'))
  it('24 es not_fit',   () => expect(getTemperature(24)).toBe('not_fit'))
  it('0 es not_fit',    () => expect(getTemperature(0)).toBe('not_fit'))
})
