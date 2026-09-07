import type { AchievementDef } from '../types'

/** 32 достижения. Накопительные имеют target и показывают прогресс. */
export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-blood',
    title: 'Первое движение',
    description: 'Совершите любое действие цитадели.',
  },
  { id: 'first-sector', title: 'Первый захват', description: 'Возьмите под контроль сектор.' },
  { id: 'first-module', title: 'Интеграция', description: 'Установите первый модуль.' },
  {
    id: 'first-tech',
    title: 'Прикладная наука',
    description: 'Откройте первую технологию добычи.',
  },
  {
    id: 'first-doctrine',
    title: 'Выбор пути',
    description: 'Примите доктрину и определите путь империи.',
  },
  { id: 'first-battle', title: 'Крещение', description: 'Победите в первом бою.' },
  { id: 'first-raid', title: 'Отражено', description: 'Переживите иммунный рейд.' },

  { id: 'region-venous', title: 'За воротами', description: 'Откройте Венозные пределы.' },
  { id: 'region-arterial', title: 'Под давлением', description: 'Откройте Артериальный предел.' },
  {
    id: 'region-cortex',
    title: 'У порога разума',
    description: 'Пробейте гемато-энцефалический барьер.',
  },
  { id: 'sovereign', title: 'Суверен', description: 'Одолейте Суверена Иммунис в Тронном синусе.' },
  {
    id: 'siege-survivor',
    title: 'Выстоявший',
    description: 'Переживите осаду после низложения Суверена.',
  },
  {
    id: 'second-cycle',
    title: 'Цикл второго порядка',
    description: 'Начните забег заново с перенесённым прогрессом.',
  },

  { id: 'sectors-10', title: 'Держава', description: 'Контролируйте 10 секторов.', target: 10 },
  { id: 'sectors-20', title: 'Империя', description: 'Контролируйте 20 секторов.', target: 20 },
  {
    id: 'sectors-all',
    title: 'Тотальный контроль',
    description: 'Захватите все 38 секторов.',
    target: 38,
  },

  { id: 'plasma-1000', title: 'Половодье', description: 'Накопите 1000 плазмы.', target: 1000 },
  { id: 'clots-500', title: 'Плотность', description: 'Накопите 500 сгустков.', target: 500 },
  { id: 'essence-100', title: 'Концентрат', description: 'Накопите 100 эссенции.', target: 100 },

  { id: 'level-5', title: 'Зрелость', description: 'Достигните 5 уровня.', target: 5 },
  { id: 'level-10', title: 'Апогей', description: 'Достигните 10 уровня.', target: 10 },

  { id: 'battles-10', title: 'Ветеран', description: 'Выиграйте 10 боёв.', target: 10 },
  { id: 'battles-25', title: 'Мясник русел', description: 'Выиграйте 25 боёв.', target: 25 },
  {
    id: 'streak-5',
    title: 'Без единой царапины',
    description: 'Выиграйте 5 боёв подряд.',
    target: 5,
  },

  { id: 'modules-5', title: 'Конструктор', description: 'Установите 5 модулей.', target: 5 },
  { id: 'modules-15', title: 'Архитектор', description: 'Установите 15 модулей.', target: 15 },
  {
    id: 'branch-max',
    title: 'До предела',
    description: 'Прокачайте любой модуль до максимального уровня.',
  },
  {
    id: 'doctrine-max',
    title: 'Догмат',
    description: 'Доведите доктрину до максимального уровня.',
  },
  { id: 'tech-10', title: 'Технократ', description: 'Откройте 10 технологий добычи.', target: 10 },

  { id: 'ghost', title: 'Призрак', description: 'Доведите маскировку до 90 при 10+ секторах.' },
  { id: 'calm', title: 'Полный штиль', description: 'Опустите угрозу до нуля.' },
  {
    id: 'brink',
    title: 'На грани',
    description: 'Выиграйте бой, имея менее 10 целостности.',
    secret: true,
  },
  {
    id: 'pacifist-region',
    title: 'Тихий захват',
    description: 'Возьмите весь Регион I, ни разу не отступив.',
    secret: true,
  },
  { id: 'cycle-50', title: 'Долгая партия', description: 'Доживите до 50-го цикла.', target: 50 },
]

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(
  ACHIEVEMENTS.map(a => [a.id, a]),
)
