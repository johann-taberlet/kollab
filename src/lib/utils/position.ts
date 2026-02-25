const POSITION_GAP = 1000

export function getPositionBetween(before: number | null, after: number | null): number {
  if (before === null && after === null) return POSITION_GAP
  if (before === null) return (after! - POSITION_GAP) < 0 ? after! / 2 : after! - POSITION_GAP
  if (after === null) return before + POSITION_GAP
  return Math.round((before + after) / 2)
}

export function needsRebalance(positions: number[]): boolean {
  if (positions.length < 2) return false
  const sorted = [...positions].sort((a, b) => a - b)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] - sorted[i - 1] < 1) return true
  }
  return false
}

export function rebalancePositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_GAP)
}
