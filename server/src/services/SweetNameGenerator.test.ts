import Chance from 'chance';
const chance = new Chance();
import { getDifferentName, isASweetName } from '../services/SweetNameGenerator';

test('getDifferentName', () => {
    const name = getDifferentName([])
    expect(name.isErr()).toBe(false)
    if (name.isErr()) { return }
    expect(typeof name.value).toBe('string')
    const elements = name.value.split(' ')
    expect(elements.length).toBe(2)
    expect(elements[0][0] === elements[1][0]).toBe(true)
});

test('getDifferentName Limit', () => {
    const names: string[] = []
    let returnsError = false
    for (let i = 0; i < 4000; i++) {
        const name = getDifferentName(names)
        if (name.isErr()) {
            returnsError = true
            break;
        }
        names.push(name.value)
    }
    expect(returnsError).toBe(true)
});

test('isASweetName', () => {
    const name = getDifferentName([])
    expect(name.isErr()).toBe(false)
    if (name.isErr()) { return }
    expect(isASweetName(name.value)).toBe(true)
    const falseName = chance.word({ length: 24 })
    expect(isASweetName(falseName)).toBe(false)
    const falseNameTwoPart = chance.word({ length: 8 }) + ' ' + chance.word({ length: 8 })
    expect(isASweetName(falseNameTwoPart)).toBe(false)
});
