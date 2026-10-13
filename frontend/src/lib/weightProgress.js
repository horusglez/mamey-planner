// Simple linear regression over recent weight entries to estimate a weekly
// rate of change, then projects weeks remaining to a target weight.
export function computeWeightProgress(history, targetWeightKg) {
  const points = history
    .filter((m) => m.weight_kg != null)
    .map((m) => ({ t: new Date(m.recorded_at).getTime(), weight: Number(m.weight_kg) }))
    .sort((a, b) => a.t - b.t);

  if (points.length === 0) return null;
  const currentWeight = points[points.length - 1].weight;
  const startWeight = points[0].weight;

  if (!targetWeightKg) return { currentWeight, startWeight, targetWeightKg: null };

  const totalChange = targetWeightKg - currentWeight;
  if (Math.abs(totalChange) < 0.1) {
    return { currentWeight, startWeight, targetWeightKg, reached: true };
  }

  if (points.length < 3) {
    return { currentWeight, startWeight, targetWeightKg, weeklyRate: null };
  }

  // Linear regression: weight = a + b*days
  const t0 = points[0].t;
  const xs = points.map((p) => (p.t - t0) / 86400000); // days since first entry
  const ys = points.map((p) => p.weight);
  const n = xs.length;
  const sumX = xs.reduce((a, b) => a + b, 0);
  const sumY = ys.reduce((a, b) => a + b, 0);
  const sumXY = xs.reduce((a, x, i) => a + x * ys[i], 0);
  const sumXX = xs.reduce((a, x) => a + x * x, 0);
  const denom = n * sumXX - sumX * sumX;
  const slopePerDay = denom !== 0 ? (n * sumXY - sumX * sumY) / denom : 0;
  const weeklyRate = slopePerDay * 7;

  const movingRightDirection = (totalChange > 0 && weeklyRate > 0.01) || (totalChange < 0 && weeklyRate < -0.01);
  const weeksRemaining = movingRightDirection ? Math.abs(totalChange / weeklyRate) : null;

  return { currentWeight, startWeight, targetWeightKg, weeklyRate, weeksRemaining, movingRightDirection };
}
