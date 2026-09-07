import type { ContentPack } from './types'

/** Английские названия мира: регионы, секторы, типы, враги и намерения. */
export const enWorld: ContentPack = {
  regions: {
    capillary: {
      name: 'The Capillary Field',
      subtitle: 'Region I',
      description:
        'Thin channels at the system’s edge. The immune response rarely looks here — this is where the empire learns to breathe.',
    },
    venous: {
      name: 'The Venous Reaches',
      subtitle: 'Region II',
      description:
        'Slow return currents and the first outposts. Here appears something that knows how to hold a line.',
    },
    arterial: {
      name: 'The Arterial Frontier',
      subtitle: 'Region III',
      description:
        'Pressure, oxygen and patrols that do not retreat. Every seizure here is paid for in integrity.',
    },
    cortex: {
      name: 'The Cortical Core',
      subtitle: 'Region IV',
      description:
        'Beyond the barrier lies the reason for all of it. From here the blood first looks upon the mind that carries it.',
    },
  },

  sectorTypes: {
    harvest: 'Harvest',
    refinery: 'Refinery',
    sanctum: 'Sanctum',
    relay: 'Relay',
    bastion: 'Bastion',
    vault: 'Vault',
    forge: 'Forge',
    nexus: 'Nexus',
  },

  sectors: {
    'cap-core': {
      name: 'The Primary Clot',
      description:
        'The point where blood first gathered itself into a thought. Everything begins here.',
    },
    'cap-drift': {
      name: 'Capillary Strait',
      description: 'A slow current rich in free plasma. The ideal first acquisition.',
    },
    'cap-silt': {
      name: 'Platelet Shoal',
      description: 'Settled plates, ready for refining.',
    },
    'cap-weave': {
      name: 'Fibrin Weave',
      description: 'A natural mesh that turns plasma into dense structure.',
    },
    'cap-watch': {
      name: 'Macrophage Watch',
      description: 'An abandoned observation node. Whoever holds it sees the storm coming.',
    },
    'cap-relay': {
      name: 'Lesser Sinus',
      description: 'A widening where the impulse accelerates and reaches further.',
    },
    'cap-cache': {
      name: 'Plasmocyte Cache',
      description: 'A sealed store. You may take only one thing.',
    },
    'cap-forge': {
      name: 'Erythrocyte Forge',
      description: 'An ancient line, still able to cast combat circuits.',
    },
    'cap-nexus': {
      name: 'The Venule Gate',
      description: 'A sluice beyond which the channel turns wide. It is guarded in earnest.',
    },

    'ven-gate': {
      name: 'Venous Threshold',
      description: 'The first broad vein. The current is more generous here — and more visible.',
    },
    'ven-marsh': {
      name: 'Venous Marsh',
      description: 'Stagnant pockets where plasma has gathered for years.',
    },
    'ven-mill': {
      name: 'Thrombus Mill',
      description: 'A turbulent node that grinds down everything that enters it.',
    },
    'ven-sanctum': {
      name: 'Lymph Sanctum',
      description: 'A quiet backwater off the immune routes. Here the empire is almost inaudible.',
    },
    'ven-hollow': {
      name: 'Splenic Hollow',
      description: 'A store of the confiscated. The system kept this for itself.',
    },
    'ven-guard': {
      name: 'Leukocyte Outpost',
      description: 'A fortified node of immune logistics. An excellent fortress — if taken.',
    },
    'ven-relay': {
      name: 'Valve Node',
      description: 'It governs the direction of flow. Its owner reacts faster.',
    },
    'ven-crypt': {
      name: 'Plasmablast Crypt',
      description: 'A clutch of immature cells. Rich and repulsive.',
    },
    'ven-forge': {
      name: 'Synthesis Chamber',
      description:
        'Here the system assembled its antibodies. Now it will assemble something for you.',
    },
    'ven-nexus': {
      name: 'The Aortic Gate',
      description: 'A high-pressure sluice. Beyond it the real war begins.',
    },

    'art-march': {
      name: 'Arterial March',
      description: 'A swift channel. Plasma arrives in floods here, and patrols in waves.',
    },
    'art-furnace': {
      name: 'Oxygen Furnace',
      description: 'A saturated zone where refining runs three times faster.',
    },
    'art-ridge': {
      name: 'Immune Ridge',
      description: 'A border rampart. To take it is to announce yourself aloud.',
    },
    'art-sanctum': {
      name: 'Ferritin Sanctum',
      description: 'An iron silence. Even immune markers lose themselves here.',
    },
    'art-well': {
      name: 'Oxygen Well',
      description: 'A vertical channel of extraordinary density.',
    },
    'art-bastion': {
      name: 'Endothelial Bastion',
      description: 'A wall of living lining. It absorbs a blow better than any module.',
    },
    'art-relay': {
      name: 'Aortic Relay',
      description: 'A node audible across the whole system. Through it the empire speaks.',
    },
    'art-vault': {
      name: 'Ferritin Vault',
      description: 'The system’s strategic reserve. One choice, one fate.',
    },
    'art-spire': {
      name: 'Interferon Spire',
      description: 'An alarm transmitter. Silenced, it deafens the entire immune network.',
    },
    'art-forge': {
      name: 'Archon Synthesis Dome',
      description: 'The dome where the system designed its finest hunters.',
    },
    'art-nexus': {
      name: 'The Blood–Brain Barrier',
      description: 'The last wall between blood and mind. It was not meant to fall.',
    },

    'ctx-approach': {
      name: 'Approaches to the Cortex',
      description: 'A fine network feeding thought itself. The plasma here almost glows.',
    },
    'ctx-lattice': {
      name: 'Neural Lattice',
      description:
        'A net where signal outruns blood. The empire learns to think faster than itself.',
    },
    'ctx-well': {
      name: 'Synaptic Well',
      description: 'A cascade of discharges that sinters clots into something new.',
    },
    'ctx-sanctum': {
      name: 'Myelin Sanctum',
      description: 'The insulating sheath muffles everything. The best hiding place in the system.',
    },
    'ctx-bastion': {
      name: 'Cortical Bastion',
      description: 'The mind’s last line of defence, now turned outward.',
    },
    'ctx-vault': {
      name: 'The Archon’s Crypt',
      description: 'What the system hid even from itself.',
    },
    'ctx-forge': {
      name: 'The Singularity Forge',
      description: 'The system’s unfinished project. The empire will finish it.',
    },
    'ctx-throne': {
      name: 'The Throne Sinus',
      description:
        'The cavity where all currents converge. Here the blood meets what has been steering it all along.',
    },
  },

  intents: {
    strike: { label: 'Strike', description: 'An ordinary attack. Defence applies in full.' },
    heavy: { label: 'Heavy Blow', description: 'A wide swing. Worth raising the shield.' },
    pierce: { label: 'Pierce', description: 'Ignores most of your defence.' },
    drain: { label: 'Drain', description: 'Weak damage, but it burns the citadel’s energy.' },
    shield: { label: 'Screening', description: 'The enemy does not attack but gains a shield.' },
    regen: { label: 'Recovery', description: 'The enemy heals instead of attacking.' },
    summon: { label: 'Call Reinforcements', description: 'A weak blow, but threat rises sharply.' },
  },

  enemies: {
    'scout-phage': {
      name: 'Scout Phage',
      title: 'Light threat',
      description: 'A lone patroller. Fast, fragile, predictable.',
    },
    'clot-eater': {
      name: 'Clot Eater',
      title: 'Moderate threat',
      description: 'It feeds on what the empire is built from. It burns energy.',
    },
    'gate-warden': {
      name: 'Warden of the Sluice',
      title: 'Region I nexus',
      description:
        'The first enemy that knows how to close. It teaches the key lesson: answer Screening with Rupture.',
    },
    'drift-hunter': {
      name: 'Current Hunter',
      title: 'Moderate threat',
      description: 'Keeps its distance and strikes at gaps in the defence.',
    },
    'splenic-keeper': {
      name: 'Splenic Keeper',
      title: 'Vault guardian',
      description: 'It never strikes first, but heals faster than you break it.',
    },
    'lymph-lancer': {
      name: 'Lymphatic Lancer',
      title: 'Heavy threat',
      description: 'A disciplined fighter with a long swing.',
    },
    'blast-swarm': {
      name: 'Plasmablast Swarm',
      title: 'Heavy threat',
      description: 'Many small targets. It calls reinforcements — do not linger.',
    },
    'aortic-sentinel': {
      name: 'Aortic Sentinel',
      title: 'Region II nexus',
      description: 'Armour, shield and patience. A classic examination of your preparation.',
    },
    'oxy-reaver': {
      name: 'Oxygen Reaver',
      title: 'Heavy threat',
      description: 'Oversaturated with energy, it strikes without pause.',
    },
    'ridge-phalanx': {
      name: 'Ridge Phalanx',
      title: 'Heavy threat',
      description: 'A formation that holds. Nearly invulnerable without rupture.',
    },
    'ferro-ascetic': {
      name: 'Iron Ascetic',
      title: 'Sanctum guardian',
      description: 'It barely attacks, but heals and waits for your energy to run out.',
    },
    'interferon-choir': {
      name: 'Interferon Choir',
      title: 'Spire guardian',
      description: 'Every turn of its raises the alarm across the whole system.',
    },
    'vault-custodian': {
      name: 'Vault Custodian',
      title: 'Vault guardian',
      description: 'Built to guard and nothing else. It does so very well.',
    },
    'archon-prototype': {
      name: 'Archon Prototype',
      title: 'Forge guardian',
      description: 'An unfinished hunter of the highest class. Lethal even so.',
    },
    'barrier-archon': {
      name: 'Archon of the Barrier',
      title: 'Region III nexus',
      description: 'Keeper of the last wall. It uses the system’s entire arsenal.',
    },
    'myelin-stalker': {
      name: 'Myelin Stalker',
      title: 'Lethal threat',
      description: 'It travels the nerves faster than blood can react.',
    },
    'synaptic-echo': {
      name: 'Synaptic Echo',
      title: 'Lethal threat',
      description: 'It repeats your own strikes. It drains and gives no respite.',
    },
    'cortex-praetor': {
      name: 'Cortical Praetor',
      title: 'Lethal threat',
      description: 'Commander of the last line. Armoured like a fortress.',
    },
    'sovereign-immunis': {
      name: 'Sovereign Immunis',
      title: 'Final opponent',
      description:
        'The thing that considered the blood its own all along. It does not defend — it annuls.',
    },
  },
}
