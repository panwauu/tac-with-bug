import { cloneDeep } from 'lodash';
import { moveOneStep, getMovingPositions, getMovesLeavingHouse, getSwitchingMoves, getKriegerMove, getMoves, initializeTeams, getPlayablePlayers, createCardWithMove, getSevenPositions } from '../game/generateMovesUtils'
import { ballGoal, ballHome, ballStart, initializeBalls } from '../game/ballUtils'
import { initalizeCards, dealCards } from '../game/cardUtils'

const nPlayers = 4
const ballsSample = initializeBalls(4)
const ballsSample6 = initializeBalls(6)
const cardsSample = initalizeCards(4, true)
dealCards(cardsSample)

// ----- TEST for createCardWithMove ---------
test('createCardWithMove - if player not activeplayer -> emptyCard', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('cardTitle', balls, 1, 0, [[]], cardsSample, false, null)).toEqual({ 'title': 'cardTitle', 'possible': false, 'ballActions': {}, 'textAction': '' })
});

test('createCardWithMove - test only textAction Cards (Narr, Teufel, )', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('narr', balls, 0, 0, [[0, 2]], cardsSample, false, null)).toEqual({ 'title': 'narr', 'possible': true, 'ballActions': {}, 'textAction': 'narr' })
    expect(createCardWithMove('teufel', balls, 0, 0, [[0, 2]], cardsSample, false, null)).toEqual({ 'title': 'teufel', 'possible': true, 'ballActions': {}, 'textAction': 'teufel' })
});

test('createCardWithMove - test Easy Number (2-6,9-12)', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('2', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '2', 'possible': false, 'ballActions': {}, 'textAction': '' })
    balls[0].position = ballStart(0, balls)
    balls[2].position = ballStart(2, balls)
    balls[3].position = ballStart(3, balls)
    for (let i = 0; i < 4; i++) {
        balls[8 + i].position = ballGoal(8, balls) + i
        balls[8 + i].state = 'locked'
    }
    expect(createCardWithMove('2', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '2', 'possible': true, 'ballActions': { 0: [ballStart(0, balls) + 2], 2: [ballStart(2, balls) + 2], 3: [ballStart(3, balls) + 2] }, 'textAction': '' })
    expect(createCardWithMove('2', balls, 2, 2, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '2', 'possible': true, 'ballActions': { 0: [ballStart(0, balls) + 2], 2: [ballStart(2, balls) + 2], 3: [ballStart(3, balls) + 2] }, 'textAction': '' })
    expect(createCardWithMove('2', balls, 1, 1, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '2', 'possible': false, 'ballActions': {}, 'textAction': '' })

    balls[0].position = ballStart(0, balls)
    balls[2].position = ballStart(0, balls) + 1
    balls[3].position = ballStart(0, balls) + 2
    expect(createCardWithMove('10', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '10', 'possible': true, 'ballActions': { 3: [ballStart(3, balls) + 12] }, 'textAction': '' })
    expect(createCardWithMove('10', balls, 2, 2, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '10', 'possible': true, 'ballActions': { 3: [ballStart(3, balls) + 12] }, 'textAction': '' })

    balls[0].position = ballGoal(0, balls) - 1
    balls[0].state = 'valid'
    balls[2].position = ballHome(0)
    balls[3].position = ballHome(0)
    expect(createCardWithMove('3', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '3', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 1, ballStart(0, balls) + 2] }, 'textAction': '' })
});

test('createCardWithMove - test 8', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('8', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '8', 'possible': false, 'ballActions': {}, 'textAction': '' })
    balls[0].position = ballStart(0, balls)
    balls[4].position = ballStart(0, balls) + 1
    expect(createCardWithMove('8', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '8', 'possible': true, 'ballActions': {}, 'textAction': 'aussetzen' })
    expect(createCardWithMove('8', balls, 1, 1, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '8', 'possible': true, 'ballActions': { 4: [ballStart(0, balls) + 9] }, 'textAction': 'aussetzen' })

    const cards = cloneDeep(cardsSample)
    cards.players[1] = []
    expect(createCardWithMove('8', balls, 0, 0, initializeTeams(4, 2), cards, false, null)).toEqual({ 'title': '8', 'possible': false, 'ballActions': {}, 'textAction': '' })
    cards.players[2] = []
    expect(createCardWithMove('8', balls, 1, 1, initializeTeams(4, 2), cards, false, null)).toEqual({ 'title': '8', 'possible': true, 'ballActions': { 4: [ballStart(0, balls) + 9] }, 'textAction': '' })
});

