import { leftShiftArray, modulo, moduloOffset, reorderArray, rightShiftArray } from './helpers'

describe('Test helper functions', () => {
  test('Modulo should not change numbers in range', () => {
    expect(modulo(0, 1)).toBe(0)
    expect(modulo(5, 11)).toBe(5)
  })

  test('Modulo should project large numbers into range', () => {
    expect(modulo(100, 2)).toBe(0)
  })

  test('Modulo should project negative numbers into range', () => {
    expect(modulo(-1, 2)).toBe(1)
    expect(modulo(-5, 2)).toBe(1)
  })

  test('Modulo with Offset should not change numbers in range', () => {
    expect(moduloOffset(3, 4, 2)).toBe(3)
  })

  test('Modulo with Offset  should project large numbers into range', () => {
    expect(moduloOffset(100, 4, 2)).toBe(2)
  })

  test('Modulo with Offset  should project negative numbers into range', () => {
    expect(moduloOffset(-1, 4, 2)).toBe(3)
    expect(moduloOffset(-5, 4, 2)).toBe(3)
  })

  test('Array should be shifted to the right', () => {
    expect(rightShiftArray(['a', 'b', 'c'], 1)).toEqual(['c', 'a', 'b'])
    expect(rightShiftArray(['a', 'b', 'c'], -2)).toEqual(['c', 'a', 'b'])
  })

  test('Array should be shifted to the left', () => {
    expect(leftShiftArray(['a', 'b', 'c'], 1)).toEqual(['b', 'c', 'a'])
    expect(leftShiftArray(['a', 'b', 'c'], -2)).toEqual(['b', 'c', 'a'])
  })

  test('Left and right shift should neutralize', () => {
    const n = 1
    const array = [1, 2, 3, 4, 5] //Array(10).fill(0).map(() => Math.random())
    expect(leftShiftArray(rightShiftArray(array, n), n)).toEqual(array)
  })

  test('Array should be ordered', () => {
    expect(reorderArray(['a', 'b', 'c'], [1, 0, 2])).toEqual(['b', 'a', 'c'])
  })

  test('Array should be ordered for random array', () => {
    const order = Array.from(Array(10).keys()).sort(() => {
      return Math.random() - 0.5
    })
    expect(reorderArray(Array.from(Array(10).keys()), order)).toEqual(order)
  })

  test('Order Array should be reversible for random array and random order', () => {
    const array = Array(10)
      .fill(0)
      .map(() => Math.random())
    const order = Array.from(Array(array.length).keys()).sort(() => {
      return Math.random() - 0.5
    })
    expect(reorderArray(reorderArray(array, order), order, true)).toEqual(array)
  })
})
