/**
 * Все числовые константы баланса собраны в одном месте.
 *
 * Правило проекта: в системах и контенте не должно быть «магических» чисел —
 * их правят здесь, чтобы перебалансировка была одним диффом.
 */

export const BALANCE = {
  start: {
    plasma: 40,
    clots: 12,
    essence: 0,
    integrity: 100,
    threat: 8,
    masking: 20,
    energy: 6,
  },

  citadel: {
    baseAttack: 8,
    baseDefense: 1,
    baseMaxIntegrity: 100,
    baseMaxEnergy: 6,
    /**
     * Базовое восстановление за цикл. Без него ранняя игра безвыходна:
     * лечение требует ресурсов, которых на первых циклах ещё нет, и любой
     * накопленный урон становится необратимым.
     */
    baseRegen: 4,
    /** Базовый доход за цикл без секторов — чтобы игра не вставала колом. */
    baseIncome: { plasma: 6, clots: 0, essence: 0 },
  },

  threat: {
    /** Прирост за цикл просто за существование. */
    base: 1.5,
    /** Верхняя и нижняя границы шкалы. */
    min: 0,
    max: 100,
    /** Маскировка снижает прирост, но не более чем на этот множитель. */
    maskingCap: 0.75,
    /** Делитель: masking / divisor = доля снижения. */
    maskingDivisor: 133,
    /** Порог, с которого иммунная система начинает рейды. */
    raidThreshold: 60,
    /** Шанс рейда за цикл при угрозе на пороге и на максимуме. */
    raidChanceAtThreshold: 0.15,
    raidChanceAtMax: 0.8,
    /** Сколько угрозы снимает успешно отражённый рейд. */
    raidRelief: 30,
    /** Урон, если рейд не отражён (игрок отступил). */
    raidBreachDamage: 18,
  },

  masking: {
    /** Естественная деградация за цикл. */
    decay: 3,
    max: 100,
    /** Действие «Маскировка»: прирост и стоимость. */
    actionGain: 14,
    actionCost: { plasma: 15 },
    actionEnergy: 1,
  },

  actions: {
    harvest: { energy: 1, gain: 18 },
    refine: { energy: 1, cost: { plasma: 22 }, gain: 9 },
    transmute: { energy: 2, cost: { clots: 14 }, gain: 3 },
    scan: { energy: 1, threatRelief: 4 },
    mend: { energy: 2, cost: { plasma: 40 }, heal: 26 },
    /** Захват сектора без гарнизона. */
    occupy: { energy: 2 },
    /** Штурм сектора с гарнизоном. */
    assault: { energy: 2 },
  },

  /**
   * Бой — отдельная последовательность ходов и НЕ тратит энергию цикла.
   * Иначе получалась ловушка: энергия кончается посреди схватки, а пополнить
   * её можно только завершив цикл, что во время боя запрещено, — и любой
   * достаточно живучий противник становился непобедимым.
   * Цена боя — целостность (и сгустки на всплеск), а не очки действий.
   */
  combat: {
    strike: { power: 1 },
    surge: { cost: { clots: 10 }, power: 2.1 },
    focus: { multiplier: 1.6 },
    guard: { reduction: 0.6 },
    rupture: { armorBreak: 6, power: 0.4 },
    withdraw: { threatPenalty: 10 },
    /** Разброс урона игрока: ±этой доли. */
    variance: 0.15,
    critChance: 0.08,
    critPerLevel: 0.012,
    critMultiplier: 1.8,
    weaknessMultiplier: 1.5,
    /** Сила гарнизона растёт со сложностью сектора. */
    hpPerDifficulty: 9,
    attackPerDifficulty: 1.6,
    /**
     * Потолок лечения врага за ход, доля от его максимума. Без него противник
     * с регенерацией восстанавливался быстрее, чем игрок наносит урон, и бой
     * становился не сложным, а математически невыигрываемым.
     */
    enemyHealCap: 0.1,
  },

  progression: {
    /** Опыт, нужный для перехода на уровень N (индекс = уровень − 1). */
    xpCurve: [0, 80, 200, 380, 620, 940, 1340, 1840, 2450, 3180, 4050, 5080],
    /** Прибавки за каждый уровень сверх первого. */
    perLevel: {
      attack: 1,
      defense: 0.5,
      maxIntegrity: 8,
      masking: 0.5,
    },
    /** Восстановление целостности при повышении уровня. */
    levelUpHeal: 12,
  },

  xp: {
    harvest: 2,
    refine: 3,
    transmute: 5,
    occupy: 12,
    battleWin: 30,
    raidWin: 45,
  },

  log: { limit: 60 },
} as const

/** Уровень по опыту (1-based). */
export function levelForXp(xp: number): number {
  const curve = BALANCE.progression.xpCurve
  let level = 1
  for (let i = 0; i < curve.length; i += 1) {
    const threshold = curve[i]
    if (threshold === undefined) break
    if (xp >= threshold) level = i + 1
    else break
  }
  return level
}

/** Опыт, нужный на следующий уровень; null — достигнут максимум. */
export function xpForNextLevel(level: number): number | null {
  const curve = BALANCE.progression.xpCurve
  return curve[level] ?? null
}
