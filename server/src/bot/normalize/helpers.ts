export function modulo(a: number, n: number) { return ((a % n) + n) % n }
export function moduloOffset(a: number, n: number, offset: number) { return modulo(a - offset, n - offset) + offset }

export function rightShiftArray<T>(array: T[], shiftBy: number): T[] { return leftShiftArray(array, -1 * shiftBy) }
export function leftShiftArray<T>(array: T[], shiftBy: number): T[] { return [...array.slice(modulo(shiftBy, array.length)), ...array.slice(0, modulo(shiftBy, array.length))] }

export function reorderArray<T>(array: T[], order: number[], revertFlag?: boolean) {
    if (array.length != order.length) { throw new Error('Order has to be the same length as the error to be ordered') }
    for (let i = 0; i < array.length; i++) { if (order.find((o) => o === i) === undefined) { throw new Error(`Order has to contain each element in array: index ${i} missing`) } }

    const returnArray: T[] = []
    if (revertFlag === true) {
        const revertedOrder = Array.from(Array(array.length).keys()).sort((a, b) => order[a] - order[b])
        revertedOrder.forEach((o) => returnArray.push(array[o]))
    } else {
        order.forEach((o) => returnArray.push(array[o]))
    }
    return returnArray
}
