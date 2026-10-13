const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

// Mifflin-St Jeor
export function estimateTDEE({ sex, weightKg, heightCm, age, activityLevel }) {
  const base = sex === 'female'
    ? 10 * weightKg + 6.25 * heightCm - 5 * age - 161
    : 10 * weightKg + 6.25 * heightCm - 5 * age + 5;
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel] || ACTIVITY_MULTIPLIERS.moderate;
  return Math.round(base * multiplier);
}

const CALORIE_ADJUSTMENT_PCT = { cut: -20, bulk: 10, recomp: -5, maintain: 0 };

// Returns suggested calories + macro split given a goal type and body weight.
// Also returns the inputs behind the math (adjustmentPct, proteinPerKg) so
// the UI can explain *why* these numbers, not just state them.
export function suggestGoalTargets({ tdee, goalType, weightKg }) {
  const adjustmentPct = CALORIE_ADJUSTMENT_PCT[goalType] ?? 0;
  const calories = Math.round(tdee * (1 + adjustmentPct / 100));

  // Protein anchored to bodyweight (recomp/cut lean toward higher protein),
  // remaining split between carbs/fat.
  const proteinPerKg = goalType === 'bulk' ? 1.8 : 2.2;
  const proteinG = Math.round(weightKg * proteinPerKg);
  const fatG = Math.round((calories * 0.25) / 9);
  const proteinCalories = proteinG * 4;
  const fatCalories = fatG * 9;
  const carbsG = Math.max(0, Math.round((calories - proteinCalories - fatCalories) / 4));

  return { calories, proteinG, carbsG, fatG, adjustmentPct, proteinPerKg };
}
