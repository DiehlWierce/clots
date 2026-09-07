import type { EventDef } from '../types'

/**
 * События между циклами.
 *
 * Мир игры был статичен: цикл всегда сводился к доходу, угрозе и иногда рейду.
 * Событие — это короткая развилка с явными последствиями: игрок видит, что
 * получит и чем заплатит, до того как выбрал. Скрытых исходов здесь нет
 * намеренно — решение должно быть решением, а не лотереей.
 */
export const EVENTS: EventDef[] = [
  {
    id: 'capillary-rupture',
    title: 'Разрыв капилляра',
    text: 'Одно из русел не выдержало давления. Течение уходит в ткань, и с каждым мгновением потери растут.',
    options: [
      {
        id: 'seal',
        label: 'Запечатать разрыв сгустками',
        outcome: 'Потратить сгустки, но сохранить поток.',
        resources: { clots: -25 },
        requires: { clots: 25 },
      },
      {
        id: 'bleed',
        label: 'Дать вытечь',
        outcome: 'Сберечь материал ценой целостности ядра.',
        integrity: -22,
      },
    ],
  },
  {
    id: 'immune-defector',
    title: 'Перебежчик',
    text: 'Одинокий фагоцит отбился от патруля и предлагает служить империи. Он не объясняет причин.',
    minCycle: 5,
    options: [
      {
        id: 'hire',
        label: 'Принять за эссенцию',
        outcome: 'Опыт и снижение угрозы: он знает маршруты патрулей.',
        resources: { essence: -4 },
        requires: { essence: 4 },
        threat: -14,
        xp: 40,
      },
      {
        id: 'consume',
        label: 'Поглотить',
        outcome: 'Сгустки и немного опыта, но иммунитет заметит пропажу.',
        resources: { clots: 40 },
        threat: 6,
        xp: 15,
      },
      {
        id: 'ignore',
        label: 'Отпустить',
        outcome: 'Ничего не происходит. Он уходит.',
      },
    ],
  },
  {
    id: 'hormonal-surge',
    title: 'Гормональный всплеск',
    text: 'Система впрыснула в кровоток команду, смысла которой империя не понимает. Русла на мгновение переполнены.',
    minCycle: 4,
    options: [
      {
        id: 'ride',
        label: 'Оседлать волну',
        outcome: 'Крупная разовая добыча ценой резкого роста угрозы.',
        resources: { plasma: 220, clots: 60 },
        threat: 16,
      },
      {
        id: 'hide',
        label: 'Переждать в тени',
        outcome: 'Ничего не взять, но маскировка вырастет.',
        masking: 20,
      },
    ],
  },
  {
    id: 'marrow-echo',
    title: 'Эхо костного мозга',
    text: 'Из глубины приходит сигнал рождения новых клеток. Его можно перехватить — или заглушить.',
    minCycle: 8,
    options: [
      {
        id: 'harvest',
        label: 'Перехватить поток',
        outcome: 'Много плазмы, но сигнал разойдётся по системе.',
        resources: { plasma: 280 },
        threat: 12,
      },
      {
        id: 'silence',
        label: 'Заглушить',
        outcome: 'Угроза падает, ресурсов нет.',
        threat: -20,
        masking: 10,
      },
      {
        id: 'study',
        label: 'Изучить структуру',
        outcome: 'Заметный опыт: империя понимает систему чуть лучше.',
        xp: 90,
      },
    ],
  },
  {
    id: 'clot-cannibals',
    title: 'Сгустки-каннибалы',
    text: 'Часть собственной массы вышла из-под контроля и пожирает соседние узлы. Империя столкнулась с собой.',
    minCycle: 10,
    minSectors: 5,
    options: [
      {
        id: 'purge',
        label: 'Вычистить силой',
        outcome: 'Немедленный бой с отбившейся массой.',
        fight: 'clot-eater',
      },
      {
        id: 'absorb',
        label: 'Поглотить обратно',
        outcome: 'Вернуть массу ценой целостности: она сопротивляется.',
        resources: { clots: 70 },
        integrity: -30,
      },
      {
        id: 'cede',
        label: 'Отдать им узел',
        outcome: 'Потерять ресурсы, но избежать потерь и шума.',
        resources: { plasma: -150 },
        requires: { plasma: 150 },
      },
    ],
  },
  {
    id: 'lymph-census',
    title: 'Лимфатическая перепись',
    text: 'Система пересчитывает клетки. Империю можно записать как норму — если подделать сигнатуру.',
    minCycle: 6,
    minThreat: 30,
    options: [
      {
        id: 'forge',
        label: 'Подделать сигнатуру',
        outcome: 'Дорого по эссенции, зато угроза резко падает.',
        resources: { essence: -6 },
        requires: { essence: 6 },
        threat: -30,
      },
      {
        id: 'hide-mass',
        label: 'Спрятать часть массы',
        outcome: 'Отдать сгустки, чтобы не попасть в отчёт.',
        resources: { clots: -50 },
        requires: { clots: 50 },
        threat: -15,
      },
      {
        id: 'defy',
        label: 'Не прятаться',
        outcome: 'Империю запишут как аномалию.',
        threat: 18,
        xp: 30,
      },
    ],
  },
  {
    id: 'oxygen-debt',
    title: 'Кислородный долг',
    text: 'Ткани требуют больше, чем система успевает доставить. Империя может помочь — или воспользоваться.',
    minCycle: 12,
    options: [
      {
        id: 'supply',
        label: 'Поделиться потоком',
        outcome: 'Отдать плазму, зато система на время перестанет искать врага.',
        resources: { plasma: -200 },
        requires: { plasma: 200 },
        threat: -25,
        masking: 12,
      },
      {
        id: 'exploit',
        label: 'Забрать своё',
        outcome: 'Эссенция и опыт, пока всем не до вас — но потом заметят.',
        resources: { essence: 10 },
        threat: 14,
        xp: 60,
      },
    ],
  },
  {
    id: 'dormant-forge',
    title: 'Спящий горн',
    text: 'В стенке сосуда обнаружен заглушённый узел синтеза. Его можно запустить, но он шумит.',
    minCycle: 14,
    minSectors: 8,
    options: [
      {
        id: 'ignite',
        label: 'Запустить',
        outcome: 'Постоянная прибавка к максимуму энергии ценой шума.',
        resources: { essence: -8 },
        requires: { essence: 8 },
        energy: 1,
        threat: 10,
      },
      {
        id: 'strip',
        label: 'Разобрать на материал',
        outcome: 'Много сгустков сразу, узел больше не пригодится.',
        resources: { clots: 120 },
      },
    ],
  },
  {
    id: 'immune-memory',
    title: 'Иммунная память',
    text: 'Система вспомнила предыдущие столкновения и подстроила патрули под вашу тактику.',
    minCycle: 16,
    minThreat: 50,
    options: [
      {
        id: 'rebuild',
        label: 'Перестроить контур',
        outcome: 'Сбросить накопленную угрозу дорогой ценой.',
        resources: { plasma: -180, clots: -60 },
        requires: { plasma: 180, clots: 60 },
        threat: -35,
      },
      {
        id: 'endure',
        label: 'Принять бой',
        outcome: 'Немедленное столкновение с подготовленным охотником.',
        fight: 'drift-hunter',
      },
    ],
  },
  {
    id: 'plasma-tide',
    title: 'Плазменный прилив',
    text: 'Редкое совпадение течений: русла на несколько мгновений отдают втрое больше обычного.',
    minCycle: 3,
    options: [
      {
        id: 'collect',
        label: 'Собрать всё',
        outcome: 'Крупная добыча плазмы без последствий. Такое бывает.',
        resources: { plasma: 180 },
        xp: 20,
      },
    ],
  },
]

export const EVENT_BY_ID: ReadonlyMap<string, EventDef> = new Map(EVENTS.map(e => [e.id, e]))
