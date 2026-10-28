import { describe, expect, test } from 'vitest'
import { ONLINE_STUFEN, onlineModus, stufeFuerPartie, spielenderBot } from './onlineStufen'
import { validBotIds } from '../bots/bots'
import { stufenBot } from './stufen'

describe('KI-Stufen online', () => {
  test('Bot-Nummern sind eindeutig und gueltig', () => {
    const ids = ONLINE_STUFEN.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(ids.every((id) => id >= 10)).toBe(true)
    expect(validBotIds()).toEqual(expect.arrayContaining([0, 1, 2, 3, ...ids]))
  })

  test('jede Stufe ist eine bekannte KI', () => {
    for (const s of ONLINE_STUFEN.filter((e) => e.modus !== 'koop')) {
      if (['netz', 'hybrid', 'hybrid1600', 'legende', 'alphatac', 'schatten'].includes(s.stufe)) continue
      expect(stufenBot(s.stufe)).not.toBeNull()
    }
  })

  test('Modus je Partie', () => {
    expect(onlineModus(4, 2, false)).toBe('klassisch')
    expect(onlineModus(6, 2, false)).toBe('drei')
    expect(onlineModus(4, 2, true)).toBe('koop')
    expect(onlineModus(6, 3, false)).toBeNull()
  })

  test('unpassende Stufe ergibt null (dann spielt Futuro)', () => {
    expect(stufeFuerPartie(13, 4, 2, false)).toBe('theo')
    expect(stufeFuerPartie(13, 6, 2, false)).toBeNull()
    expect(stufeFuerPartie(25, 6, 2, false)).toBe('faehrtenleger')
    expect(stufeFuerPartie(30, 4, 2, true)).toBe('koop')
    expect(stufeFuerPartie(3, 4, 2, false)).toBeNull()
  })

  test('spielender Bot: passende Stufe, sonst Oskars Bot, sonst Futuro', () => {
    expect(spielenderBot(13, 4, 2, false)).toBe(13)
    expect(spielenderBot(13, 6, 2, false)).toBe(3)
    expect(spielenderBot(25, 6, 2, false)).toBe(25)
    expect(spielenderBot(0, 4, 2, false)).toBe(0)
    expect(spielenderBot(3, 6, 3, false)).toBe(3)
    expect(spielenderBot(30, 4, 2, false)).toBe(3)
  })
})
