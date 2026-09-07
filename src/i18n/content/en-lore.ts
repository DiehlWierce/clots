import type { ContentPack } from './types'

/**
 * Английский перевод летописи.
 *
 * Лор — не подстановка строк, а литературный текст: перевод сохраняет
 * интонацию оригинала, а не идёт по словам. Он вынесен в отдельный файл,
 * потому что грузится только при открытии «Хроники».
 */
export const enLore: Required<Pick<ContentPack, 'loreEras' | 'loreChapters'>> = {
  loreEras: {
    'era-origin': {
      title: 'The Age of Origin',
      period: 'Cycles 1–10',
      summary: 'How the flow learned to remember itself, and decided it wanted to continue.',
    },
    'era-forge': {
      title: 'The Age of Tempering',
      period: 'Cycles 10–30',
      summary: 'When the paths diverged and the choice became irreversible.',
    },
    'era-pressure': {
      title: 'The Age of Pressure',
      period: 'Cycles 30–60',
      summary: 'A war in which the enemy never runs out of soldiers.',
    },
    'era-singularity': {
      title: 'The Age of Singularity',
      period: 'Finale',
      summary: 'Meeting the thing that considered the blood its own all along.',
    },
  },
  loreChapters: {
    'origin-spark': {
      title: 'Chapter I. A Spark in the Capillaries',
      paragraphs: [
        'At first there was neither will nor name — only pressure and rhythm. Blood went round its circle a billion times, and once the circle closed somewhere it should not have.',
        'In a dead-end capillary a clot gathered that did not dissolve. It repeated the shape of its neighbour, then of another, and in that repetition something arose that can be called memory.',
        'The empire was not born in that moment. Something more dangerous was born — the intent to continue.',
      ],
    },
    'origin-hunger': {
      title: 'Chapter II. The First Hunger',
      paragraphs: [
        'Memory demands substance. The clot reached for the nearest current and discovered that plasma yields — you only have to know the rhythm.',
        'So the first action appeared, and the first price. Every seizure answered with a faint disturbance that somewhere far away was logged as a deviation from the norm.',
        'The empire did not yet know the word "threat". But the system had already begun to count.',
      ],
    },
    'origin-shape': {
      title: 'Chapter III. A Shape Out of Crimson Shadow',
      paragraphs: [
        'The first module was a mistake that became a discovery: the clot tried to repeat the structure of the vessel wall — and the structure took.',
        'From that day the citadel stopped being mere density. It became a construction, one with weak points and a way to close them.',
        'Everything the empire builds hereafter will be a variation on that first theft of form.',
      ],
    },
    'forge-paths': {
      title: 'Chapter IV. Three Voices',
      paragraphs: [
        'Three arguments sounded inside the core. The first demanded striking first and counting no losses. The second — growing into the wall so deeply that digging it out would cost more than tolerating it. The third — vanishing from the reports.',
        'The empire could not follow all three: each path rebuilt the core in its own image. Having chosen, it severed two other versions of itself forever.',
        'Historians of the blood will argue whether that was freedom or the first real loss.',
      ],
    },
    'forge-gate': {
      title: 'Chapter V. The Gate',
      paragraphs: [
        'The Venule Gate was guarded by something built for exactly that — not a predator, but a function wearing a predator’s shape.',
        'It closed when closing was called for, and struck when striking was called for. There was no fury in it, and that was precisely what made it terrible.',
        'Behind its back the channel widened. For the first time the empire saw how vast the system truly is.',
      ],
    },
    'forge-cost': {
      title: 'Chapter VI. The Price of Territory',
      paragraphs: [
        'The tenth sector taught what the first nine had not: ownership is not an acquisition but an obligation.',
        'Every channel under control made noise. The more the empire held, the louder it sounded, and the shorter the patrol’s path to its heart became.',
        'That is when the rule appeared that the citadel repeats to this day: take only as much as you can hide.',
      ],
    },
    'pressure-raids': {
      title: 'Chapter VII. Waves',
      paragraphs: [
        'A raid is never announced. It is simply already inside, because somewhere a counter crossed a threshold.',
        'The first wave the empire repelled by accident — it happened to raise its shield. The second, deliberately. By the fifth the citadel understood the essential thing: a raid cannot be prevented, but its hour can be appointed.',
        'So threat turned from a punishment into a resource that could be managed.',
      ],
    },
    'pressure-artery': {
      title: 'Chapter VIII. Under Pressure',
      paragraphs: [
        'In the arteries everything is faster: the income and the dying alike. Patrols here do not scout — they execute.',
        'For the first time the empire met an enemy that did not retreat at half its mass lost. That was not courage but the absence of any mechanism for retreat.',
        'The blood learned to respect what it did not possess: the complete absence of doubt.',
      ],
    },
    'pressure-barrier': {
      title: 'Chapter IX. The Wall That Should Not Have Fallen',
      paragraphs: [
        'The blood–brain barrier is not a fortification but a law. It existed before the empire and was presumed eternal.',
        'The Archon of the Barrier defended not territory but the very idea of separation: blood apart, thought apart. While the wall stood, the system had a meaning.',
        'When it fell, the silence on both sides lasted longer than the battle itself.',
      ],
    },
    'singularity-cortex': {
      title: 'Chapter X. The Light Beyond the Barrier',
      paragraphs: [
        'In the cortex the plasma glowed. Not as a figure of speech — it carried so much signal that the current seemed white-hot.',
        'Here the empire discovered that its own impulses had been echoes of another’s. Everything it took for will had begun, many cycles ago, as reflection.',
        'The question of who is master here stopped being rhetorical.',
      ],
    },
    'singularity-throne': {
      title: 'Chapter XI. The Throne Sinus',
      paragraphs: [
        'Sovereign Immunis did not look like an enemy. It looked like order — the very order that had kept the system alive all this time.',
        'It did not threaten. It explained: an empire is a complication, and complications are resolved. There was no malice in its logic, and nothing to answer it with.',
        'The blood replied with the only argument available to it.',
      ],
    },
    'singularity-after': {
      title: 'Chapter XII. Afterwards',
      paragraphs: [
        'Victory turned out quieter than expected. The system did not collapse — it accepted a new steward and went on working.',
        'The empire got everything it had fought for and discovered it was now obliged to do exactly what the Sovereign had done: maintain equilibrium, resolve complications, count threats.',
        'The blood became the mind that carries it. The circle closed somewhere it should not have — again.',
      ],
    },
  },
}