test('createCardWithMove - test 1 and 13', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '1', 'possible': true, 'ballActions': { 0: [ballStart(0, balls)], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('13', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '13', 'possible': true, 'ballActions': { 0: [ballStart(0, balls)], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })

    balls[0].position = ballStart(0, balls)
    expect(createCardWithMove('1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '1', 'possible': true, 'ballActions': { 0: [ballStart(0, balls) + 1], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('13', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '13', 'possible': true, 'ballActions': { 0: [ballStart(0, balls) + 13], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })

    balls[4].position = ballStart(0, balls) + 1
    expect(createCardWithMove('1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '1', 'possible': true, 'ballActions': { 1: [ballStart(0, balls)], 0: [ballStart(0, balls) + 1], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('13', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '13', 'possible': true, 'ballActions': { 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })
});

test('createCardWithMove - test 1 for 6 players', () => {
    const balls = cloneDeep(ballsSample6)
    for (let i = 0; i < 4; i++) {
        balls[0 + i].position = ballGoal(0, balls) + i
        balls[0 + i].state = 'locked'
    }
    expect(createCardWithMove('1', balls, 0, 0, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': '1', 'possible': true, 'ballActions': { 8: [ballStart(8, balls)], 9: [ballStart(8, balls)], 10: [ballStart(8, balls)], 11: [ballStart(8, balls)], 16: [ballStart(16, balls)], 17: [ballStart(16, balls)], 18: [ballStart(16, balls)], 19: [ballStart(16, balls)] }, 'textAction': '' })
    expect(createCardWithMove('1', balls, 0, 0, initializeTeams(6, 3), cardsSample, false, null)).toEqual({ 'title': '1', 'possible': true, 'ballActions': { 12: [ballStart(12, balls)], 13: [ballStart(12, balls)], 14: [ballStart(12, balls)], 15: [ballStart(12, balls)] }, 'textAction': '' })
});

test('createCardWithMove - test -4', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': false, 'ballActions': {}, 'textAction': '' })

    balls[0].position = ballStart(0, balls)
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) - 4] }, 'textAction': '' })

    balls[0].state = 'valid'
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 3, ballGoal(0, balls) - 4] }, 'textAction': '' })

    balls[0].position = ballStart(0, balls) + 1
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls) - 3] }, 'textAction': '' })

    balls[1].position = ballGoal(0, balls)
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) - 3] }, 'textAction': '' })

    balls[1].position = ballStart(0, balls) + 5
    expect(createCardWithMove('4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '4', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls) - 3], 1: [ballStart(0, balls) + 1] }, 'textAction': '' })
});

test('createCardWithMove - test trickser', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('trickser', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'trickser', 'possible': false, 'ballActions': {}, 'textAction': '' })

    balls[4].position = ballStart(4, balls)
    balls[8].position = ballStart(8, balls)
    expect(createCardWithMove('trickser', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'trickser', 'possible': false, 'ballActions': {}, 'textAction': '' })

    balls[0].position = ballStart(0, balls)
    balls[0].state = 'invalid'
    expect(createCardWithMove('trickser', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'trickser', 'possible': true, 'ballActions': { 0: [ballStart(4, balls), ballStart(8, balls)], 4: [ballStart(0, balls), ballStart(8, balls)], 8: [ballStart(0, balls), ballStart(4, balls)] }, 'textAction': '' })
});

test('createCardWithMove - test tac: Never Called with tac -> Error', () => {
    const balls = cloneDeep(ballsSample)
    expect(() => { createCardWithMove('tac', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null) }).toThrow('cannot createCardWithMove with tac Card');
});

test('createCardWithMove - test engel', () => {
    const balls = cloneDeep(ballsSample)
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 4: [ballStart(4, balls)], 5: [ballStart(4, balls)], 6: [ballStart(4, balls)], 7: [ballStart(4, balls)] }, 'textAction': '' })
    for (let i = 1; i < 4; i++) {
        balls[4 + i].position = ballGoal(4, balls) + i
        balls[4 + i].state = 'locked'
    }
    balls[4].position = ballStart(4, balls)
    balls[4].state = 'invalid'
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 4: [ballStart(4, balls) + 1, ballStart(4, balls) + 13] }, 'textAction': '' })
    balls[8].position = ballStart(4, balls) + 1
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 4: [ballStart(4, balls) + 1] }, 'textAction': '' })

    balls[4].position = ballGoal(4, balls)
    balls[4].state = 'locked'
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 12: [ballStart(12, balls)], 13: [ballStart(12, balls)], 14: [ballStart(12, balls)], 15: [ballStart(12, balls)] }, 'textAction': '' })
});

