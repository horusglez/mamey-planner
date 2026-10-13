// Picks the right "why this many calories" translation key for a given
// calorie adjustment (negative = deficit, positive = surplus, 0 = maintain).
export function calorieExplainKey(adjustmentPct) {
  if (adjustmentPct < 0) return 'goal.explain.deficit';
  if (adjustmentPct > 0) return 'goal.explain.surplus';
  return 'goal.explain.maintain';
}
