// Prüfstand: ist jede Übung in Oskars Engine lösbar? Sucht für jede Übung
// eine Zugfolge, nach der istGeloest gilt. Aufruf aus apps/client:
//   npx tsx src/training/pruefe_uebungen.ts
import { Game } from '@repo/core/game/game'
import type { MoveTextOrBall } from '@repo/core/types'
import daten from './daten.json' with { type: 'json' }
import type { TrainingDaten, Uebung } from './typen'
import { baueSpiel, fuehreAus, ICH } from './spielstand'
import { istGeloest, type Verlauf } from './pruefung'

const d = daten as unknown as TrainingDaten
const kopie = (g: Game) => new Game(4, 2, true, false, JSON.parse(g.getJSON()))

function zuege(g: Game): MoveTextOrBall[] {
  if (g.activePlayer !== ICH && !g.tradeFlag) return []
  const out: MoveTextOrBall[] = []
  g.cardsWithMoves.forEach((c, i) => {
    if (!c.possible) return
    for (const [b, ziele] of Object.entries(c.ballActions)) for (const z of ziele) out.push([ICH, i, Number(b), z])
    for (const t of c.textAction.split('+').filter(Boolean)) out.push([ICH, t === 'beenden' ? 0 : i, t])
  })
  return out
}

function suche(u: Uebung, g: Game, v: Verlauf, tiefe: number, budget: { n: number }): Verlauf | null {
  if (istGeloest(u, g, v)) return v
  if (tiefe === 0 || budget.n-- <= 0) return null
  for (const z of zuege(g)) {
    if (!g.checkMove(z)) continue
    const h = kopie(g)
    const karte = h.cardsWithMoves[z[1]]?.title ?? '?'
    fuehreAus(h, z)
    const r = suche(u, h, { zuege: [...v.zuege, z], karten: [...v.karten, karte] }, tiefe - 1, budget)
    if (r) return r
  }
  return null
}

let ok = 0
const fehler: string[] = []
for (const u of d.uebungen) {
  if (['s_g12a', 's_g12c'].includes(u.id)) continue
  try {
    if (u.id === 's_g12b') {
      // Tausch: die 13 an den Partner
      const g = baueSpiel(u)
      const i = g.cards.players[ICH].indexOf('13')
      if (i < 0 || !g.checkMove([ICH, i, 'tauschen'])) throw new Error('13 nicht tauschbar')
      ok++
      continue
    }
    const start = u.id === 's_m03' ? baueSpiel(u, 'm03') : baueSpiel(u)
    const r = suche(u, start, { zuege: [], karten: [] }, 9, { n: 40000 })
    if (r) {
      ok++
      console.log(`ok   ${u.id.padEnd(8)} ${r.karten.join(' ')}`)
    } else {
      fehler.push(u.id)
      const z = zuege(start)
      console.log(
        `FEHL ${u.id.padEnd(8)} Karten ${u.karten.join(',')}  Züge am Start: ${z.length}  ${JSON.stringify(start.cardsWithMoves.map((c) => [c.title, c.possible, c.textAction]))}`
      )
    }
  } catch (e) {
    fehler.push(u.id)
    console.log(`AUSN ${u.id}: ${(e as Error).message}`)
  }
}
console.log(`\n${ok} lösbar, ${fehler.length} nicht: ${fehler.join(' ')}`)