test('createCardWithMove - test engel 4 every Player', () => {
    let balls = cloneDeep(ballsSample)
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 4: [ballStart(4, balls)], 5: [ballStart(4, balls)], 6: [ballStart(4, balls)], 7: [ballStart(4, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 1, 1, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 8: [ballStart(8, balls)], 9: [ballStart(8, balls)], 10: [ballStart(8, balls)], 11: [ballStart(8, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 2, 2, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 12: [ballStart(12, balls)], 13: [ballStart(12, balls)], 14: [ballStart(12, balls)], 15: [ballStart(12, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 3, 3, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 0: [ballStart(0, balls)], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })

    balls = cloneDeep(ballsSample6)
    expect(createCardWithMove('engel', balls, 0, 0, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 4: [ballStart(4, balls)], 5: [ballStart(4, balls)], 6: [ballStart(4, balls)], 7: [ballStart(4, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 1, 1, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 8: [ballStart(8, balls)], 9: [ballStart(8, balls)], 10: [ballStart(8, balls)], 11: [ballStart(8, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 2, 2, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 12: [ballStart(12, balls)], 13: [ballStart(12, balls)], 14: [ballStart(12, balls)], 15: [ballStart(12, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 3, 3, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 16: [ballStart(16, balls)], 17: [ballStart(16, balls)], 18: [ballStart(16, balls)], 19: [ballStart(16, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 4, 4, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 20: [ballStart(20, balls)], 21: [ballStart(20, balls)], 22: [ballStart(20, balls)], 23: [ballStart(20, balls)] }, 'textAction': '' })
    expect(createCardWithMove('engel', balls, 5, 5, initializeTeams(6, 2), cardsSample, false, null)).toEqual({ 'title': 'engel', 'possible': true, 'ballActions': { 0: [ballStart(0, balls)], 1: [ballStart(0, balls)], 2: [ballStart(0, balls)], 3: [ballStart(0, balls)] }, 'textAction': '' })
});

test('createCardWithMove - test 7', () => {
    const balls = cloneDeep(ballsSample)

    // No move if in house
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': false, 'ballActions': {}, 'textAction': '' })

    // Only passing if not valid
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'invalid'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [17, 18, 19, 20, 21, 22, 23] }, 'textAction': '' })

    // Also entering the goal area
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18, ballGoal(0, balls) + 2, 19, ballGoal(0, balls) + 3, 20, 21, 22, 23] }, 'textAction': '' })
    expect(createCardWithMove('7-2', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-2', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18] }, 'textAction': '' })

    // Not removing Balls in goal
    balls[1].position = ballGoal(0, balls)
    balls[1].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [17, 18, 19, 20, 21, 22, 23], 1: [ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3] }, 'textAction': '' })
    expect(createCardWithMove('7-4', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-4', 'possible': true, 'ballActions': { 0: [17, 18, 19, 20], 1: [ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3] }, 'textAction': '' })

    // Not removing Balls in goal but outside
    balls[1].position = ballGoal(0, balls) + 2
    balls[1].state = 'goal'
    balls[2].position = ballStart(0, balls) + 2
    balls[2].state = 'valid'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18, 19, 20, 21, 22, 23], 1: [83, 81, 80], 2: [19, 20, 21, 22, 23, 24, 25] }, 'textAction': '' })
    expect(createCardWithMove('7-2', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-2', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18], 1: [83, 81, 80], 2: [19, 20] }, 'textAction': '' })
});

test('createCardWithMove - test 7 in goal', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into house
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18, ballGoal(0, balls) + 2, 19, ballGoal(0, balls) + 3, 20, 21, 22, 23] }, 'textAction': '' })

    // Move forward in house
    balls[0].position = ballGoal(0, balls)
    balls[0].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3] }, 'textAction': '' })
    expect(createCardWithMove('7-3', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-3', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3] }, 'textAction': '' })
    expect(createCardWithMove('7-1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-1', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 1] }, 'textAction': '' })

    // Move forward in house from other position
    balls[0].position = ballGoal(0, balls) + 1
    balls[0].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls), ballGoal(0, balls) + 3] }, 'textAction': '' })
    expect(createCardWithMove('7-3', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-3', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls), ballGoal(0, balls) + 3] }, 'textAction': '' })
    expect(createCardWithMove('7-1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-1', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls)] }, 'textAction': '' })

    // Move backward in house from last position allowed
    balls[0].position = ballGoal(0, balls) + 3
    balls[0].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls) + 1, ballGoal(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('7-3', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-3', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2, ballGoal(0, balls) + 1, ballGoal(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('7-1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-1', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 2] }, 'textAction': '' })

    // Move backward in house from last position not-allowed
    balls[0].position = ballGoal(0, balls) + 3
    balls[0].state = 'locked'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': false, 'ballActions': {}, 'textAction': '' })

    // Move backward in house from other position
    balls[0].position = ballGoal(0, balls) + 2
    balls[0].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 3, ballGoal(0, balls) + 1, ballGoal(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('7-3', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-3', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 3, ballGoal(0, balls) + 1, ballGoal(0, balls)] }, 'textAction': '' })
    expect(createCardWithMove('7-1', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({ 'title': '7-1', 'possible': true, 'ballActions': { 0: [ballGoal(0, balls) + 3, ballGoal(0, balls) + 1] }, 'textAction': '' })
});

test('createCardWithMove - test 7 multiple balls', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    balls[1].position = ballStart(0, balls) + 1
    balls[1].state = 'valid'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls), 17, ballGoal(0, balls) + 1, 18, ballGoal(0, balls) + 2, 19, ballGoal(0, balls) + 3, 20, 21, 22, 23],
            1: [18, 19, 20, 21, 22, 23, 24]
        }, 'textAction': ''
    })

    // Move forward in goal
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    balls[1].position = ballGoal(0, balls) + 1
    balls[1].state = 'goal'
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls), 17, 18, 19, 20, 21, 22, 23],
            1: [ballGoal(0, balls) + 2, ballGoal(0, balls), ballGoal(0, balls) + 3]
        }, 'textAction': ''
    })
});

test('createCardWithMove - test 7 with last ball (should not be allowed to enter)', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'locked'
    }
    for (let i = 0; i < 4; i++) {
        balls[8 + i].position = ballGoal(8 + i, balls) + i
        balls[8 + i].state = 'locked'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'

    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
        }, 'textAction': ''
    })
    expect(createCardWithMove('7', balls, 2, 2, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
        }, 'textAction': ''
    })
});

test('createCardWithMove - test 7 with last ball (should not be allowed to enter) not locked state', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'goal'
    }
    for (let i = 0; i < 4; i++) {
        balls[8 + i].position = ballGoal(8 + i, balls) + i
        balls[8 + i].state = 'locked'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'

    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
            1: [ballGoal(0, balls)]
        }, 'textAction': ''
    })
    expect(createCardWithMove('7', balls, 2, 2, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
            1: [ballGoal(0, balls)]
        }, 'textAction': ''
    })
});

