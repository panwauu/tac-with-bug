export const testIf = (condition: boolean, ...args: Parameters<typeof test>) =>
    condition ? test(...args) : test.skip(...args);

export const itIf = (condition: boolean, ...args: Parameters<typeof it>) =>
    condition ? it(...args) : it.skip(...args);

export const describeIf = (condition: boolean, ...args: Parameters<typeof describe>) =>
    condition ? describe(...args) : describe.skip(...args);
