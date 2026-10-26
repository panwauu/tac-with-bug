import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { KiPool } from './kiPool'

// Ein Ersatz-Worker statt der echten KI: antwortet nach `daten.dauer` ms mit
// [0, 0, 'zug', zeitGrenze], haengt bei dauer < 0 fuer immer.
const WORKER = `
const { parentPort } = require('node:worker_threads')
parentPort.on('message', (a) => {
  if (a.daten.dauer < 0) { while (true) {} }
  const ende = Date.now() + a.daten.dauer
  while (Date.now() < ende) {}
  parentPort.postMessage({ id: a.id, zug: [0, 0, 'zug', a.zeitGrenze] })
})
`

describe('KiPool', () => {
  let datei: string
  let pool: KiPool | null = null

  beforeAll(() => {
    datei = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'kipool-')), 'worker.js')
    fs.writeFileSync(datei, WORKER)
  })

  afterEach(async () => {
    await pool?.beende()
    pool = null
  })

  const anfrage = (schluessel: string, dauer: number) => ({ schluessel, stufe: 'test', daten: { dauer } as any })

  it('liefert den Zug mit voller Suchzeit, wenn nichts wartet', async () => {
    pool = new KiPool(1, datei)
    const zug = await pool.zug(anfrage('a', 10), Date.now() + 6000)
    expect(zug).toEqual([0, 0, 'zug', 2000])
  })

  it('verkuerzt die Suchzeit, wenn hinter dem Zug weitere warten', async () => {
    const p = new KiPool(1, datei)
    pool = p
    // Grosszuegige Frist: nur die Schlangenlaenge soll die Suchzeit kuerzen, nicht die Frist
    const zuege = await Promise.all([1, 2, 3, 4].map((i) => p.zug(anfrage('a' + i, 50), Date.now() + 60000)))
    // Der erste startet sofort (Schlange leer), der zweite hat zwei hinter sich.
    const zeiten = zuege.map((z) => z?.[3] as number)
    expect(zeiten).toEqual([2000, 667, 1000, 2000])
  })

  it('gibt null statt eines verspaeteten Zugs', async () => {
    pool = new KiPool(1, datei)
    const erster = pool.zug(anfrage('a', 400), Date.now() + 6000)
    const zweiter = pool.zug(anfrage('a', 10), Date.now() + 500)
    expect(await zweiter).toBeNull()
    expect(await erster).not.toBeNull()
    expect(pool.zustand().verworfen).toBe(1)
  })

  it('startet einen haengenden Thread neu und rechnet danach weiter', async () => {
    pool = new KiPool(1, datei)
    // Frist des Haengers knapp: Suchzeit 450 ms, also Neustart nach 450 * 3 + 3000 ms. Der Zug
    // dahinter bekommt eine grosszuegige Frist, damit er den Neustart in jedem Fall abwartet,
    // statt auf einem langsamen Runner als verspaetet verworfen zu werden
    const haenger = pool.zug(anfrage('a', -1), Date.now() + 750)
    const danach = pool.zug(anfrage('a', 10), Date.now() + 60000)
    expect(await haenger).toBeNull()
    expect(await danach).not.toBeNull()
    expect(pool.zustand().neustarts).toBe(1)
  }, 30000)
})
