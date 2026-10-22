// Texte, die im Browser anders lauten müssen als in der App, weil
// Tac-With-Bug etwas anders anzeigt. Die App zeigt ✓/✕ und ☝️ neben den
// Spielern; hier zeigt es Oskars Spieloberfläche selbst.
import type { Text, Uebung } from './typen'

type Felder = Partial<Record<'titel' | 'aufgabe' | 'tipp' | 'erfolg', Text>>

export const anpassungen: Record<string, Felder> = {
  s_g12a: {
    aufgabe: {
      de: 'Es wird getauscht. Wer eine 1 oder 13 hat, kann raus: Auf seinen verdeckten Karten steht dann rot 13 und 1. Wie viele Spieler können raus?',
      en: 'Cards are being swapped. Anyone with a 1 or 13 can get out: their face-down cards then show a red 13 and 1. How many players can get out?',
      ru: 'Идёт обмен картами. Кто держит 1 или 13, может выйти: на его закрытых картах тогда красным написано 13 и 1. Сколько игроков могут выйти?',
    },
    tipp: {
      de: 'Schau auf die verdeckten Karten der anderen neben ihren Namen. Bei Grün und Rot stehen rot 13 und 1, bei Blau nicht. Deine eigenen Karten siehst du offen: Hast du eine 1 oder 13?',
      en: "Look at the others' face-down cards next to their names. Green and Red show a red 13 and 1, Blue does not. You see your own cards face up: do you have a 1 or 13?",
      ru: 'Посмотри на закрытые карты других рядом с их именами. У Зелёного и Красного красным написано 13 и 1, у Синего нет. Свои карты ты видишь открыто: есть ли у тебя 1 или 13?',
    },
    erfolg: {
      de: 'Richtig! Bei Grün und Rot stehen 13 und 1 auf den Karten, du und Blau habt keine. Also können 2 Spieler raus.',
      en: 'Correct! Green and Red show 13 and 1 on their cards, you and Blue have none. So 2 players can get out.',
      ru: 'Верно! У Зелёного и Красного на картах 13 и 1, у тебя и у Синего нет. Значит, выйти могут 2 игрока.',
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
