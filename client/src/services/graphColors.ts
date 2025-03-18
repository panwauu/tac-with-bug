function hexToRGBA(h: string, alpha: number) {
  const r = parseInt(h[1] + h[2], 16)
  const g = parseInt(h[3] + h[4], 16)
  const b = parseInt(h[5] + h[6], 16)

  return `rgba(${r},${g},${b},${alpha})`
}

const cssColorCode = ['--p-blue-600', '--p-green-600', '--p-orange-600', '--p-indigo-600', '--p-teal-600', '--p-cyan-600', '--p-yellow-600', '--p-purple-600']

export function getGraphColors(config?: { alpha?: number; elementNumber?: number }) {
  const alpha = config?.alpha ?? 1
  const elementNumber = config?.elementNumber

  const cssVariables = elementNumber != null ? [cssColorCode[elementNumber % cssColorCode.length]] : cssColorCode
  return cssVariables.map((c) => hexToRGBA(getComputedStyle(document.documentElement).getPropertyValue(c), alpha ?? 1))
}