test('createCardWithMove - test 7 with last ball of a player but not of team no other balls', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'locked'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'

    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
        }, 'textAction': ''
    })
});

test('createCardWithMove - test 7 with last ball of a player but not of team no other balls -> not locked state', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'goal'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'

    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false)).toEqual([77, 78, 79, 16, 17, 18, 19])
    const cardWithMove = createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)
    expect(cardWithMove.possible).toBe(true)
    expect(cardWithMove.textAction).toBe('')
    expect(cardWithMove.ballActions).toEqual({
        0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
        1: [ballGoal(0, balls)]
    })
});

test('createCardWithMove - test 7 with last ball of a player but not of team - with other ball', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'locked'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'
    balls[8].position = ballStart(8, balls)
    balls[8].state = 'valid'

    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballGoal(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
        }, 'textAction': ''
    })
});


test('createCardWithMove - test 7 with last ball of a player but not of team - with other ball -> not locked', () => {
    const balls = cloneDeep(ballsSample)

    // Move forward into goal
    for (let i = 1; i < 4; i++) {
        balls[i].position = ballGoal(i, balls) + i
        balls[i].state = 'goal'
    }

    balls[0].position = ballGoal(0, balls) - 4
    balls[0].state = 'valid'
    balls[8].position = ballStart(8, balls)
    balls[8].state = 'valid'

    expect(createCardWithMove('7', balls, 0, 0, initializeTeams(4, 2), cardsSample, false, null)).toEqual({
        'title': '7', 'possible': true, 'ballActions': {
            0: [ballGoal(0, balls) - 3, ballGoal(0, balls) - 2, ballGoal(0, balls) - 1, ballStart(0, balls), ballGoal(0, balls), ballStart(0, balls) + 1, ballStart(0, balls) + 2, ballStart(0, balls) + 3],
            1: [ballGoal(0, balls)]
        }, 'textAction': ''
    })
});

// -------- getSevenPositions  getSevenPositions(balls, nBall, remainingMoves)
test('getSevenPositions', () => {
    const balls = cloneDeep(ballsSample)

    // No move if in house
    expect(getSevenPositions(balls, Math.floor(Math.random() * balls.length), 7, initializeTeams(4, 2), false)).toEqual([])

    // Only passing if not valid
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'invalid'
    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false)).toEqual([17, 18, 19, 20, 21, 22, 23])

    // Also entering the goal area
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false).sort()).toEqual([17, 18, 19, 20, 21, 22, 23, ballGoal(0, balls), ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3])
    expect(getSevenPositions(balls, 0, 2, initializeTeams(4, 2), false).sort()).toEqual([17, 18, ballGoal(0, balls), ballGoal(0, balls) + 1])

    // Not removing Balls in goal
    balls[1].position = ballGoal(0, balls)
    balls[1].state = 'goal'
    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false).sort()).toEqual([17, 18, 19, 20, 21, 22, 23])
    expect(getSevenPositions(balls, 0, 4, initializeTeams(4, 2), false).sort()).toEqual([17, 18, 19, 20])

    // Not removing Balls in goal but outside
    balls[1].position = ballGoal(0, balls) + 2
    balls[1].state = 'goal'
    balls[2].position = ballStart(0, balls) + 2
    expect(getSevenPositions(balls, 0, 7, initializeTeams(4, 2), false).sort()).toEqual([17, 18, 19, 20, 21, 22, 23, ballGoal(0, balls), ballGoal(0, balls) + 1])
    expect(getSevenPositions(balls, 0, 2, initializeTeams(4, 2), false).sort()).toEqual([17, 18, ballGoal(0, balls), ballGoal(0, balls) + 1])

    // Entering from behind the goal
    balls[0].position = ballGoal(0, balls) - 1
    balls[0].state = 'valid'
    expect(getSevenPositions(balls, 0, 6, initializeTeams(4, 2), false).sort()).toEqual([16, 17, 18, 19, 20, 21, ballGoal(0, balls), ballGoal(0, balls) + 1])
    expect(getSevenPositions(balls, 0, 2, initializeTeams(4, 2), false).sort()).toEqual([16, 17, ballGoal(0, balls)])

    // Test if remaining Moves === 0
    expect(getSevenPositions(balls, Math.floor(Math.random() * balls.length), 0, initializeTeams(4, 2), false)).toEqual([])
});

test('initializeTeams', () => {
    expect(initializeTeams(4, Math.floor(Math.random() * 100))).toEqual([[0, 2], [1, 3]])
    expect(initializeTeams(6, 2)).toEqual([[0, 2, 4], [1, 3, 5]])
    expect(initializeTeams(6, 3)).toEqual([[0, 3], [1, 4], [2, 5]])
});

test('getPlayablePlayers, 4', () => {
    const balls = cloneDeep(ballsSample)
    const teams = initializeTeams(4, 0)
    for (let i = 0; i < nPlayers; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, false, null)).toEqual([i])
    }

    const player = Math.floor(Math.random() * 4)
    for (let i = 1; i < 4; i++) { // Finish Player 1
        balls[i + player * 4].state = 'locked'
        balls[i + player * 4].position = ballGoal(player * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([player])


    balls[player * 4].state = 'locked'
    balls[player * 4].position = ballGoal(player * 4, balls)
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([(player + 2) % nPlayers])
});

