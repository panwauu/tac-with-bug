// Netze im Browser (oder Web Worker) laden: per fetch von einer Basis-URL,
// unter der wertnetz_hard.*, politiknetz.* und koopnetz.* liegen.

import { Wertnetz } from './wertnetz'
import { Politiknetz } from './politiknetz'
import type { Netze } from './stufen'

async function lies(url: string): Promise<[ArrayBuffer, any]> {
  const [bin, json] = await Promise.all([fetch(url + '.bin'), fetch(url + '.json')])
  if (!bin.ok || !json.ok) throw new Error(`Netz nicht ladbar: ${url}`)
  return [await bin.arrayBuffer(), await json.json()]
}

/** Laedt nur, was gebraucht wird: `welche` z. B. ['wert', 'politik']. */
export async function ladeNetze(basis: string, welche: (keyof Netze)[] = ['wert', 'politik', 'koop']): Promise<Netze> {
  const b = basis.endsWith('/') ? basis : basis + '/'
  const netze: Netze = {}
  await Promise.all(
    welche.map(async (w) => {
      if (w === 'wert') netze.wert = new Wertnetz(...(await lies(b + 'wertnetz_hard')))
      if (w === 'koop') netze.koop = new Wertnetz(...(await lies(b + 'koopnetz')))
      if (w === 'politik') netze.politik = new Politiknetz(...(await lies(b + 'politiknetz')))
    })
  )
  return netze
}
