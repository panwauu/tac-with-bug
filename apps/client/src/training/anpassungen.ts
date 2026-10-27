// Texte, die im Browser anders lauten müssen als in der App, weil
// Tac-With-Bug etwas anders anzeigt. Die App zeigt ✓/✕ und ☝️ neben den
// Spielern; hier zeigt es Oskars Spieloberfläche selbst.
import type { Lektion, Text, Uebung } from './typen'

type Felder = Partial<Record<'titel' | 'aufgabe' | 'tipp' | 'erfolg', Text>> & {
  karten?: string[]
  andereHaende?: Record<string, string[]>
  /** Änderungen, die von den Daten der Übung abhängen */
  aendere?: (u: Uebung) => Partial<Uebung>
}

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
  // Engel: bei Tac-With-Bug wählt man die Kugel des anderen im Vorfeld und dann sein Startfeld.
  s_f23: {
    tipp: {
      de: 'Wähle den Engel. Der nächste Spieler (Blau) wird gezwungen, eine Kugel heraus zu holen. Tippe dazu auf eine blaue Kugel in Blaus Vorfeld und dann auf das Startfeld von Blau.',
      en: "Choose the Angel. The next player (Blue) is forced to bring a marble out. Tap a blue marble in Blue's base, then Blue's start field.",
      ru: 'Выбери Ангела. Следующий игрок (Синий) обязан вывести шарик. Нажми на синий шарик в базе Синего, а затем на стартовое поле Синего.',
    },
  },
  s_f24: {
    tipp: {
      de: 'Blau ist fertig, der Engel geht automatisch an Rot weiter. Rot muss eine Kugel heraus holen. Tippe dazu auf eine rote Kugel in Rots Vorfeld und dann auf das Startfeld von Rot.',
      en: "Blue is finished, so the Angel passes on to Red automatically. Red has to bring a marble out. Tap a red marble in Red's base, then Red's start field.",
      ru: 'Синий закончил, поэтому Ангел автоматически переходит к Красному. Красный должен вывести шарик. Нажми на красный шарик в базе Красного, а затем на стартовое поле Красного.',
    },
  },
  // TAC kopiert die 8: bei Tac-With-Bug gibt es keinen Knopf „Laufen“, man zieht direkt über die Projektion.
  s_e09a: {
    tipp: {
      de: 'Spiele TAC, um die 8 zu kopieren. Tippe dann auf deine schwarze Kugel und danach auf die Projektion, 8 Felder weiter auf Feld 18.',
      en: 'Play TAC to copy the 8. Then tap your black marble and then the projection, 8 fields ahead on field 18.',
      ru: 'Сыграй TAC, чтобы скопировать 8. Затем нажми на свой чёрный шарик, а потом на проекцию, на 8 полей дальше, на поле 18.',
    },
  },
  s_e12: {
    tipp: {
      de: 'TAC ist deine einzige Karte und spielbar, also musst du sie spielen! TAC übernimmt den Engel: Tippe auf TAC, dann auf eine blaue Kugel in Blaus Vorfeld und danach auf das Startfeld von Blau. Leider schlecht für dich: Deine Kugel geht zurück ins Vorfeld und Blau (der nächste Spieler) kommt heraus. Manchmal schadet TAC dem eigenen Team.',
      en: "TAC is your only card and it's playable, so you must play it! TAC takes over the Angel: tap TAC, then a blue marble in Blue's base, and then Blue's start field. Unfortunately bad for you: your marble goes back to the base and Blue (the next player) comes out. Sometimes TAC hurts your own team.",
      ru: 'TAC, твоя единственная карта, и ею можно сыграть, поэтому ты обязан её разыграть! TAC перенимает Ангела: нажми на TAC, затем на синий шарик в базе Синего, а потом на стартовое поле Синего. Увы, для тебя это плохо: твой шарик возвращается в базу, а Синий (следующий игрок) выходит. Иногда TAC вредит собственной команде.',
    },
  },
  // Blau hat nur den TAC: nach dem Narren hast du keine andere Karte und musst ihn spielen.
  s_f29: {
    andereHaende: { '1': ['tac'] },
    tipp: {
      de: 'Spiele den Narren. Alle geben ihre Karten weiter. Du erhältst durch den Tausch Blaus einzige Karte, einen TAC. Setze ihn ein, um den letzten Zug vor dem Narren rückgängig zu machen!',
      en: "Play the Fool. Everyone passes their cards on. Through the swap you receive Blue's only card, a TAC. Use it to undo the last move before the Fool!",
      ru: 'Сыграй Шута. Все передают карты. Благодаря обмену ты получаешь единственную карту Синего, TAC. Используй её, чтобы отменить последний ход перед Шутом!',
    },
  },
  // Teufel + TAC: in der Aufgabe sagen, dass Rot deinen TAC gespielt hat.
  s_e13: {
    aufgabe: {
      de: 'Rot hat den Teufel gespielt und danach aus deiner Hand (Schwarz) den TAC. Dadurch darfst du jetzt für Blau spielen: Spiele eine Karte von Blau!',
      en: "Red played the Devil and then the TAC from your hand (Black). That lets you play for Blue now: play one of Blue's cards!",
      ru: 'Красный сыграл Дьявола, а затем TAC из твоей руки (Чёрный). Поэтому теперь ты играешь за Синего: сыграй карту Синего!',
    },
  },
  // Vier TACs: die 13 ist im ersten Teil gespielt, danach bleibt nur der TAC.
  s_m03: { karten: ['tac'] },
  // Siegeszug: Rot zieht mit der 2 genau ins Haus, also steht Rot vorher ein Feld vor seinem Startfeld (nicht zwei).
  s_m05: {
    aendere: (u) => ({ kugelnVorher: u.kugelnVorher?.map((k) => (k.sitz === 3 && k.ort === 'ring' ? { ...k, pos: 47 } : k)) ?? null }),
  },
  // Eine 2 als Ablenkung: sie bringt Schwarz auf Feld 47, das liegt nicht auf Rots Weg ins Haus.
  s_f05b: {
    karten: ['5', '2', '9', '12'],
    tipp: {
      de: 'Rot steht auf Feld 51, drei Felder vor seinem Startfeld. Mit der 4 rückwärts käme Rot direkt ins Haus. Spiele die 5 (45 → 50), um dich direkt hinter Rot zu stellen. So blockierst du die -4! Die 2 hilft nicht: Auf Feld 47 stehst du nicht zwischen Rot und seinem Haus.',
      en: "Red is on field 51, three fields before its start field. With the 4 backward, Red would go straight into the home. Play the 5 (45 → 50) to position yourself right behind Red. That blocks the -4! The 2 doesn't help: on field 47 you are not between Red and its home.",
      ru: 'Красный на поле 51, за три поля до своего стартового поля. С 4 назад Красный зашёл бы прямо в дом. Сыграй 5 (45 → 50), чтобы встать прямо за Красным. Так ты перекроешь -4! Двойка не поможет: на поле 47 ты не стоишь между Красным и его домом.',
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
  if (!a) return u
  const { aendere, ...felder } = a
  const x = { ...u, ...felder }
  return aendere ? { ...x, ...aendere(x) } : x
}

/** Lektionstexte, die von der Bedienung der App ausgehen. */
const lektionsAnpassungen: Record<string, Partial<Record<'text', Text>>> = {
  // Auf Tac-With-Bug heißt das Training „Tutorials“
  g02: {
    text: {
      de: '16 Glaskugeln in 4 Farben (je 4 Stück), 104 Spielkarten und ein rundes Spielbrett. Jede Farbe hat ihren eigenen Bereich auf dem Brett. Die Karten bestimmen, wie weit und wohin sich deine Kugeln bewegen. In allen Tutorials spielst du als Schwarz.',
      en: '16 glass marbles in 4 colors (4 each), 104 playing cards and a round board. Each color has its own area on the board. The cards decide how far and where your marbles move. Throughout all tutorials you play as Black.',
      ru: '16 стеклянных шаров 4 цветов (по 4), 104 карты и круглое поле. У каждого цвета своя зона на поле. Карты определяют, как далеко и куда двигаются твои шары. Во всех учебниках ты играешь за Чёрных.',
    },
  },
  // Teufel und TAC: Rot spielt erst den Teufel, dann aus deiner Hand den TAC, erst dadurch spielst du für Blau.
  e13: {
    text: {
      de: 'Spezialregel: Rot spielt den Teufel. Damit darf Rot eine Karte aus deiner Hand für dich spielen und wählt deinen TAC. Der TAC macht den Teufel rückgängig und dreht ihn um: Jetzt darfst du den Teufel für Rots Teampartner Blau spielen. Du wählst eine Karte aus Blaus Hand und spielst sie für Blau. Eine seltene, aber mächtige Wendung!',
      en: "Special rule: Red plays the Devil. That lets Red play a card from your hand for you, and Red picks your TAC. The TAC undoes the Devil and turns it around: now you may play the Devil for Red's teammate Blue. You choose a card from Blue's hand and play it for Blue. A rare but powerful twist!",
      ru: 'Особое правило: Красный играет Дьявола. Так Красный может сыграть за тебя карту из твоей руки и выбирает твой TAC. TAC отменяет Дьявола и оборачивает его: теперь ты можешь сыграть Дьявола за напарника Красного, Синего. Ты выбираешь карту из руки Синего и играешь её за Синего. Редкий, но мощный поворот!',
    },
  },
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