test('getPlayablePlayers, 6 - 3Teams', () => {
    const balls = cloneDeep(ballsSample6)
    const teams = initializeTeams(6, 3)
    for (let i = 0; i < 6; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, false, null)).toEqual([i])
    }

    const player = Math.floor(Math.random() * 6)
    for (let i = 1; i < 4; i++) { // Finish Player 1
        balls[i + player * 4].state = 'locked'
        balls[i + player * 4].position = ballGoal(player * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([player])


    balls[player * 4].state = 'locked'
    balls[player * 4].position = ballGoal(player * 4, balls)
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([(player + 3) % 6])
});

test('getPlayablePlayers, 6 - 2Teams', () => {
    const balls = cloneDeep(ballsSample6)
    const teams = initializeTeams(6, 2)
    for (let i = 0; i < 6; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, false, null)).toEqual([i])
    }

    const player = Math.floor(Math.random() * 6)
    for (let i = 1; i < 4; i++) { // Finish Player 1
        balls[i + player * 4].state = 'locked'
        balls[i + player * 4].position = ballGoal(player * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([player])


    balls[player * 4].state = 'locked'
    balls[player * 4].position = ballGoal(player * 4, balls)
    expect(getPlayablePlayers(balls, player, teams, false, null)).toEqual([(player + 2) % 6, (player + 4) % 6].sort())
});

test('getPlayablePlayers, 4 Coop', () => {
    const balls = cloneDeep(ballsSample)
    const teams = initializeTeams(4, 2)
    for (let i = 0; i < 4; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, true, null)).toEqual([i])
    }

    for (let i = 0; i < 4; i++) { // Finish Player 1
        balls[i + 0 * 4].state = 'locked'
        balls[i + 0 * 4].position = ballGoal(0 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])

    for (let i = 0; i < 4; i++) { // Finish Player 1
        balls[i + 2 * 4].state = 'locked'
        balls[i + 2 * 4].position = ballGoal(2 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([1, 3])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([1, 3])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])

    for (let i = 0; i < 4; i++) { // Finish Player 1
        balls[i + 4].state = 'locked'
        balls[i + 4].position = ballGoal(4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])
});

test('getPlayablePlayers, 6-3 Coop', () => {
    const balls = cloneDeep(ballsSample6)
    const teams = initializeTeams(6, 3)
    for (let i = 0; i < 6; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, true, null)).toEqual([i])
    }

    for (let i = 0; i < 4; i++) { // Finish Player 0
        balls[i + 0 * 4].state = 'locked'
        balls[i + 0 * 4].position = ballGoal(0 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])

    for (let i = 0; i < 4; i++) { // Finish Player 3
        balls[i + 3 * 4].state = 'locked'
        balls[i + 3 * 4].position = ballGoal(3 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([1, 2, 4, 5])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([1, 2, 4, 5])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])

    for (let i = 0; i < 4; i++) { // Finish Player 1
        balls[i + 4].state = 'locked'
        balls[i + 4].position = ballGoal(4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([2, 4, 5])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([2, 4, 5])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])
});

test('getPlayablePlayers, 6-2 Coop', () => {
    const balls = cloneDeep(ballsSample6)
    const teams = initializeTeams(6, 2)
    for (let i = 0; i < 6; i++) { // In beginning only own balls playable
        expect(getPlayablePlayers(balls, i, teams, true, null)).toEqual([i])
    }

    for (let i = 0; i < 4; i++) { // Finish Player 0
        balls[i + 0 * 4].state = 'locked'
        balls[i + 0 * 4].position = ballGoal(0 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([2, 4])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([2])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])

    for (let i = 0; i < 4; i++) { // Finish Player 2
        balls[i + 2 * 4].state = 'locked'
        balls[i + 2 * 4].position = ballGoal(3 * 4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([4])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])

    for (let i = 0; i < 4; i++) { // Finish Player 4
        balls[i + 4 * 4].state = 'locked'
        balls[i + 4 * 4].position = ballGoal(4, balls) + i
    }
    expect(getPlayablePlayers(balls, 0, teams, true, null)).toEqual([1, 3, 5])
    expect(getPlayablePlayers(balls, 1, teams, true, null)).toEqual([1])
    expect(getPlayablePlayers(balls, 2, teams, true, null)).toEqual([1, 3, 5])
    expect(getPlayablePlayers(balls, 3, teams, true, null)).toEqual([3])
    expect(getPlayablePlayers(balls, 4, teams, true, null)).toEqual([1, 3, 5])
    expect(getPlayablePlayers(balls, 5, teams, true, null)).toEqual([5])
});

test('Move one with all in House', () => {
    const balls = cloneDeep(ballsSample)
    for (let player = 0; player < nPlayers; player++) {
        expect(moveOneStep(balls, player, balls[player].position, -1, 4).sort()).toEqual([])
        expect(moveOneStep(balls, player, balls[player].position, 1, 7).sort()).toEqual([])
    }
});

test('Move one forward without goal', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].position = ballStart(0, balls) + 5
    expect(moveOneStep(balls, 0, balls[0].position, 1, 4).sort()).toEqual([ballStart(0, balls) + 6].sort())
    balls[0].position = ballStart(0, balls) + 30
    expect(moveOneStep(balls, 0, balls[0].position, 1, 4).sort()).toEqual([ballStart(0, balls) + 31].sort())

    balls[5].position = ballGoal(0, balls) - 1
    expect(moveOneStep(balls, 5, balls[5].position, 1, 4).sort()).toEqual([ballStart(0, balls)].sort())
});

