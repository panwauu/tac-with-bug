import { testCapturedMoves } from '../test/captureCompare'

describe('Test suite with recorded games', () => {
    test('Placeholder', () => { expect(true).toBe(true) })

    test('Test with captured Game 101 -> At the end Teufel with abwerfen chosen', () => {
        expect(testCapturedMoves('101').equal).toBe(true)
    })

    test('Test with captured Game 189 -> Multiple Tac After Narr', () => {
        expect(testCapturedMoves('189').equal).toBe(true)
    })

    test('Test with captured Game 184 -> Multiple Tac After Engel', () => {
        expect(testCapturedMoves('184').equal).toBe(true)
    })

    test('Test with captured Game 183 -> Multiple Tac After 7', () => {
        expect(testCapturedMoves('183').equal).toBe(true)
    })

    test('Test with captured Game 115/182 -> Multiple Tac After teufel', () => {
        expect(testCapturedMoves('115').equal).toBe(true)
        expect(testCapturedMoves('182').equal).toBe(true)
    })

    test('Test with captured Game 185 -> Multiple Tac After 8', () => {
        expect(testCapturedMoves('185').equal).toBe(true)
        expect(testCapturedMoves('188').equal).toBe(true)
    })

    test('Test with captured Game 186 -> Multiple Tac After krieger', () => {
        expect(testCapturedMoves('186').equal).toBe(true)
    })

    test('Test with captured Game 187 -> Multiple Tac After trickser', () => {
        expect(testCapturedMoves('187').equal).toBe(true)
    })

    test('Test with captured Game 119/120 -> 7 and Goal Area', () => {
        expect(testCapturedMoves('119').equal).toBe(true)
    })

    test('Test with captured Game 122 -> Teufel and aussetzen', () => {
        expect(testCapturedMoves('122').equal).toBe(true)
    })

    test('Test with captured Game 123/124 -> 7 and in house', () => {
        expect(testCapturedMoves('123').equal).toBe(true)
        expect(testCapturedMoves('124').equal).toBe(true)
    })

    test('Test with captured Game 125/147 -> changed trade order', () => {
        expect(testCapturedMoves('125').equal).toBe(true)
        expect(testCapturedMoves('147').equal).toBe(true)
    })

    test('Test with captured Game 179 -> multiple TAC with new rules', () => {
        const result = testCapturedMoves('179')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 192 -> test Tracked reset', () => {
        const result = testCapturedMoves('192')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 206 - krieger kicking itself', () => {
        const result = testCapturedMoves('206')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 242 - Coop', () => {
        const result = testCapturedMoves('242')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Game 383', () => {
        const result = testCapturedMoves('383')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 384 -> multiple TAC with Teufel and Narr', () => {
        const result = testCapturedMoves('384')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 647 -> Tac after abgeworfener Narr', () => {
        const result = testCapturedMoves('647')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Game 769 -> Narr with some players without and some with cards', () => {
        const result = testCapturedMoves('769')
        expect(result.equal).toBe(true)
    })

    test('Test with captured Game 771 -> Narr als letzte Karte', () => {
        const result = testCapturedMoves('771')
        expect(result.equal).toBe(true)
        expect(result.game?.cardsWithMoves[0].possible).toBe(true)
        expect(result.game?.cardsWithMoves[0].textAction).toBe('abwerfen')
    })

    test('Test with captured Game 12253 -> Tac und Narr Kombinationen', () => {
        const result = testCapturedMoves('12253')
        expect(result.equal).toBe(true)
        expect(result.game?.cardsWithMoves[0].possible).toBe(true)
    })

    test('Test with captured Game 12254 -> Getacter abgeworfener Narr wird als Narr genutzt', () => {
        const result = testCapturedMoves('12254')
        expect(result.equal).toBe(true)
        expect(result.game?.cardsWithMoves[0].possible).toBe(true)
    })

    test('Test with captured Game 12256 -> getacter Narr als letzte Karte muss abgeworfen werden', () => {
        const result = testCapturedMoves('12256')
        expect(result.equal).toBe(true)
    })

    test('Test with captured Prod Game 9', () => {
        const result = testCapturedMoves('9prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 29', () => {
        const result = testCapturedMoves('29prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
        expect(result.game?.cardsWithMoves).toEqual([
            {
                title: '9',
                possible: true,
                ballActions: {},
                textAction: 'abwerfen'
            }
        ])
    })

    test('Test with captured Prod Game 31', () => {
        const result = testCapturedMoves('31prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 31 - COOP', () => {
        const result = testCapturedMoves('31prodCoop', 4, 2, true, true)
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 38', () => {
        const result = testCapturedMoves('38prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
        expect(result.game?.cardsWithMoves[0].ballActions['2']).toEqual([78, 79, 16, 17, 18, 19, 20])
    })

    test('Test with captured Prod Game 216', () => {
        const result = testCapturedMoves('216prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 282', () => {
        const result = testCapturedMoves('282prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)

        expect(Object.keys(result.game?.cardsWithMoves[0].ballActions ?? {}).every((key) => Math.floor(parseInt(key) / 4) === 4)).toBe(true)
    })

    test('Test with captured Prod Game 308', () => {
        const result = testCapturedMoves('308prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)

        expect(result.game?.cardsWithMoves[1].ballActions['6']).toEqual([35, 94, 36, 37, 38, 39, 40])
    })

    test('Test with captured Prod Game 338', () => {
        const result = testCapturedMoves('338prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 607', () => {
        const result = testCapturedMoves('607prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)

        expect(result.game?.cardsWithMoves[0]).toEqual({
            title: '7',
            possible: true,
            ballActions: {
                '0': [
                    76, 77, 78, 79,
                    16, 17, 18
                ]
            },
            textAction: ''
        })
    })

    test('Test with captured Prod Game 942', () => {
        const result = testCapturedMoves('942prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 1644 - Narr as last card', () => {
        const result = testCapturedMoves('1644prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 2299 - Ended Coop', () => {
        const result = testCapturedMoves('2299prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 2299 - Not Ended Coop with Tac', () => {
        const result = testCapturedMoves('2299prodTacAdded')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 3951 - Narr as last card', () => {
        const result = testCapturedMoves('3951prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4026 - Last Card as last card', () => {
        const result = testCapturedMoves('4026prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4276 - Continue with 7 on another players balls', () => {
        const result = testCapturedMoves('4276prod-changed')
        expect(result.equal).toBe(true)
    })

    test('Test with captured Prod Game 4276', () => {
        const result = testCapturedMoves('4276prod')
        expect(result.equal).toBe(true)
        expect(result.game?.cardsWithMoves[0].possible).toBe(true)
    })

    test('Test with captured Prod Game 4380', () => {
        const result = testCapturedMoves('4380prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4381', () => {
        const result = testCapturedMoves('4381prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
        expect(result.game?.cardsWithMoves[0].textAction).toBe('')
    })

    test('Test with captured Prod Game 4416', () => {
        const result = testCapturedMoves('4416prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4423', () => {
        const result = testCapturedMoves('4423prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('X Test with captured Prod Game 4429', () => {
        const result = testCapturedMoves('4429prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4435', () => {
        const result = testCapturedMoves('4435prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4449', () => {
        const result = testCapturedMoves('4449prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4450', () => {
        const result = testCapturedMoves('4450prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4451', () => {
        const result = testCapturedMoves('4451prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4452', () => {
        const result = testCapturedMoves('4452prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4453', () => {
        const result = testCapturedMoves('4453prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4454', () => {
        const result = testCapturedMoves('4454prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('X Test with captured Prod Game 4455', () => {
        const result = testCapturedMoves('4455prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('X Test with captured Prod Game 4456', () => {
        const result = testCapturedMoves('4456prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4457', () => {
        const result = testCapturedMoves('4457prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4458', () => {
        const result = testCapturedMoves('4458prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4459', () => {
        const result = testCapturedMoves('4459prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4460', () => {
        const result = testCapturedMoves('4460prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4461', () => {
        const result = testCapturedMoves('4461prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4462', () => {
        const result = testCapturedMoves('4462prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4464', () => {
        const result = testCapturedMoves('4464prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4465', () => {
        const result = testCapturedMoves('4465prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4467', () => {
        const result = testCapturedMoves('4467prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4466', () => {
        const result = testCapturedMoves('4466prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4468', () => {
        const result = testCapturedMoves('4468prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4469', () => {
        const result = testCapturedMoves('4469prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('Test with captured Prod Game 4571', () => {
        const result = testCapturedMoves('4571prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
        expect(result.game?.cardsWithMoves[1].ballActions[5]).toStrictEqual([28])
        expect(result.game?.cardsWithMoves[3].ballActions[5]).toStrictEqual([28])
    })

    test('Test with captured Prod Game 5467', () => {
        const result = testCapturedMoves('5467prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(false)
    })

    test('Test with captured Prod Game 5920', () => {
        const result = testCapturedMoves('5920prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('X Test with captured Prod Game 7652', () => {
        const result = testCapturedMoves('7652prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })

    test('X Test with captured Prod Game 9791', () => {
        const result = testCapturedMoves('9791prod')
        expect(result.equal).toBe(true)
        expect(result.ended).toBe(true)
    })
})
