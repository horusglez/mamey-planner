// Maps a streak (consecutive days logging food) to the mascot's growth level.
// The same character "levels up" as the habit sticks.
const LEVEL_META = [
  { max: 0, level: 1, titleKey: 'mascot.level1', img: '/mascot/level-1.jpg' },
  { max: 2, level: 2, titleKey: 'mascot.level2', img: '/mascot/level-2.jpg' },
  { max: 6, level: 3, titleKey: 'mascot.level3', img: '/mascot/level-3.jpg' },
  { max: 13, level: 4, titleKey: 'mascot.level4', img: '/mascot/level-4.jpg' },
  { max: Infinity, level: 5, titleKey: 'mascot.level5', img: '/mascot/level-5.jpg' },
];

export function mascotForStreak(streak, t) {
  const level = LEVEL_META.find((l) => streak <= l.max);
  return { ...level, title: t(level.titleKey) };
}

export function getMascotLevels(t) {
  return LEVEL_META.map((l) => ({ ...l, title: t(l.titleKey) }));
}