test('Move one forward with goal', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].position = ballStart(0, balls)
    expect(moveOneStep(balls, 0, balls[0].position, 1, 4).sort()).toEqual([ballStart(0, balls) + 1].sort())
    balls[0].state = 'valid'
    expect(moveOneStep(balls, 0, balls[0].position, 1, 4).sort()).toEqual([ballStart(0, balls) + 1, ballGoal(0, balls)].sort())
});

test('Move one forward in goal not 7', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].position = ballGoal(0, balls)
    expect(moveOneStep(balls, 0, balls[0].position, 1, 1).sort()).toEqual([ballGoal(0, balls) + 1].sort())
    balls[0].position = ballGoal(0, balls) + 1
    expect(moveOneStep(balls, 0, balls[0].position, 1, 1).sort()).toEqual([ballGoal(0, balls) + 2].sort())
    balls[0].position = ballGoal(0, balls) + 2
    expect(moveOneStep(balls, 0, balls[0].position, 1, 1).sort()).toEqual([ballGoal(0, balls) + 3].sort())
    balls[0].position = ballGoal(0, balls) + 3
    expect(moveOneStep(balls, 0, balls[0].position, 1, 1).sort()).toEqual([].sort())
});

test('Move one forward in goal with 7', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].position = ballGoal(0, balls)
    balls[0].state = 'goal'
    expect(moveOneStep(balls, 0, balls[0].position, 1, 7).sort()).toEqual([ballGoal(0, balls) + 1])

    balls[0].position = ballGoal(0, balls) + 1
    balls[0].state = 'goal'
    expect(moveOneStep(balls, 0, balls[0].position, 1, 7).sort()).toEqual([ballGoal(0, balls), ballGoal(0, balls) + 2].sort())

    balls[0].position = ballGoal(0, balls) + 3
    balls[0].state = 'goal'
    expect(moveOneStep(balls, 0, balls[0].position, 1, 7).sort()).toEqual([ballGoal(0, balls) + 2])
})

test('Move backwards without goal', () => {
    const balls = cloneDeep(ballsSample)
    const nBall = 0;
    balls[nBall].position = ballStart(nBall, balls) + 5
    expect(moveOneStep(balls, nBall, balls[nBall].position, -1, 4).sort()).toEqual([ballStart(nBall, balls) + 4].sort())
    balls[nBall].position = ballStart(nBall, balls) + 30
    expect(moveOneStep(balls, nBall, balls[nBall].position, -1, 4).sort()).toEqual([ballStart(nBall, balls) + 29].sort())

    balls[nBall].position = ballStart(0, balls)
    expect(moveOneStep(balls, nBall, balls[nBall].position, -1, 4).sort()).toEqual([ballGoal(0, balls) - 1].sort())
});

test('Move backwards with goal', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].state = 'valid'
    balls[0].position = ballStart(0, balls)
    expect(moveOneStep(balls, 0, balls[0].position, -1, 4).sort()).toEqual([ballGoal(0, balls), ballGoal(0, balls) - 1].sort())

    balls[balls.length - 1].state = 'valid'
    balls[balls.length - 1].position = ballStart(balls.length - 1, balls)
    expect(moveOneStep(balls, balls.length - 1, balls[balls.length - 1].position, -1, 4).sort()).toEqual([ballGoal(balls.length - 1, balls), balls[balls.length - 1].position - 1].sort())
});

test('Move backwards in goal', () => {
    const balls = cloneDeep(ballsSample)
    balls[0].position = ballGoal(0, balls)
    expect(moveOneStep(balls, 0, balls[0].position, -1, 4).sort()).toEqual([ballGoal(0, balls) + 1].sort())
    balls[0].position = ballGoal(0, balls) + 1
    expect(moveOneStep(balls, 0, balls[0].position, -1, 4).sort()).toEqual([ballGoal(0, balls) + 2].sort())
    balls[0].position = ballGoal(0, balls) + 2
    expect(moveOneStep(balls, 0, balls[0].position, -1, 4).sort()).toEqual([ballGoal(0, balls) + 3].sort())
    balls[0].position = ballGoal(0, balls) + 3
    expect(moveOneStep(balls, 0, balls[0].position, -1, 4).sort()).toEqual([])
});

test('Move forward with one ball with ordinary number Cards', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls)
    expect(getMovingPositions(balls, 0, '10')).toEqual([ballStart(0, balls) + 10])
    balls[0].position = ballStart(0, balls)
    expect(getMovingPositions(balls, 0, '3')).toEqual([ballStart(0, balls) + 3])
    balls[0].position = ballGoal(0, balls) - 1
    expect(getMovingPositions(balls, 0, '12')).toEqual([ballStart(0, balls) + 11])
    balls[0].state = 'invalid'
    balls[0].position = ballGoal(0, balls) - 1
    expect(getMovingPositions(balls, 0, '2')).toEqual([ballStart(0, balls) + 1])
})

