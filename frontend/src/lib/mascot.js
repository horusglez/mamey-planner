// Maps a streak (consecutive days logging food) to the mascot's growth level.
// The same character "levels up" as the habit sticks.
const LEVELS = [
  { max: 0, level: 1, title: 'Nivel 1 — El Hueso', img: '/mascot/level-1.jpg' },
  { max: 2, level: 2, title: 'Nivel 2 — Adaptación', img: '/mascot/level-2.jpg' },
  { max: 6, level: 3, title: 'Nivel 3 — En Crecimiento', img: '/mascot/level-3.jpg' },
  { max: 13, level: 4, title: 'Nivel 4 — Consolidación', img: '/mascot/level-4.jpg' },
  { max: Infinity, level: 5, title: 'Nivel 5 — Mamey Maduro', img: '/mascot/level-5.jpg' },
];

export function mascotForStreak(streak) {
  return LEVELS.find((l) => streak <= l.max);
}

export const MASCOT_LEVELS = LEVELS;
