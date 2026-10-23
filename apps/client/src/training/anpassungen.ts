// Texte, die im Browser anders lauten müssen als in der App, weil
// Tac-With-Bug etwas anders anzeigt. Die App zeigt ✓/✕ und ☝️ neben den
// Spielern; hier zeigt es Oskars Spieloberfläche selbst.
import type { Text, Uebung } from './typen'

type Felder = Partial<Record<'titel' | 'aufgabe' | 'tipp' | 'erfolg', Text>>

export const anpassungen: Record<string, Felder> = {
  s_g12a: {
    aufgabe: {
      de: 'Es wird getauscht. Wer eine 1 oder 13 hat, kann raus. Das siehst du an der 13 bei seinen verdeckten Karten: Angezeigt wird immer nur eine 13, egal ob er eine 1 oder eine 13 hat. Wie viele Spieler können raus?',
      en: 'Cards are being swapped. Anyone with a 1 or 13 can get out. You can tell by the 13 among their face-down cards: only a 13 is ever shown, no matter whether they hold a 1 or a 13. How many players can get out?',
      ru: 'Идёт обмен картами. Кто держит 1 или 13, может выйти. Это видно по 13 среди его закрытых карт: показывается всегда только 13, неважно, есть ли у него 1 или 13. Сколько игроков могут выйти?',
    },
    tipp: {
      de: 'Schau auf die verdeckten Karten der anderen neben ihren Namen. Bei Grün und Rot ist eine 13 zu sehen, bei Blau nicht. Grün hat eigentlich eine 1, angezeigt wird trotzdem die 13. Deine eigenen Karten siehst du offen: Hast du eine 1 oder 13?',
      en: "Look at the others' face-down cards next to their names. Green and Red show a 13, Blue does not. Green actually holds a 1, but the 13 is shown anyway. You see your own cards face up: do you have a 1 or 13?",
      ru: 'Посмотри на закрытые карты других рядом с их именами. У Зелёного и Красного видна 13, у Синего нет. У Зелёного на самом деле 1, но показывается всё равно 13. Свои карты ты видишь открыто: есть ли у тебя 1 или 13?',
    },
    erfolg: {
      de: 'Richtig! Bei Grün und Rot ist die 13 zu sehen, auch wenn Grün nur eine 1 hat. Du und Blau habt keine. Also können 2 Spieler raus.',
      en: 'Correct! Green and Red show the 13, even though Green only holds a 1. You and Blue have none. So 2 players can get out.',
      ru: 'Верно! У Зелёного и Красного видна 13, хотя у Зелёного только 1. У тебя и у Синего нет. Значит, выйти могут 2 игрока.',
    },
  },
  s_g12c: {
    titel: { de: 'Wer fängt an?', en: 'Who starts?', ru: 'Кто начинает?' },
    aufgabe: {
      de: 'Die Karten sind gerade gegeben. Wer fängt diese Runde an?',
      en: 'The cards have just been dealt. Who starts this round?',
      ru: 'Карты только что розданы. Кто начинает этот раунд?',
    },
    tipp: {
      de: 'Wer am Zug ist, bei dem steht die oberste verdeckte Karte schräg. Zu Beginn der Runde ist das der Spieler nach dem Geber. Der Kartenstapel liegt beim Geber.',
      en: 'Whoever is to move has their top face-down card tilted. At the start of a round that is the player after the dealer. The deck lies next to the dealer.',
      ru: 'У того, чей ход, верхняя закрытая карта стоит наискосок. В начале раунда это игрок после сдающего. Колода лежит у сдающего.',
    },
    erfolg: {
      de: 'Richtig! Bei Rot steht die oberste Karte schräg: Rot fängt an. Gegeben hat Grün, dort liegt der Stapel.',
      en: 'Correct! Red has the tilted top card: Red starts. Green dealt, the deck lies there.',
      ru: 'Верно! У Красного верхняя карта стоит наискосок: начинает Красный. Сдавал Зелёный, колода лежит у него.',
    },
  },
}

export function passeAn(u: Uebung): Uebung {
  const a = anpassungen[u.id]
  return a ? { ...u, ...a } : u
}
