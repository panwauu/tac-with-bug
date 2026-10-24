// Texte, die im Browser anders lauten müssen als in der App, weil
// Tac-With-Bug etwas anders anzeigt. Die App zeigt ✓/✕ und ☝️ neben den
// Spielern; hier zeigt es Oskars Spieloberfläche selbst.
import type { Lektion, Text, Uebung } from './typen'

type Felder = Partial<Record<'titel' | 'aufgabe' | 'tipp' | 'erfolg', Text>>

export const anpassungen: Record<string, Felder> = {
  // Bedienung wie bei Tac-With-Bug: erst die Kugel, dann das Zielfeld; Abwerfen über den roten Knopf.
  s_a01: {
    tipp: {
      de: 'Tippe zuerst auf eine schwarze Kugel in deinem Vorfeld und dann auf dein Startfeld. Die 1 ist dabei schon ausgewählt, weil sie deine einzige spielbare Karte ist.',
      en: 'First tap a black marble in your base, then tap your start field. The 1 is already selected because it is your only playable card.',
      ru: 'Сначала нажми на чёрный шарик в своей базе, а затем на своё стартовое поле. Единица уже выбрана, потому что это твоя единственная карта, которой можно сыграть.',
    },
  },
  s_a02: {
    tipp: {
      de: 'Die 13 ist auch eine Heraushol-Karte! Tippe zuerst auf eine schwarze Kugel in deinem Vorfeld und dann auf dein Startfeld.',
      en: 'The 13 is also a card to get out! First tap a black marble in your base, then tap your start field.',
      ru: '13 тоже позволяет вывести шарик! Сначала нажми на чёрный шарик в своей базе, а затем на своё стартовое поле.',
    },
  },
  s_a09: {
    tipp: {
      de: 'Alle Kugeln sind im Vorfeld und du hast keine 1 oder 13, also bleibt nur Abwerfen. Tippe auf eine beliebige Karte und dann auf den roten Knopf „Abwerfen“.',
      en: 'All your marbles are in the base and you have no 1 or 13, so all you can do is discard. Tap any card, then tap the red “Discard the card” button.',
      ru: 'Все шарики в базе, а 1 или 13 у тебя нет, значит, остаётся только сбросить карту. Нажми на любую карту, а затем на красную кнопку «Сбросить карту».',
    },
  },
  s_a03: {
    tipp: {
      de: 'Tippe auf eine Normalkarte, dann auf deine schwarze Kugel und danach auf die Projektion auf dem Spielfeld, also das Feld, auf dem die Kugel landen würde. Normalkarten ziehen exakt ihren Zahlenwert.',
      en: 'Tap a normal card, then your black marble, and then the projection on the board, i.e. the field where the marble would land. Normal cards move exactly their number.',
      ru: 'Нажми на обычную карту, затем на свой чёрный шарик, а потом на проекцию на игровом поле, то есть на клетку, куда шарик попадёт. Обычные карты ходят ровно на своё число.',
    },
  },
  s_a03c: {
    tipp: {
      de: 'Tippe auf eine Karte, dann auf eine deiner schwarzen Kugeln auf dem Spielfeld und danach auf die weiße Projektion, also das Feld, auf das die Kugel laufen würde.',
      en: 'Tap a card, then one of your black marbles on the board, and then the white projection, i.e. the field the marble would move to.',
      ru: 'Нажми на карту, затем на один из своих чёрных шариков на поле, а потом на белую проекцию, то есть на клетку, куда шарик пойдёт.',
    },
  },
  s_a07: {
    tipp: {
      de: 'Du hast bereits eine Kugel auf Feld 5. Tippe auf die 1, dann auf eine schwarze Kugel in deinem Vorfeld und danach auf die weiße Projektion auf deinem Startfeld.',
      en: 'You already have a marble on field 5. Tap the 1, then a black marble in your base, and then the white projection on your start field.',
      ru: 'У тебя уже есть шарик на поле 5. Нажми на 1, затем на чёрный шарик в своей базе, а потом на белую проекцию на своём стартовом поле.',
    },
  },
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

/** Lektionen und Übungen, die es im Browser nicht gibt. „Züge ausführen“ erklärt Knopf gegen Projektion; bei Tac-With-Bug zieht man nur über die Projektion. */
export const nichtImBrowser = new Set(['a03b', 's_a03b'])

export function passeAn(u: Uebung): Uebung {
  const a = anpassungen[u.id]
  return a ? { ...u, ...a } : u
}

/** Lektionstexte, die von der Bedienung der App ausgehen. */
const lektionsAnpassungen: Record<string, Partial<Record<'text', Text>>> = {
  a03c: {
    text: {
      de: 'Wenn du mehrere Kugeln auf dem Spielfeld hast, entscheidest du, welche zieht. Tippe auf eine Karte, dann auf die schwarze Kugel, die ziehen soll, und danach auf die Projektion.',
      en: 'If you have several marbles on the board, you decide which one moves. Tap a card, then the black marble you want to move, and then the projection.',
      ru: 'Если у тебя несколько шариков на поле, ты решаешь, какой из них пойдёт. Нажми на карту, затем на чёрный шарик, который должен пойти, а потом на проекцию.',
    },
  },
}

export function passeLektionAn(l: Lektion): Lektion {
  const a = lektionsAnpassungen[l.id]
  return a ? { ...l, ...a } : l
}