test('Move forward with multiple ball with ordinary number Cards', () => {
    const balls = cloneDeep(ballsSample)

    balls[1].position = ballStart(0, balls) + 11
    balls[0].position = ballStart(0, balls)
    expect(getMovingPositions(balls, 0, '10')).toEqual([ballStart(0, balls) + 10])
    balls[1].position = ballStart(0, balls) + 2
    balls[0].position = ballStart(0, balls)
    expect(getMovingPositions(balls, 0, '13')).toEqual([])
    balls[1].position = ballStart(0, balls) + 5
    balls[0].position = ballStart(0, balls)
    expect(getMovingPositions(balls, 0, '5')).toEqual([ballStart(0, balls) + 5])
})

test('Move forward with multiple ball and into goal - not 7', () => {
    const balls = cloneDeep(ballsSample)
    const nBall = 4

    balls[nBall].position = ballStart(nBall, balls)
    balls[nBall].state = 'invalid'
    balls[0].position = ballGoal(nBall, balls) + 1
    expect(getMovingPositions(balls, nBall, '1')).toEqual([ballStart(nBall, balls) + 1])

    balls[nBall].position = ballStart(nBall, balls)
    balls[nBall].state = 'valid'
    balls[0].position = ballGoal(nBall, balls) + 1
    expect(getMovingPositions(balls, nBall, '1').sort()).toEqual([ballGoal(nBall, balls), ballStart(nBall, balls) + 1].sort())

    balls[nBall].position = ballStart(nBall, balls)
    balls[nBall].state = 'valid'
    balls[0].position = ballGoal(nBall, balls)
    expect(getMovingPositions(balls, nBall, '1')).toEqual([ballStart(nBall, balls) + 1])

    balls[nBall].position = ballStart(nBall, balls)
    balls[nBall].state = 'valid'
    balls[0].position = ballGoal(nBall, balls)
    balls[1].position = ballStart(nBall, balls) + 1
    expect(getMovingPositions(balls, nBall, '1')).toEqual([ballStart(nBall, balls) + 1])

    balls[nBall].position = ballStart(nBall, balls)
    balls[nBall].state = 'valid'
    balls[0].position = ballGoal(nBall, balls) + 1
    balls[1].position = ballStart(nBall, balls) + 1
    expect(getMovingPositions(balls, nBall, '2')).toEqual([])
})

test('Move backward with one or more balls in circle', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls) + 11
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballStart(0, balls) + 7])
    balls[0].position = ballStart(0, balls) + 2
    balls[0].state = 'invalid'
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballGoal(0, balls) - 2])
    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballGoal(0, balls) + 3, ballGoal(0, balls) - 4])

    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    balls[1].position = ballGoal(0, balls) - 1
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballGoal(0, balls) + 3])

    balls[0].position = ballStart(0, balls)
    balls[0].state = 'valid'
    balls[1].position = ballGoal(0, balls) - 4
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballGoal(0, balls) + 3, ballGoal(0, balls) - 4])
})

test('Move backward with one or more balls in goal', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls) + 1
    balls[0].state = 'valid'
    balls[1].position = ballGoal(0, balls) - 1
    expect(getMovingPositions(balls, 0, '4')).toEqual([ballGoal(0, balls) + 2])

    balls[0].position = ballStart(0, balls) + 3
    balls[0].state = 'valid'
    expect(getMovingPositions(balls, 0, '4').sort()).toEqual([ballGoal(0, balls) - 1, ballGoal(0, balls)].sort())
})

test('Starting from house', () => {
    const balls = cloneDeep(ballsSample)

    for (let i = 0; i < balls.length; i++) {
        expect(getMovesLeavingHouse(balls, i, '1')).toEqual([ballStart(i, balls)])
        expect(getMovesLeavingHouse(balls, i, '13')).toEqual([ballStart(i, balls)])
        expect(getMovesLeavingHouse(balls, i, 'engel')).toEqual([ballStart(i, balls)])
    }

    balls[0].position = ballStart(0, balls)
    balls[0].state = 'invalid'
    expect(getMovesLeavingHouse(balls, 0, '1')).toEqual([])
    expect(getMovesLeavingHouse(balls, 1, '1')).toEqual([ballStart(1, balls)])
})

test('Switching Moves', () => {
    const balls = cloneDeep(ballsSample)

    for (let i = 0; i < balls.length; i++) {
        expect(getSwitchingMoves(balls, i)).toEqual([])
    }

    balls[0].position = ballStart(0, balls)
    expect(getSwitchingMoves(balls, 0)).toEqual([])

    balls[5].position = ballStart(5, balls)
    expect(getSwitchingMoves(balls, 0)).toEqual([ballStart(5, balls)])
    expect(getSwitchingMoves(balls, 5)).toEqual([ballStart(0, balls)])

    balls[8].position = ballStart(8, balls) + 5
    expect(getSwitchingMoves(balls, 0).sort()).toEqual([ballStart(5, balls), ballStart(8, balls) + 5].sort())
    expect(getSwitchingMoves(balls, 5).sort()).toEqual([ballStart(0, balls), ballStart(8, balls) + 5].sort())
    expect(getSwitchingMoves(balls, 8).sort()).toEqual([ballStart(0, balls), ballStart(5, balls)].sort())

    balls[8].position = ballGoal(8, balls)
    expect(getSwitchingMoves(balls, 0)).toEqual([ballStart(5, balls)])
    expect(getSwitchingMoves(balls, 5)).toEqual([ballStart(0, balls)])
    expect(getSwitchingMoves(balls, 8)).toEqual([])
})

