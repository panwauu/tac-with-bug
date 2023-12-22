import ical, { ICalAlarmType } from 'ical-generator'
import type { PublicTournament } from '../sharedTypes/typesTournament.js'

export function generateIcal(tournament: PublicTournament) {
  const cal = ical()

  const millisPerGame = postgresIntervalToMilliseconds(tournament.timePerGame)
  tournament.creationDates.forEach((d, i) => {
    const start = new Date(d)
    const eventObj = {
      start: start,
      end: new Date(start.getTime() + millisPerGame),
      summary: 'Tac Turnier',
      description: `Spiel ${i + 1}`,
      url: 'https://www.tac-with-bug.com/',
    }

    const event = cal.createEvent(eventObj)
    event.createAlarm({ type: ICalAlarmType.display, trigger: 24 * 60 * 60 })
    event.createAlarm({ type: ICalAlarmType.display, trigger: 60 * 15 })
  })

  return cal
}

function postgresIntervalToMilliseconds(interval: string) {
  if (typeof interval !== 'string' || interval.length !== 5 || interval.slice(2, 3) !== ':') {
    throw new Error('Cannot parse Postgres Interval')
  }

  const hours = parseInt(interval.slice(0, 2))
  const minutes = parseInt(interval.slice(3, 5))
  return (hours * 3600 + minutes * 60) * 1000
}
