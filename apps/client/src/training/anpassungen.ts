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
      fr: "Touche d'abord une bille noire dans ton aire de départ, puis ta case de départ. Le 1 est déjà sélectionné, car c'est ta seule carte jouable.",
      es: 'Toca primero una bola negra de tu antesala y luego tu casilla de salida. El 1 ya está seleccionado porque es tu única carta jugable.',
      it: "Tocca prima una biglia nera nella tua area di partenza e poi la tua casella di partenza. L'1 è già selezionato perché è la tua unica carta giocabile.",
      hi: 'पहले अपने प्रारंभिक क्षेत्र की किसी काली गोली पर टैप करें, फिर अपने स्टार्ट खाने पर। 1 पहले से चुना हुआ है, क्योंकि यही आपका एकमात्र खेलने योग्य कार्ड है।',
      sv: 'Tryck först på en svart kula i ditt bo och sedan på din startruta. 1:an är redan vald eftersom det är ditt enda spelbara kort.',
      fi: 'Napauta ensin mustaa kuulaa pesässäsi ja sitten aloitusruutuasi. 1 on jo valittuna, koska se on ainoa pelattava korttisi.',
      nb: 'Trykk først på en svart kule i boet ditt og deretter på startfeltet ditt. 1-eren er allerede valgt fordi den er ditt eneste spillbare kort.',
      da: "Tryk først på en sort kugle i dit bo og derefter på dit startfelt. 1'eren er allerede valgt, fordi det er dit eneste spilbare kort.",
      tr: 'Önce yuvandaki siyah bir bilyeye, sonra çıkış alanına dokun. 1 zaten seçili, çünkü oynanabilir tek kartın o.',
    },
  },
  s_a02: {
    tipp: {
      de: 'Die 13 ist auch eine Heraushol-Karte! Tippe zuerst auf eine schwarze Kugel in deinem Vorfeld und dann auf dein Startfeld.',
      en: 'The 13 is also a card to get out! First tap a black marble in your base, then tap your start field.',
      ru: '13 тоже позволяет вывести шарик! Сначала нажми на чёрный шарик в своей базе, а затем на своё стартовое поле.',
      fr: "Le 13 est aussi une carte de sortie ! Touche d'abord une bille noire dans ton aire de départ, puis ta case de départ.",
      es: '¡El 13 también es una carta para salir! Toca primero una bola negra de tu antesala y luego tu casilla de salida.',
      it: 'Anche il 13 è una carta per uscire! Tocca prima una biglia nera nella tua area di partenza e poi la tua casella di partenza.',
      hi: '13 भी बाहर निकालने का कार्ड है! पहले अपने प्रारंभिक क्षेत्र की किसी काली गोली पर टैप करें, फिर अपने स्टार्ट खाने पर।',
      sv: '13:an är också ett öppningskort! Tryck först på en svart kula i ditt bo och sedan på din startruta.',
      fi: 'Myös 13 on avauskortti! Napauta ensin mustaa kuulaa pesässäsi ja sitten aloitusruutuasi.',
      nb: '13-eren er også et åpningskort! Trykk først på en svart kule i boet ditt og deretter på startfeltet ditt.',
      da: "13'eren er også et åbningskort! Tryk først på en sort kugle i dit bo og derefter på dit startfelt.",
      tr: '13 de bir çıkış kartıdır! Önce yuvandaki siyah bir bilyeye, sonra çıkış alanına dokun.',
    },
  },
  s_a09: {
    tipp: {
      de: 'Alle Kugeln sind im Vorfeld und du hast keine 1 oder 13, also bleibt nur Abwerfen. Tippe auf eine beliebige Karte und dann auf den roten Knopf „Abwerfen“.',
      en: 'All your marbles are in the base and you have no 1 or 13, so all you can do is discard. Tap any card, then tap the red “Discard the card” button.',
      ru: 'Все шарики в базе, а 1 или 13 у тебя нет, значит, остаётся только сбросить карту. Нажми на любую карту, а затем на красную кнопку «Сбросить карту».',
      fr: "Toutes tes billes sont dans l'aire de départ et tu n'as ni 1 ni 13 : il ne reste qu'à défausser. Touche n'importe quelle carte, puis le bouton rouge « Défausser la carte ».",
      es: 'Todas tus bolas están en la antesala y no tienes ni 1 ni 13, así que solo puedes descartar. Toca cualquier carta y luego el botón rojo «Descartar la carta».',
      it: "Tutte le tue biglie sono nell'area di partenza e non hai né 1 né 13, quindi puoi solo scartare. Tocca una carta qualsiasi e poi il pulsante rosso «Scarta la carta».",
      hi: 'आपकी सभी गोलियाँ प्रारंभिक क्षेत्र में हैं और आपके पास न 1 है न 13, इसलिए केवल त्यागना बचता है। किसी भी कार्ड पर टैप करें, फिर लाल बटन “कार्ड त्यागें” पर।',
      sv: 'Alla dina kulor är i boet och du har varken 1 eller 13, så du kan bara kasta. Tryck på valfritt kort och sedan på den röda knappen ”Kasta kortet”.',
      fi: 'Kaikki kuulasi ovat pesässä eikä sinulla ole 1:tä tai 13:a, joten voit vain hylätä. Napauta mitä tahansa korttia ja sitten punaista painiketta ”Hylkää kortti”.',
      nb: 'Alle kulene dine er i boet og du har verken 1 eller 13, så du kan bare kaste. Trykk på et valgfritt kort og deretter på den røde knappen «Kast kortet».',
      da: 'Alle dine kugler er i boet, og du har hverken 1 eller 13, så du kan kun kaste. Tryk på et valgfrit kort og derefter på den røde knap »Kast kortet«.',
      tr: 'Tüm bilyelerin yuvada ve elinde 1 ya da 13 yok, yani yalnızca kart atabilirsin. Herhangi bir karta, sonra kırmızı “Kartı at” düğmesine dokun.',
    },
  },
  s_a03: {
    tipp: {
      de: 'Tippe auf eine Normalkarte, dann auf deine schwarze Kugel und danach auf die Projektion auf dem Spielfeld, also das Feld, auf dem die Kugel landen würde. Normalkarten ziehen exakt ihren Zahlenwert.',
      en: 'Tap a normal card, then your black marble, and then the projection on the board, i.e. the field where the marble would land. Normal cards move exactly their number.',
      ru: 'Нажми на обычную карту, затем на свой чёрный шарик, а потом на проекцию на игровом поле, то есть на клетку, куда шарик попадёт. Обычные карты ходят ровно на своё число.',
      fr: "Touche une carte normale, puis ta bille noire, puis la projection sur le plateau, c'est à dire la case où la bille arriverait. Les cartes normales avancent exactement de leur valeur.",
      es: 'Toca una carta normal, luego tu bola negra y después la proyección en el tablero, es decir, la casilla donde caería la bola. Las cartas normales avanzan exactamente su valor.',
      it: 'Tocca una carta normale, poi la tua biglia nera e infine la proiezione sul tabellone, cioè la casella dove arriverebbe la biglia. Le carte normali avanzano esattamente del loro valore.',
      hi: 'किसी सामान्य कार्ड पर टैप करें, फिर अपनी काली गोली पर और उसके बाद बोर्ड पर प्रोजेक्शन पर, यानी उस खाने पर जहाँ गोली पहुँचेगी। सामान्य कार्ड ठीक अपने अंक जितना चलते हैं।',
      sv: 'Tryck på ett vanligt kort, sedan på din svarta kula och därefter på projektionen på brädet, alltså rutan där kulan skulle landa. Vanliga kort går exakt sitt siffervärde.',
      fi: 'Napauta tavallista korttia, sitten mustaa kuulaasi ja lopuksi projektiota laudalla, eli ruutua, johon kuula päätyisi. Tavalliset kortit liikkuvat tasan numeronsa verran.',
      nb: 'Trykk på et vanlig kort, så på den svarte kulen din og deretter på projeksjonen på brettet, altså feltet der kulen ville landet. Vanlige kort flytter nøyaktig tallverdien sin.',
      da: 'Tryk på et normalt kort, så på din sorte kugle og derefter på projektionen på brættet, altså feltet hvor kuglen ville lande. Normale kort rykker præcis deres talværdi.',
      tr: 'Bir normal karta, sonra siyah bilyene, ardından tahtadaki projeksiyona, yani bilyenin varacağı alana dokun. Normal kartlar tam olarak sayı değerleri kadar ilerler.',
    },
  },
  s_a03c: {
    tipp: {
      de: 'Tippe auf eine Karte, dann auf eine deiner schwarzen Kugeln auf dem Spielfeld und danach auf die weiße Projektion, also das Feld, auf das die Kugel laufen würde.',
      en: 'Tap a card, then one of your black marbles on the board, and then the white projection, i.e. the field the marble would move to.',
      ru: 'Нажми на карту, затем на один из своих чёрных шариков на поле, а потом на белую проекцию, то есть на клетку, куда шарик пойдёт.',
      fr: "Touche une carte, puis une de tes billes noires sur le plateau, puis la projection blanche, c'est à dire la case où la bille irait.",
      es: 'Toca una carta, luego una de tus bolas negras en el tablero y después la proyección blanca, es decir, la casilla a la que iría la bola.',
      it: 'Tocca una carta, poi una delle tue biglie nere sul tabellone e infine la proiezione bianca, cioè la casella dove andrebbe la biglia.',
      hi: 'किसी कार्ड पर टैप करें, फिर बोर्ड पर अपनी किसी काली गोली पर और उसके बाद सफ़ेद प्रोजेक्शन पर, यानी उस खाने पर जहाँ गोली जाएगी।',
      sv: 'Tryck på ett kort, sedan på en av dina svarta kulor på brädet och därefter på den vita projektionen, alltså rutan kulan skulle gå till.',
      fi: 'Napauta korttia, sitten yhtä mustista kuulistasi laudalla ja lopuksi valkoista projektiota, eli ruutua, johon kuula liikkuisi.',
      nb: 'Trykk på et kort, så på en av de svarte kulene dine på brettet og deretter på den hvite projeksjonen, altså feltet kulen ville gått til.',
      da: 'Tryk på et kort, så på en af dine sorte kugler på brættet og derefter på den hvide projektion, altså feltet, kuglen ville rykke til.',
      tr: 'Bir karta, sonra tahtadaki siyah bilyelerinden birine, ardından beyaz projeksiyona, yani bilyenin gideceği alana dokun.',
    },
  },
  s_a07: {
    tipp: {
      de: 'Du hast bereits eine Kugel auf Feld 5. Tippe auf die 1, dann auf eine schwarze Kugel in deinem Vorfeld und danach auf die weiße Projektion auf deinem Startfeld.',
      en: 'You already have a marble on field 5. Tap the 1, then a black marble in your base, and then the white projection on your start field.',
      ru: 'У тебя уже есть шарик на поле 5. Нажми на 1, затем на чёрный шарик в своей базе, а потом на белую проекцию на своём стартовом поле.',
      fr: 'Tu as déjà une bille sur la case 5. Touche le 1, puis une bille noire dans ton aire de départ, puis la projection blanche sur ta case de départ.',
      es: 'Ya tienes una bola en la casilla 5. Toca el 1, luego una bola negra de tu antesala y después la proyección blanca en tu casilla de salida.',
      it: "Hai già una biglia sulla casella 5. Tocca l'1, poi una biglia nera nella tua area di partenza e infine la proiezione bianca sulla tua casella di partenza.",
      hi: 'आपकी एक गोली पहले से खाना 5 पर है। 1 पर टैप करें, फिर अपने प्रारंभिक क्षेत्र की किसी काली गोली पर और उसके बाद अपने स्टार्ट खाने पर सफ़ेद प्रोजेक्शन पर।',
      sv: 'Du har redan en kula på ruta 5. Tryck på 1:an, sedan på en svart kula i ditt bo och därefter på den vita projektionen på din startruta.',
      fi: 'Sinulla on jo kuula ruudussa 5. Napauta 1:tä, sitten mustaa kuulaa pesässäsi ja lopuksi valkoista projektiota aloitusruudussasi.',
      nb: 'Du har allerede en kule på felt 5. Trykk på 1-eren, så på en svart kule i boet ditt og deretter på den hvite projeksjonen på startfeltet ditt.',
      da: "Du har allerede en kugle på felt 5. Tryk på 1'eren, så på en sort kugle i dit bo og derefter på den hvide projektion på dit startfelt.",
      tr: "Zaten 5. alanda bir bilyen var. 1'e, sonra yuvandaki siyah bir bilyeye, ardından çıkış alanındaki beyaz projeksiyona dokun.",
    },
  },
  // Engel: bei Tac-With-Bug wählt man die Kugel des anderen im Vorfeld und dann sein Startfeld.
  s_f23: {
    tipp: {
      de: 'Wähle den Engel. Der nächste Spieler (Blau) wird gezwungen, eine Kugel heraus zu holen. Tippe dazu auf eine blaue Kugel in Blaus Vorfeld und dann auf das Startfeld von Blau.',
      en: "Choose the Angel. The next player (Blue) is forced to bring a marble out. Tap a blue marble in Blue's base, then Blue's start field.",
      ru: 'Выбери Ангела. Следующий игрок (Синий) обязан вывести шарик. Нажми на синий шарик в базе Синего, а затем на стартовое поле Синего.',
      fr: "Choisis l'Ange. Le joueur suivant (Bleu) est obligé de sortir une bille. Touche pour cela une bille bleue dans l'aire de départ de Bleu, puis la case de départ de Bleu.",
      es: 'Elige el Ángel. El siguiente jugador (Azul) está obligado a sacar una bola. Para ello toca una bola azul de la antesala de Azul y luego la casilla de salida de Azul.',
      it: "Scegli l'Angelo. Il giocatore successivo (Blu) è costretto a far uscire una biglia. Tocca una biglia blu nell'area di partenza di Blu e poi la casella di partenza di Blu.",
      hi: 'फ़रिश्ता चुनें। अगला खिलाड़ी (नीला) एक गोली बाहर निकालने को मजबूर है। इसके लिए नीले के प्रारंभिक क्षेत्र की किसी नीली गोली पर टैप करें, फिर नीले के स्टार्ट खाने पर।',
      sv: 'Välj ängeln. Nästa spelare (Blå) tvingas ta ut en kula. Tryck på en blå kula i Blås bo och sedan på Blås startruta.',
      fi: 'Valitse Enkeli. Seuraava pelaaja (Sininen) on pakotettu ottamaan kuulan ulos. Napauta sinistä kuulaa Sinisen pesässä ja sitten Sinisen aloitusruutua.',
      nb: 'Velg engelen. Neste spiller (Blå) blir tvunget til å ta ut en kule. Trykk på en blå kule i Blås bo og deretter på Blås startfelt.',
      da: 'Vælg englen. Den næste spiller (Blå) tvinges til at tage en kugle ud. Tryk på en blå kugle i Blås bo og derefter på Blås startfelt.',
      tr: 'Meleği seç. Sıradaki oyuncu (Mavi) bir bilye çıkarmak zorunda. Bunun için Mavinin yuvasındaki mavi bir bilyeye, sonra Mavinin çıkış alanına dokun.',
    },
  },
  s_f24: {
    tipp: {
      de: 'Blau ist fertig, der Engel geht automatisch an Rot weiter. Rot muss eine Kugel heraus holen. Tippe dazu auf eine rote Kugel in Rots Vorfeld und dann auf das Startfeld von Rot.',
      en: "Blue is finished, so the Angel passes on to Red automatically. Red has to bring a marble out. Tap a red marble in Red's base, then Red's start field.",
      ru: 'Синий закончил, поэтому Ангел автоматически переходит к Красному. Красный должен вывести шарик. Нажми на красный шарик в базе Красного, а затем на стартовое поле Красного.',
      fr: "Bleu a terminé, l'Ange passe donc automatiquement à Rouge. Rouge doit sortir une bille. Touche pour cela une bille rouge dans l'aire de départ de Rouge, puis la case de départ de Rouge.",
      es: 'Azul ha terminado, así que el Ángel pasa automáticamente a Rojo. Rojo tiene que sacar una bola. Para ello toca una bola roja de la antesala de Rojo y luego la casilla de salida de Rojo.',
      it: "Blu ha finito, quindi l'Angelo passa automaticamente a Rosso. Rosso deve far uscire una biglia. Tocca una biglia rossa nell'area di partenza di Rosso e poi la casella di partenza di Rosso.",
      hi: 'नीला पूरा कर चुका है, इसलिए फ़रिश्ता अपने आप लाल को जाता है। लाल को एक गोली बाहर निकालनी होगी। इसके लिए लाल के प्रारंभिक क्षेत्र की किसी लाल गोली पर टैप करें, फिर लाल के स्टार्ट खाने पर।',
      sv: 'Blå är klar, så ängeln går automatiskt vidare till Röd. Röd måste ta ut en kula. Tryck på en röd kula i Röds bo och sedan på Röds startruta.',
      fi: 'Sininen on valmis, joten Enkeli siirtyy automaattisesti Punaiselle. Punaisen on otettava kuula ulos. Napauta punaista kuulaa Punaisen pesässä ja sitten Punaisen aloitusruutua.',
      nb: 'Blå er ferdig, så engelen går automatisk videre til Rød. Rød må ta ut en kule. Trykk på en rød kule i Røds bo og deretter på Røds startfelt.',
      da: 'Blå er færdig, så englen går automatisk videre til Rød. Rød skal tage en kugle ud. Tryk på en rød kugle i Røds bo og derefter på Røds startfelt.',
      tr: 'Mavi bitirdi, bu yüzden Melek otomatik olarak Kırmızıya geçer. Kırmızı bir bilye çıkarmak zorunda. Bunun için Kırmızının yuvasındaki kırmızı bir bilyeye, sonra Kırmızının çıkış alanına dokun.',
    },
  },
  // TAC kopiert die 8: bei Tac-With-Bug gibt es keinen Knopf „Laufen“, man zieht direkt über die Projektion.
  s_e09a: {
    tipp: {
      de: 'Spiele TAC, um die 8 zu kopieren. Tippe dann auf deine schwarze Kugel und danach auf die Projektion, 8 Felder weiter auf Feld 18.',
      en: 'Play TAC to copy the 8. Then tap your black marble and then the projection, 8 fields ahead on field 18.',
      ru: 'Сыграй TAC, чтобы скопировать 8. Затем нажми на свой чёрный шарик, а потом на проекцию, на 8 полей дальше, на поле 18.',
      fr: 'Joue le TAC pour copier le 8. Touche ensuite ta bille noire, puis la projection, 8 cases plus loin sur la case 18.',
      es: 'Juega el TAC para copiar el 8. Luego toca tu bola negra y después la proyección, 8 casillas más allá, en la casilla 18.',
      it: "Gioca il TAC per copiare l'8. Poi tocca la tua biglia nera e infine la proiezione, 8 caselle più avanti sulla casella 18.",
      hi: '8 की नकल करने के लिए TAC खेलें। फिर अपनी काली गोली पर और उसके बाद प्रोजेक्शन पर टैप करें, 8 खाने आगे खाना 18 पर।',
      sv: 'Spela TAC för att kopiera 8:an. Tryck sedan på din svarta kula och därefter på projektionen, 8 rutor längre fram på ruta 18.',
      fi: 'Pelaa TAC kopioidaksesi 8:n. Napauta sitten mustaa kuulaasi ja lopuksi projektiota 8 ruutua edempänä ruudussa 18.',
      nb: 'Spill TAC for å kopiere 8-eren. Trykk så på den svarte kulen din og deretter på projeksjonen, 8 felt lenger frem på felt 18.',
      da: "Spil TAC for at kopiere 8'eren. Tryk så på din sorte kugle og derefter på projektionen, 8 felter længere fremme på felt 18.",
      tr: "8'i kopyalamak için TAC oyna. Sonra siyah bilyene, ardından 8 alan ilerideki 18. alandaki projeksiyona dokun.",
    },
  },
  s_e12: {
    tipp: {
      de: 'TAC ist deine einzige Karte und spielbar, also musst du sie spielen! TAC übernimmt den Engel: Tippe auf TAC, dann auf eine blaue Kugel in Blaus Vorfeld und danach auf das Startfeld von Blau. Leider schlecht für dich: Deine Kugel geht zurück ins Vorfeld und Blau (der nächste Spieler) kommt heraus. Manchmal schadet TAC dem eigenen Team.',
      en: "TAC is your only card and it's playable, so you must play it! TAC takes over the Angel: tap TAC, then a blue marble in Blue's base, and then Blue's start field. Unfortunately bad for you: your marble goes back to the base and Blue (the next player) comes out. Sometimes TAC hurts your own team.",
      ru: 'TAC, твоя единственная карта, и ею можно сыграть, поэтому ты обязан её разыграть! TAC перенимает Ангела: нажми на TAC, затем на синий шарик в базе Синего, а потом на стартовое поле Синего. Увы, для тебя это плохо: твой шарик возвращается в базу, а Синий (следующий игрок) выходит. Иногда TAC вредит собственной команде.',
      fr: "Le TAC est ta seule carte et il est jouable, tu dois donc le jouer ! Le TAC reprend l'Ange : touche le TAC, puis une bille bleue dans l'aire de départ de Bleu, puis la case de départ de Bleu. Malheureusement mauvais pour toi : ta bille retourne dans l'aire de départ et Bleu (le joueur suivant) sort. Parfois le TAC nuit à sa propre équipe.",
      es: 'El TAC es tu única carta y se puede jugar, ¡así que debes jugarlo! El TAC toma el Ángel: toca el TAC, luego una bola azul de la antesala de Azul y después la casilla de salida de Azul. Por desgracia, malo para ti: tu bola vuelve a la antesala y Azul (el siguiente jugador) sale. A veces el TAC perjudica a tu propio equipo.',
      it: "Il TAC è la tua unica carta ed è giocabile, quindi devi giocarlo! Il TAC prende l'Angelo: tocca il TAC, poi una biglia blu nell'area di partenza di Blu e infine la casella di partenza di Blu. Purtroppo male per te: la tua biglia torna nell'area di partenza e Blu (il giocatore successivo) esce. A volte il TAC danneggia la propria squadra.",
      hi: 'TAC आपका एकमात्र कार्ड है और खेला जा सकता है, इसलिए आपको इसे खेलना होगा! TAC फ़रिश्ते को अपना लेता है: TAC पर टैप करें, फिर नीले के प्रारंभिक क्षेत्र की किसी नीली गोली पर और उसके बाद नीले के स्टार्ट खाने पर। दुर्भाग्य से आपके लिए बुरा: आपकी गोली प्रारंभिक क्षेत्र में लौट जाती है और नीला (अगला खिलाड़ी) बाहर आता है। कभी-कभी TAC अपनी ही टीम को नुकसान पहुँचाता है।',
      sv: 'TAC är ditt enda kort och det är spelbart, så du måste spela det! TAC tar över ängeln: tryck på TAC, sedan på en blå kula i Blås bo och därefter på Blås startruta. Tyvärr dåligt för dig: din kula går tillbaka till boet och Blå (nästa spelare) kommer ut. Ibland skadar TAC det egna laget.',
      fi: 'TAC on ainoa korttisi ja se on pelattava, joten sinun on pelattava se! TAC ottaa Enkelin: napauta TACia, sitten sinistä kuulaa Sinisen pesässä ja lopuksi Sinisen aloitusruutua. Valitettavasti huono sinulle: kuulasi palaa pesään ja Sininen (seuraava pelaaja) tulee ulos. Joskus TAC vahingoittaa omaa joukkuetta.',
      nb: 'TAC er ditt eneste kort og det er spillbart, så du må spille det! TAC overtar engelen: trykk på TAC, så på en blå kule i Blås bo og deretter på Blås startfelt. Dessverre dårlig for deg: kulen din går tilbake til boet og Blå (neste spiller) kommer ut. Noen ganger skader TAC eget lag.',
      da: 'TAC er dit eneste kort, og det kan spilles, så du skal spille det! TAC overtager englen: tryk på TAC, så på en blå kugle i Blås bo og derefter på Blås startfelt. Desværre dårligt for dig: din kugle går tilbage til boet, og Blå (den næste spiller) kommer ud. Nogle gange skader TAC ens eget hold.',
      tr: "TAC tek kartın ve oynanabilir, bu yüzden oynamak zorundasın! TAC Meleği devralır: TAC'a, sonra Mavinin yuvasındaki mavi bir bilyeye, ardından Mavinin çıkış alanına dokun. Ne yazık ki senin için kötü: bilyen yuvaya döner ve Mavi (sıradaki oyuncu) çıkar. Bazen TAC kendi takımına zarar verir.",
    },
  },
  // Blau hat nur den TAC: nach dem Narren hast du keine andere Karte und musst ihn spielen.
  s_f29: {
    andereHaende: { '1': ['tac'] },
    tipp: {
      de: 'Spiele den Narren. Alle geben ihre Karten weiter. Du erhältst durch den Tausch Blaus einzige Karte, einen TAC. Setze ihn ein, um den letzten Zug vor dem Narren rückgängig zu machen!',
      en: "Play the Fool. Everyone passes their cards on. Through the swap you receive Blue's only card, a TAC. Use it to undo the last move before the Fool!",
      ru: 'Сыграй Шута. Все передают карты. Благодаря обмену ты получаешь единственную карту Синего, TAC. Используй её, чтобы отменить последний ход перед Шутом!',
      fr: "Joue le Fou. Tout le monde passe ses cartes. Grâce à l'échange, tu reçois la seule carte de Bleu, un TAC. Utilise-le pour annuler le dernier coup avant le Fou !",
      es: 'Juega el Loco. Todos pasan sus cartas. Con el intercambio recibes la única carta de Azul, un TAC. ¡Úsalo para deshacer la última jugada antes del Loco!',
      it: "Gioca il Matto. Tutti passano le loro carte. Con lo scambio ricevi l'unica carta di Blu, un TAC. Usalo per annullare l'ultima mossa prima del Matto!",
      hi: 'विदूषक खेलें। सब अपने कार्ड आगे देते हैं। अदला-बदली से आपको नीले का एकमात्र कार्ड, एक TAC, मिलता है। इसका उपयोग विदूषक से पहले की आखिरी चाल रद्द करने के लिए करें!',
      sv: 'Spela narren. Alla skickar sina kort vidare. Genom bytet får du Blås enda kort, ett TAC. Använd det för att ångra senaste draget före narren!',
      fi: 'Pelaa Narri. Kaikki antavat korttinsa eteenpäin. Vaihdossa saat Sinisen ainoan kortin, TACin. Käytä sitä perumaan viimeinen siirto ennen Narria!',
      nb: 'Spill narren. Alle gir kortene sine videre. Gjennom byttet får du Blås eneste kort, en TAC. Bruk den til å angre siste trekk før narren!',
      da: 'Spil narren. Alle giver deres kort videre. Gennem byttet får du Blås eneste kort, et TAC. Brug det til at fortryde det sidste træk før narren!',
      tr: "Soytarıyı oyna. Herkes kartlarını devreder. Takas sayesinde Mavinin tek kartını, bir TAC'ı alırsın. Soytarıdan önceki son hamleyi geri almak için onu kullan!",
    },
  },
  // Teufel + TAC: in der Aufgabe sagen, dass Rot deinen TAC gespielt hat.
  s_e13: {
    aufgabe: {
      de: 'Rot hat den Teufel gespielt und danach aus deiner Hand (Schwarz) den TAC. Dadurch darfst du jetzt für Blau spielen: Spiele eine Karte von Blau!',
      en: "Red played the Devil and then the TAC from your hand (Black). That lets you play for Blue now: play one of Blue's cards!",
      ru: 'Красный сыграл Дьявола, а затем TAC из твоей руки (Чёрный). Поэтому теперь ты играешь за Синего: сыграй карту Синего!',
      fr: 'Rouge a joué le Diable, puis le TAC de ta main (Noir). Tu peux donc maintenant jouer pour Bleu : joue une carte de Bleu !',
      es: 'Rojo jugó el Diablo y después el TAC de tu mano (Negro). Por eso ahora puedes jugar para Azul: ¡juega una carta de Azul!',
      it: 'Rosso ha giocato il Diavolo e poi il TAC dalla tua mano (Nero). Così ora puoi giocare per Blu: gioca una carta di Blu!',
      hi: 'लाल ने शैतान खेला और फिर आपके हाथ (काला) से TAC। इसलिए अब आप नीले के लिए खेल सकते हैं: नीले का एक कार्ड खेलें!',
      sv: 'Röd spelade djävulen och sedan TAC från din hand (Svart). Därför får du nu spela för Blå: spela ett av Blås kort!',
      fi: 'Punainen pelasi Pirun ja sitten TACin kädestäsi (Musta). Siksi saat nyt pelata Sinisen puolesta: pelaa yksi Sinisen korteista!',
      nb: 'Rød spilte djevelen og deretter TAC fra hånden din (Svart). Derfor kan du nå spille for Blå: spill et av Blås kort!',
      da: 'Rød spillede djævelen og derefter TAC fra din hånd (Sort). Derfor må du nu spille for Blå: spil et af Blås kort!',
      tr: "Kırmızı Şeytanı, ardından senin elinden (Siyah) TAC'ı oynadı. Bu yüzden artık Mavi için oynayabilirsin: Mavinin bir kartını oyna!",
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
      fr: "Rouge est sur la case 51, trois cases avant sa case de départ. Avec le 4 en arrière, Rouge irait directement dans la maison. Joue le 5 (45 → 50) pour te placer juste derrière Rouge. Tu bloques ainsi le −4 ! Le 2 n'aide pas : sur la case 47, tu n'es pas entre Rouge et sa maison.",
      es: 'Rojo está en la casilla 51, tres casillas antes de su casilla de salida. Con el 4 hacia atrás, Rojo entraría directamente en casa. Juega el 5 (45 → 50) para ponerte justo detrás de Rojo. ¡Así bloqueas el −4! El 2 no sirve: en la casilla 47 no estás entre Rojo y su casa.',
      it: "Rosso è sulla casella 51, tre caselle prima della sua casella di partenza. Con il 4 all'indietro, Rosso entrerebbe direttamente nella casa. Gioca il 5 (45 → 50) per metterti subito dietro Rosso. Così blocchi il −4! Il 2 non aiuta: sulla casella 47 non sei tra Rosso e la sua casa.",
      hi: 'लाल खाना 51 पर है, अपने स्टार्ट खाने से तीन खाने पहले। 4 पीछे से लाल सीधे घर में चला जाता। लाल के ठीक पीछे आने के लिए 5 खेलें (45 → 50)। इस तरह आप −4 को रोक देते हैं! 2 मदद नहीं करता: खाना 47 पर आप लाल और उसके घर के बीच नहीं हैं।',
      sv: 'Röd står på ruta 51, tre rutor före sin startruta. Med 4:an bakåt skulle Röd gå direkt in i hemmet. Spela 5:an (45 → 50) för att ställa dig precis bakom Röd. Så blockerar du −4! 2:an hjälper inte: på ruta 47 står du inte mellan Röd och dess hem.',
      fi: 'Punainen on ruudussa 51, kolme ruutua ennen aloitusruutuaan. 4:llä taaksepäin Punainen pääsisi suoraan kotiin. Pelaa 5 (45 → 50) asettuaksesi heti Punaisen taakse. Näin estät −4:n! 2 ei auta: ruudussa 47 et ole Punaisen ja sen kodin välissä.',
      nb: 'Rød står på felt 51, tre felt før startfeltet sitt. Med 4-eren bakover ville Rød gått rett inn i hjemmet. Spill 5-eren (45 → 50) for å stille deg rett bak Rød. Slik blokkerer du −4! 2-eren hjelper ikke: på felt 47 står du ikke mellom Rød og hjemmet.',
      da: "Rød står på felt 51, tre felter før sit startfelt. Med 4'eren baglæns ville Rød gå direkte ind i hjemmet. Spil 5'eren (45 → 50) for at stille dig lige bag Rød. Så blokerer du −4! 2'eren hjælper ikke: på felt 47 står du ikke mellem Rød og dens hjem.",
      tr: "Kırmızı 51. alanda, çıkış alanından üç alan önce. 4 geri ile Kırmızı doğrudan eve girerdi. Kırmızının hemen arkasına geçmek için 5'i oyna (45 → 50). Böylece −4'ü engellersin! 2 işe yaramaz: 47. alanda Kırmızı ile evi arasında değilsin.",
    },
  },
  s_g12a: {
    aufgabe: {
      de: 'Es wird getauscht. Wer eine 1 oder 13 hat, kann raus. Das siehst du an der 13 bei seinen verdeckten Karten: Angezeigt wird immer nur eine 13, egal ob er eine 1 oder eine 13 hat. Wie viele Spieler können raus?',
      en: 'Cards are being swapped. Anyone with a 1 or 13 can get out. You can tell by the 13 among their face-down cards: only a 13 is ever shown, no matter whether they hold a 1 or a 13. How many players can get out?',
      ru: 'Идёт обмен картами. Кто держит 1 или 13, может выйти. Это видно по 13 среди его закрытых карт: показывается всегда только 13, неважно, есть ли у него 1 или 13. Сколько игроков могут выйти?',
      fr: "On échange les cartes. Qui a un 1 ou un 13 peut sortir. Tu le vois au 13 parmi ses cartes cachées : seul un 13 est affiché, qu'il ait un 1 ou un 13. Combien de joueurs peuvent sortir ?",
      es: 'Se están intercambiando cartas. Quien tenga un 1 o un 13 puede salir. Lo ves por el 13 entre sus cartas boca abajo: siempre se muestra solo un 13, tenga un 1 o un 13. ¿Cuántos jugadores pueden salir?',
      it: 'Si scambiano le carte. Chi ha un 1 o un 13 può uscire. Lo vedi dal 13 tra le sue carte coperte: viene sempre mostrato solo un 13, che abbia un 1 o un 13. Quanti giocatori possono uscire?',
      hi: 'कार्डों की अदला-बदली हो रही है। जिसके पास 1 या 13 है, वह बाहर निकल सकता है। यह उसके उल्टे कार्डों में 13 से दिखता है: हमेशा केवल 13 दिखाया जाता है, चाहे उसके पास 1 हो या 13। कितने खिलाड़ी बाहर निकल सकते हैं?',
      sv: 'Korten byts. Den som har en 1:a eller 13:a kan komma ut. Det ser du på 13:an bland deras dolda kort: bara en 13:a visas alltid, oavsett om de har en 1:a eller en 13:a. Hur många spelare kan komma ut?',
      fi: 'Kortteja vaihdetaan. Jolla on 1 tai 13, pääsee ulos. Sen näkee 13:sta hänen piilokorttiensa joukossa: näytetään aina vain 13, oli hänellä 1 tai 13. Montako pelaajaa pääsee ulos?',
      nb: 'Kortene byttes. Den som har en 1 eller 13 kan komme ut. Det ser du på 13-eren blant de skjulte kortene: det vises alltid bare en 13, uansett om de har en 1 eller en 13. Hvor mange spillere kan komme ut?',
      da: "Kortene byttes. Den, der har en 1 eller 13, kan komme ud. Det kan du se på 13'eren blandt de skjulte kort: der vises altid kun en 13, uanset om de har en 1 eller en 13. Hvor mange spillere kan komme ud?",
      tr: "Kartlar değiştiriliyor. 1 ya da 13'ü olan çıkabilir. Bunu kapalı kartları arasındaki 13'ten anlarsın: elinde 1 de olsa 13 de olsa her zaman yalnızca 13 gösterilir. Kaç oyuncu çıkabilir?",
    },
    tipp: {
      de: 'Schau auf die verdeckten Karten der anderen neben ihren Namen. Bei Grün und Rot ist eine 13 zu sehen, bei Blau nicht. Grün hat eigentlich eine 1, angezeigt wird trotzdem die 13. Deine eigenen Karten siehst du offen: Hast du eine 1 oder 13?',
      en: "Look at the others' face-down cards next to their names. Green and Red show a 13, Blue does not. Green actually holds a 1, but the 13 is shown anyway. You see your own cards face up: do you have a 1 or 13?",
      ru: 'Посмотри на закрытые карты других рядом с их именами. У Зелёного и Красного видна 13, у Синего нет. У Зелёного на самом деле 1, но показывается всё равно 13. Свои карты ты видишь открыто: есть ли у тебя 1 или 13?',
      fr: "Regarde les cartes cachées des autres à côté de leur nom. Chez Vert et Rouge on voit un 13, pas chez Bleu. Vert a en fait un 1, mais c'est quand même le 13 qui est affiché. Tes propres cartes, tu les vois face visible : as-tu un 1 ou un 13 ?",
      es: 'Mira las cartas boca abajo de los demás junto a sus nombres. En Verde y Rojo se ve un 13, en Azul no. Verde en realidad tiene un 1, pero igualmente se muestra el 13. Tus propias cartas las ves boca arriba: ¿tienes un 1 o un 13?',
      it: 'Guarda le carte coperte degli altri accanto ai loro nomi. Da Verde e Rosso si vede un 13, da Blu no. Verde in realtà ha un 1, ma viene mostrato comunque il 13. Le tue carte le vedi scoperte: hai un 1 o un 13?',
      hi: 'दूसरों के नाम के पास उनके उल्टे कार्ड देखें। हरे और लाल के पास 13 दिखता है, नीले के पास नहीं। हरे के पास असल में 1 है, फिर भी 13 दिखाया जाता है। अपने कार्ड आप खुले देखते हैं: क्या आपके पास 1 या 13 है?',
      sv: 'Titta på de andras dolda kort bredvid deras namn. Hos Grön och Röd syns en 13:a, hos Blå inte. Grön har egentligen en 1:a, men 13:an visas ändå. Dina egna kort ser du öppet: har du en 1:a eller 13:a?',
      fi: 'Katso muiden piilokortteja heidän nimiensä vieressä. Vihreällä ja Punaisella näkyy 13, Sinisellä ei. Vihreällä on oikeasti 1, mutta silti näytetään 13. Omat korttisi näet avoimina: onko sinulla 1 tai 13?',
      nb: 'Se på de andres skjulte kort ved siden av navnene. Hos Grønn og Rød vises en 13, hos Blå ikke. Grønn har egentlig en 1, men 13-eren vises likevel. Dine egne kort ser du åpent: har du en 1 eller 13?',
      da: "Se på de andres skjulte kort ved siden af deres navne. Hos Grøn og Rød ses en 13, hos Blå ikke. Grøn har faktisk en 1, men 13'eren vises alligevel. Dine egne kort ser du åbent: har du en 1 eller 13?",
      tr: "Diğerlerinin isimlerinin yanındaki kapalı kartlarına bak. Yeşilde ve Kırmızıda bir 13 görünüyor, Mavide görünmüyor. Yeşilin aslında 1'i var ama yine de 13 gösteriliyor. Kendi kartlarını açık görürsün: sende 1 ya da 13 var mı?",
    },
    erfolg: {
      de: 'Richtig! Bei Grün und Rot ist die 13 zu sehen, auch wenn Grün nur eine 1 hat. Du und Blau habt keine. Also können 2 Spieler raus.',
      en: 'Correct! Green and Red show the 13, even though Green only holds a 1. You and Blue have none. So 2 players can get out.',
      ru: 'Верно! У Зелёного и Красного видна 13, хотя у Зелёного только 1. У тебя и у Синего нет. Значит, выйти могут 2 игрока.',
      fr: "Exact ! Chez Vert et Rouge on voit le 13, même si Vert n'a qu'un 1. Toi et Bleu n'en avez pas. Donc 2 joueurs peuvent sortir.",
      es: '¡Correcto! En Verde y Rojo se ve el 13, aunque Verde solo tenga un 1. Tú y Azul no tenéis ninguno. Así que 2 jugadores pueden salir.',
      it: 'Giusto! Da Verde e Rosso si vede il 13, anche se Verde ha solo un 1. Tu e Blu non ne avete. Quindi 2 giocatori possono uscire.',
      hi: 'सही! हरे और लाल के पास 13 दिखता है, भले ही हरे के पास केवल 1 है। आपके और नीले के पास कोई नहीं है। तो 2 खिलाड़ी बाहर निकल सकते हैं।',
      sv: 'Rätt! Hos Grön och Röd syns 13:an, fast Grön bara har en 1:a. Du och Blå har ingen. Alltså kan 2 spelare komma ut.',
      fi: 'Oikein! Vihreällä ja Punaisella näkyy 13, vaikka Vihreällä on vain 1. Sinulla ja Sinisellä ei ole. Siis 2 pelaajaa pääsee ulos.',
      nb: 'Riktig! Hos Grønn og Rød vises 13-eren, selv om Grønn bare har en 1. Du og Blå har ingen. Altså kan 2 spillere komme ut.',
      da: "Rigtigt! Hos Grøn og Rød ses 13'eren, selvom Grøn kun har en 1. Du og Blå har ingen. Altså kan 2 spillere komme ud.",
      tr: "Doğru! Yeşil yalnızca 1'e sahip olsa da Yeşilde ve Kırmızıda 13 görünüyor. Sende ve Mavide yok. Yani 2 oyuncu çıkabilir.",
    },
  },
  s_g12c: {
    titel: {
      de: 'Wer fängt an?',
      en: 'Who starts?',
      ru: 'Кто начинает?',
      fr: 'Qui commence ?',
      es: '¿Quién empieza?',
      it: 'Chi inizia?',
      hi: 'कौन शुरू करता है?',
      sv: 'Vem börjar?',
      fi: 'Kuka aloittaa?',
      nb: 'Hvem starter?',
      da: 'Hvem starter?',
      tr: 'Kim başlar?',
    },
    aufgabe: {
      de: 'Die Karten sind gerade gegeben. Wer fängt diese Runde an?',
      en: 'The cards have just been dealt. Who starts this round?',
      ru: 'Карты только что розданы. Кто начинает этот раунд?',
      fr: "Les cartes viennent d'être distribuées. Qui commence cette manche ?",
      es: 'Las cartas acaban de repartirse. ¿Quién empieza esta ronda?',
      it: 'Le carte sono appena state distribuite. Chi inizia questo round?',
      hi: 'कार्ड अभी-अभी बाँटे गए हैं। यह राउंड कौन शुरू करता है?',
      sv: 'Korten har just delats ut. Vem börjar den här rundan?',
      fi: 'Kortit on juuri jaettu. Kuka aloittaa tämän kierroksen?',
      nb: 'Kortene er nettopp delt ut. Hvem starter denne runden?',
      da: 'Kortene er lige blevet givet. Hvem starter denne runde?',
      tr: 'Kartlar az önce dağıtıldı. Bu turu kim başlatıyor?',
    },
    tipp: {
      de: 'Wer am Zug ist, bei dem steht die oberste verdeckte Karte schräg. Zu Beginn der Runde ist das der Spieler nach dem Geber. Der Kartenstapel liegt beim Geber.',
      en: 'Whoever is to move has their top face-down card tilted. At the start of a round that is the player after the dealer. The deck lies next to the dealer.',
      ru: 'У того, чей ход, верхняя закрытая карта стоит наискосок. В начале раунда это игрок после сдающего. Колода лежит у сдающего.',
      fr: "Celui qui doit jouer a sa carte cachée du dessus inclinée. Au début de la manche, c'est le joueur après celui qui a distribué. Le paquet est posé chez celui qui a distribué.",
      es: 'Quien tiene el turno tiene su carta boca abajo de arriba inclinada. Al principio de la ronda es el jugador después del que reparte. El mazo está junto al que reparte.',
      it: "Chi è di turno ha la carta coperta in cima inclinata. All'inizio del round è il giocatore dopo il mazziere. Il mazzo si trova presso il mazziere.",
      hi: 'जिसकी बारी है, उसका सबसे ऊपर का उल्टा कार्ड तिरछा रखा होता है। राउंड की शुरुआत में वह बाँटने वाले के बाद का खिलाड़ी होता है। कार्डों की गड्डी बाँटने वाले के पास होती है।',
      sv: 'Den som står på tur har sitt översta dolda kort snett. I början av rundan är det spelaren efter given. Kortleken ligger hos den som gav.',
      fi: 'Jonka vuoro on, sen päällimmäinen piilokortti on vinossa. Kierroksen alussa se on jakajan jälkeinen pelaaja. Pakka on jakajan luona.',
      nb: 'Den som står for tur har det øverste skjulte kortet på skrå. I begynnelsen av runden er det spilleren etter giveren. Kortstokken ligger hos giveren.',
      da: 'Den, der er i tur, har sit øverste skjulte kort på skrå. I starten af runden er det spilleren efter giveren. Bunken ligger hos giveren.',
      tr: 'Sırası gelen oyuncunun en üstteki kapalı kartı eğik durur. Tur başında bu, dağıtandan sonraki oyuncudur. Deste dağıtanın yanındadır.',
    },
    erfolg: {
      de: 'Richtig! Bei Rot steht die oberste Karte schräg: Rot fängt an. Gegeben hat Grün, dort liegt der Stapel.',
      en: 'Correct! Red has the tilted top card: Red starts. Green dealt, the deck lies there.',
      ru: 'Верно! У Красного верхняя карта стоит наискосок: начинает Красный. Сдавал Зелёный, колода лежит у него.',
      fr: "Exact ! Chez Rouge, la carte du dessus est inclinée : Rouge commence. C'est Vert qui a distribué, le paquet est chez lui.",
      es: '¡Correcto! Rojo tiene la carta de arriba inclinada: empieza Rojo. Repartió Verde, el mazo está allí.',
      it: 'Giusto! Da Rosso la carta in cima è inclinata: inizia Rosso. Ha distribuito Verde, il mazzo è lì.',
      hi: 'सही! लाल का सबसे ऊपर का कार्ड तिरछा है: लाल शुरू करता है। हरे ने बाँटा था, गड्डी वहीं है।',
      sv: 'Rätt! Hos Röd står det översta kortet snett: Röd börjar. Grön gav, där ligger kortleken.',
      fi: 'Oikein! Punaisen päällimmäinen kortti on vinossa: Punainen aloittaa. Vihreä jakoi, pakka on siellä.',
      nb: 'Riktig! Hos Rød står det øverste kortet på skrå: Rød starter. Grønn ga, der ligger kortstokken.',
      da: 'Rigtigt! Hos Rød står det øverste kort på skrå: Rød starter. Grøn gav, der ligger bunken.',
      tr: 'Doğru! Kırmızıda en üstteki kart eğik: Kırmızı başlar. Yeşil dağıttı, deste orada.',
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
      fr: "16 billes de verre en 4 couleurs (4 de chaque), 104 cartes à jouer et un plateau rond. Chaque couleur a sa propre zone sur le plateau. Les cartes décident jusqu'où et où tes billes se déplacent. Dans tous les tutoriels, tu joues Noir.",
      es: '16 bolas de cristal en 4 colores (4 de cada), 104 cartas y un tablero redondo. Cada color tiene su propia zona en el tablero. Las cartas deciden hasta dónde y hacia dónde se mueven tus bolas. En todos los tutoriales juegas con Negro.',
      it: '16 biglie di vetro in 4 colori (4 per colore), 104 carte da gioco e un tabellone rotondo. Ogni colore ha la sua zona sul tabellone. Le carte decidono quanto e dove si muovono le tue biglie. In tutti i tutorial giochi con il Nero.',
      hi: '4 रंगों की 16 काँच की गोलियाँ (हर रंग की 4), 104 ताश के कार्ड और एक गोल बोर्ड। हर रंग का बोर्ड पर अपना क्षेत्र है। कार्ड तय करते हैं कि आपकी गोलियाँ कितनी दूर और कहाँ जाती हैं। सभी ट्यूटोरियल में आप काले से खेलते हैं।',
      sv: '16 glaskulor i 4 färger (4 av varje), 104 spelkort och ett runt spelbräde. Varje färg har sitt eget område på brädet. Korten bestämmer hur långt och vart dina kulor flyttar. I alla handledningar spelar du som Svart.',
      fi: '16 lasikuulaa 4 värissä (4 kutakin), 104 pelikorttia ja pyöreä pelilauta. Jokaisella värillä on oma alueensa laudalla. Kortit ratkaisevat, kuinka pitkälle ja minne kuulasi liikkuvat. Kaikissa opetusohjelmissa pelaat mustilla.',
      nb: '16 glasskuler i 4 farger (4 av hver), 104 spillkort og et rundt spillebrett. Hver farge har sitt eget område på brettet. Kortene bestemmer hvor langt og hvor kulene dine flytter. I alle opplæringene spiller du som Svart.',
      da: '16 glaskugler i 4 farver (4 af hver), 104 spillekort og et rundt spillebræt. Hver farve har sit eget område på brættet. Kortene bestemmer, hvor langt og hvorhen dine kugler rykker. I alle vejledninger spiller du som Sort.',
      tr: '4 renkte 16 cam bilye (her renkten 4), 104 oyun kartı ve yuvarlak bir tahta. Her rengin tahtada kendi bölgesi vardır. Kartlar bilyelerinin ne kadar ve nereye gideceğini belirler. Tüm eğitimlerde Siyahla oynarsın.',
    },
  },
  // Teufel und TAC: Rot spielt erst den Teufel, dann aus deiner Hand den TAC, erst dadurch spielst du für Blau.
  e13: {
    text: {
      de: 'Spezialregel: Rot spielt den Teufel. Damit darf Rot eine Karte aus deiner Hand für dich spielen und wählt deinen TAC. Der TAC macht den Teufel rückgängig und dreht ihn um: Jetzt darfst du den Teufel für Rots Teampartner Blau spielen. Du wählst eine Karte aus Blaus Hand und spielst sie für Blau. Eine seltene, aber mächtige Wendung!',
      en: "Special rule: Red plays the Devil. That lets Red play a card from your hand for you, and Red picks your TAC. The TAC undoes the Devil and turns it around: now you may play the Devil for Red's teammate Blue. You choose a card from Blue's hand and play it for Blue. A rare but powerful twist!",
      ru: 'Особое правило: Красный играет Дьявола. Так Красный может сыграть за тебя карту из твоей руки и выбирает твой TAC. TAC отменяет Дьявола и оборачивает его: теперь ты можешь сыграть Дьявола за напарника Красного, Синего. Ты выбираешь карту из руки Синего и играешь её за Синего. Редкий, но мощный поворот!',
      fr: 'Règle spéciale : Rouge joue le Diable. Rouge peut ainsi jouer une carte de ta main pour toi et choisit ton TAC. Le TAC annule le Diable et le retourne : tu peux maintenant jouer le Diable pour Bleu, le partenaire de Rouge. Tu choisis une carte de la main de Bleu et la joues pour Bleu. Un retournement rare mais puissant !',
      es: 'Regla especial: Rojo juega el Diablo. Así Rojo puede jugar por ti una carta de tu mano y elige tu TAC. El TAC deshace el Diablo y le da la vuelta: ahora puedes jugar el Diablo para Azul, el compañero de Rojo. Eliges una carta de la mano de Azul y la juegas para Azul. ¡Un giro raro pero poderoso!',
      it: 'Regola speciale: Rosso gioca il Diavolo. Così Rosso può giocare per te una carta della tua mano e sceglie il tuo TAC. Il TAC annulla il Diavolo e lo ribalta: ora puoi giocare il Diavolo per Blu, il compagno di Rosso. Scegli una carta dalla mano di Blu e la giochi per Blu. Un ribaltamento raro ma potente!',
      hi: 'विशेष नियम: लाल शैतान खेलता है। इससे लाल आपके हाथ का एक कार्ड आपके लिए खेल सकता है और आपका TAC चुनता है। TAC शैतान को रद्द करके उलट देता है: अब आप लाल के साथी नीले के लिए शैतान खेल सकते हैं। आप नीले के हाथ से एक कार्ड चुनते हैं और उसे नीले के लिए खेलते हैं। एक दुर्लभ लेकिन शक्तिशाली मोड़!',
      sv: 'Specialregel: Röd spelar djävulen. Då får Röd spela ett kort ur din hand åt dig och väljer ditt TAC. TAC ångrar djävulen och vänder på den: nu får du spela djävulen för Röds lagkamrat Blå. Du väljer ett kort ur Blås hand och spelar det åt Blå. En sällsynt men kraftfull vändning!',
      fi: 'Erikoissääntö: Punainen pelaa Pirun. Näin Punainen saa pelata puolestasi kortin kädestäsi ja valitsee TACisi. TAC peruu Pirun ja kääntää sen: nyt saat pelata Pirun Punaisen joukkuetoverin Sinisen puolesta. Valitset kortin Sinisen kädestä ja pelaat sen Sinisen puolesta. Harvinainen mutta voimakas käänne!',
      nb: 'Spesialregel: Rød spiller djevelen. Dermed kan Rød spille et kort fra hånden din for deg og velger din TAC. TAC angrer djevelen og snur den: nå kan du spille djevelen for Røds lagkamerat Blå. Du velger et kort fra Blås hånd og spiller det for Blå. En sjelden, men kraftig vending!',
      da: 'Specialregel: Rød spiller djævelen. Så må Rød spille et kort fra din hånd for dig og vælger dit TAC. TAC fortryder djævelen og vender den om: nu må du spille djævelen for Røds holdmakker Blå. Du vælger et kort fra Blås hånd og spiller det for Blå. En sjælden, men stærk vending!',
      tr: "Özel kural: Kırmızı Şeytanı oynar. Böylece Kırmızı senin elinden bir kartı senin için oynayabilir ve senin TAC'ını seçer. TAC Şeytanı geri alır ve tersine çevirir: artık Kırmızının takım arkadaşı Mavi için Şeytanı oynayabilirsin. Mavinin elinden bir kart seçip onu Mavi için oynarsın. Nadir ama güçlü bir dönüş!",
    },
  },
  a03c: {
    text: {
      de: 'Wenn du mehrere Kugeln auf dem Spielfeld hast, entscheidest du, welche zieht. Tippe auf eine Karte, dann auf die schwarze Kugel, die ziehen soll, und danach auf die Projektion.',
      en: 'If you have several marbles on the board, you decide which one moves. Tap a card, then the black marble you want to move, and then the projection.',
      ru: 'Если у тебя несколько шариков на поле, ты решаешь, какой из них пойдёт. Нажми на карту, затем на чёрный шарик, который должен пойти, а потом на проекцию.',
      fr: "Si tu as plusieurs billes sur le plateau, c'est toi qui décides laquelle avance. Touche une carte, puis la bille noire qui doit avancer, puis la projection.",
      es: 'Si tienes varias bolas en el tablero, tú decides cuál se mueve. Toca una carta, luego la bola negra que quieres mover y después la proyección.',
      it: 'Se hai più biglie sul tabellone, decidi tu quale si muove. Tocca una carta, poi la biglia nera che deve muoversi e infine la proiezione.',
      hi: 'अगर बोर्ड पर आपकी कई गोलियाँ हैं, तो आप तय करते हैं कि कौन-सी चलेगी। किसी कार्ड पर टैप करें, फिर उस काली गोली पर जिसे चलाना है, और उसके बाद प्रोजेक्शन पर।',
      sv: 'Om du har flera kulor på brädet bestämmer du vilken som flyttar. Tryck på ett kort, sedan på den svarta kula som ska flytta och därefter på projektionen.',
      fi: 'Jos sinulla on useita kuulia laudalla, päätät itse, mikä liikkuu. Napauta korttia, sitten mustaa kuulaa, jonka haluat liikkuvan, ja lopuksi projektiota.',
      nb: 'Hvis du har flere kuler på brettet, bestemmer du hvilken som flytter. Trykk på et kort, så på den svarte kulen som skal flytte, og deretter på projeksjonen.',
      da: 'Hvis du har flere kugler på brættet, bestemmer du, hvilken der rykker. Tryk på et kort, så på den sorte kugle, der skal rykke, og derefter på projektionen.',
      tr: 'Tahtada birden fazla bilyen varsa hangisinin ilerleyeceğine sen karar verirsin. Bir karta, sonra ilerlemesi gereken siyah bilyeye, ardından projeksiyona dokun.',
    },
  },
}

export function passeLektionAn(l: Lektion): Lektion {
  const a = lektionsAnpassungen[l.id]
  return a ? { ...l, ...a } : l
}