test('Krieger Test', () => {
    const balls = cloneDeep(ballsSample)

    for (let i = 0; i < balls.length; i++) {
        expect(getKriegerMove(balls, i)).toEqual([])
    }

    balls[0].position = ballGoal(0, balls)
    balls[1].position = ballGoal(0, balls) + 1
    expect(getKriegerMove(balls, 0)).toEqual([])
    expect(getKriegerMove(balls, 1)).toEqual([])

    balls[0].position = ballStart(0, balls)
    expect(getKriegerMove(balls, 0)).toEqual([ballStart(0, balls)])

    balls[0].position = ballStart(8, balls)
    expect(getKriegerMove(balls, 0)).toEqual([ballStart(8, balls)])

    balls[0].position = ballStart(0, balls)
    balls[1].position = ballStart(1, balls) + 1
    balls[2].position = ballStart(2, balls) + 2
    balls[8].position = ballGoal(8, balls)
    expect(getKriegerMove(balls, 0)).toEqual([ballStart(1, balls) + 1])
    expect(getKriegerMove(balls, 1)).toEqual([ballStart(2, balls) + 2])
    expect(getKriegerMove(balls, 2)).toEqual([ballStart(0, balls)])
})

test('Test with ordinary Cards from starting positions', () => {
    const balls = cloneDeep(ballsSample)

    for (let i = 0; i < balls.length; i++) {
        for (let card = 2; card <= 10; card++) {
            if (card === 7) { continue }
            expect(getMoves(balls, i, card.toString(), [[]], false)).toEqual([])
        }
        expect(getMoves(balls, i, '12', [[]], false)).toEqual([])

        expect(getMoves(balls, i, '1', [[]], false)).toEqual([ballStart(i, balls)])
        expect(getMoves(balls, i, '13', [[]], false)).toEqual([ballStart(i, balls)])
    }
})

test('Test with ordinary Cards from arbitrary positions', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls)
    expect(getMoves(balls, 0, '4', [[]], false)).toEqual([ballGoal(0, balls) - 4])
    expect(getMoves(balls, 0, '13', [[]], false)).toEqual([ballStart(0, balls) + 13])
    expect(getMoves(balls, 0, '1', [[]], false)).toEqual([ballStart(0, balls) + 1])

    balls[0].position = ballGoal(0, balls)
    balls[1].position = ballGoal(0, balls) + 3
    expect(getMoves(balls, 0, '1', [[]], false)).toEqual([ballGoal(0, balls) + 1])
    expect(getMoves(balls, 0, '13', [[]], false)).toEqual([])
    expect(getMoves(balls, 0, '4', [[]], false)).toEqual([])
    expect(getMoves(balls, 0, '3', [[]], false)).toEqual([])
    expect(getMoves(balls, 0, '2', [[]], false)).toEqual([ballGoal(0, balls) + 2])
})

test('Test with Krieger, Trickser, Narr', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls)
    expect(getMoves(balls, 0, 'krieger', [[]], false)).toEqual([ballStart(0, balls)])
    expect(getMoves(balls, 0, 'trickser', [[]], false)).toEqual([])
    expect(getMoves(balls, 0, 'narr', [[]], false)).toEqual([])

    balls[5].position = ballStart(5, balls)
    expect(getMoves(balls, 0, 'krieger', [[]], false)).toEqual([ballStart(5, balls)])
    expect(getMoves(balls, 0, 'trickser', [[]], false)).toEqual([ballStart(5, balls)])
    expect(getMoves(balls, 0, 'narr', [[]], false)).toEqual([])

    balls[5].position = ballGoal(5, balls)
    expect(getMoves(balls, 0, 'krieger', [[]], false)).toEqual([ballStart(0, balls)])
    expect(getMoves(balls, 0, 'trickser', [[]], false)).toEqual([])
    expect(getMoves(balls, 0, 'narr', [[]], false)).toEqual([])

    balls[5].position = ballStart(5, balls)
    balls[9].position = ballStart(9, balls)
    expect(getMoves(balls, 0, 'krieger', [[]], false)).toEqual([ballStart(5, balls)])
    expect(getMoves(balls, 0, 'trickser', [[]], false).sort()).toEqual([ballStart(5, balls), ballStart(9, balls)].sort())
    expect(getMoves(balls, 0, 'narr', [[]], false)).toEqual([])
})

test('Test with 7', () => {
    const balls = cloneDeep(ballsSample)

    balls[0].position = ballStart(0, balls)
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false)).toEqual([17, 18, 19, 20, 21, 22, 23])
    expect(getMoves(balls, 0, '7-2', initializeTeams(4, 2), false)).toEqual([17, 18])
    expect(getMoves(balls, 0, '7-5', initializeTeams(4, 2), false)).toEqual([17, 18, 19, 20, 21])

    balls[0].position = ballGoal(0, balls) - 1
    balls[0].state = 'valid'
    expect(getMoves(balls, 0, '7', initializeTeams(4, 2), false).sort()).toEqual([16, 17, 18, 19, 20, 21, 22, ballGoal(0, balls), ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3])
    expect(getMoves(balls, 0, '7-2', initializeTeams(4, 2), false).sort()).toEqual([16, 17, ballGoal(0, balls)])
    expect(getMoves(balls, 0, '7-5', initializeTeams(4, 2), false).sort()).toEqual([16, 17, 18, 19, 20, ballGoal(0, balls), ballGoal(0, balls) + 1, ballGoal(0, balls) + 2, ballGoal(0, balls) + 3])
})