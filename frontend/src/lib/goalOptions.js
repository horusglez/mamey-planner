// Takes the t() function from useLang() so goal copy follows the active language.
export function getGoalOptions(t) {
  return [
    {
      value: 'cut',
      emoji: '🔥',
      title: t('goal.cut.title'),
      desc: t('goal.cut.desc'),
      forWho: t('goal.cut.forWho'),
      expect: t('goal.cut.expect'),
      motivation: t('goal.cut.motivation'),
    },
    {
      value: 'bulk',
      emoji: '💪',
      title: t('goal.bulk.title'),
      desc: t('goal.bulk.desc'),
      forWho: t('goal.bulk.forWho'),
      expect: t('goal.bulk.expect'),
      motivation: t('goal.bulk.motivation'),
    },
    {
      value: 'recomp',
      emoji: '⚖️',
      title: t('goal.recomp.title'),
      desc: t('goal.recomp.desc'),
      forWho: t('goal.recomp.forWho'),
      expect: t('goal.recomp.expect'),
      motivation: t('goal.recomp.motivation'),
    },
    {
      value: 'maintain',
      emoji: '🌿',
      title: t('goal.maintain.title'),
      desc: t('goal.maintain.desc'),
      forWho: t('goal.maintain.forWho'),
      expect: t('goal.maintain.expect'),
      motivation: t('goal.maintain.motivation'),
    },
  ];
}
