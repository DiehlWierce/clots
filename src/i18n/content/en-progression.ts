import type { ContentPack } from './types'

/** Английские строки развития: модули, доктрины, технологии, мутации, награды. */
export const enProgression: ContentPack = {
  modules: {
    'pulse-harvester': {
      name: 'Pulse Harvester',
      branch: 'Plasma Flow',
      description: 'Rhythmic contractions squeeze more plasma out of the channel.',
    },
    'osmotic-web': {
      name: 'Osmotic Web',
      branch: 'Plasma Flow',
      description: 'Draws plasma even from neighbouring channels you have not taken.',
    },
    'blood-matrix': {
      name: 'Blood Matrix',
      branch: 'Plasma Flow',
      description: 'Rebuilds refining: every clot comes out denser.',
    },
    'sanguine-pylon': {
      name: 'Sanguine Pylon',
      branch: 'Plasma Flow',
      description: 'Stabilises flow across the network, speeding everything at once.',
    },
    'crimson-forge': {
      name: 'Crimson Forge',
      branch: 'Plasma Flow',
      description: 'A unique module from the Archon Dome. It reforges anything.',
    },
    'singularity-heart': {
      name: 'Heart of Singularity',
      branch: 'Plasma Flow',
      description: 'A unique module from the Singularity Forge. The system’s finished project.',
    },

    'hem-arsenal': {
      name: 'Hemo Arsenal',
      branch: 'Assault Circuit',
      description: 'The citadel’s first real weapon circuit.',
    },
    'forge-core': {
      name: 'Forge Core',
      branch: 'Assault Circuit',
      description:
        'A unique module from the Erythrocyte Forge. It casts combat circuits on the move.',
    },
    'lance-array': {
      name: 'Lance Array',
      branch: 'Assault Circuit',
      description: 'Focuses the blow to a single point, passing through armour.',
    },
    'rally-node': {
      name: 'Rally Node',
      branch: 'Assault Circuit',
      description: 'A unique module from the Synthesis Chamber. It sustains an advance.',
    },
    'scarlet-arsenal': {
      name: 'Scarlet Arsenal',
      branch: 'Assault Circuit',
      description: 'The full combat suite of an imperial citadel.',
    },
    'apex-lance': {
      name: 'Apex Lance',
      branch: 'Assault Circuit',
      description: 'A weapon designed against archons.',
    },

    'clot-plating': {
      name: 'Clot Plating',
      branch: 'Citadel',
      description: 'Simple, dependable, a lifesaver in the early cycles.',
    },
    'fibrin-lattice': {
      name: 'Fibrin Lattice',
      branch: 'Citadel',
      description: 'Distributes damage across the whole structure of the core.',
    },
    'marrow-anchor': {
      name: 'Marrow Anchor',
      branch: 'Citadel',
      description: 'A link to the source of renewal: the core repairs itself.',
    },
    'endothelial-wall': {
      name: 'Endothelial Wall',
      branch: 'Citadel',
      description: 'Living armour copied from the arterial bastion.',
    },
    'aegis-core': {
      name: 'Aegis of the Core',
      branch: 'Citadel',
      description: 'Absolute priority of survival over everything else.',
    },

    'veil-shroud': {
      name: 'Veil Shroud',
      branch: 'Shadows',
      description: 'Dampens the empire’s biomarkers, slowing threat growth.',
    },
    'silent-veil': {
      name: 'Silent Veil',
      branch: 'Shadows',
      description: 'The empire stops looking like an anomaly.',
    },
    'phase-screen': {
      name: 'Phase Screen',
      branch: 'Shadows',
      description: 'Shifts the flow signature — patrols pass by.',
    },
    'null-signature': {
      name: 'Null Signature',
      branch: 'Shadows',
      description: 'To the immune system the empire no longer exists. Almost.',
    },

    'flow-relay': {
      name: 'Flow Relay',
      branch: 'Logistics',
      description: 'Widens the zone of full delivery around every network hub.',
    },
    'pressure-column': {
      name: 'Pressure Column',
      branch: 'Logistics',
      description: 'Holds pressure on distant routes: delivery losses fall.',
    },
    'vascular-grid': {
      name: 'Vascular Grid',
      branch: 'Logistics',
      description: 'The network becomes almost independent of distance.',
    },
    'omni-conduit': {
      name: 'Omni Conduit',
      branch: 'Logistics',
      description: 'The empire delivers everything from everywhere, as if distance were gone.',
    },

    'energy-loop': {
      name: 'Energy Loop',
      branch: 'Energy Dome',
      description: 'A closed loop granting the citadel one extra action per cycle.',
    },
    'nerve-lattice': {
      name: 'Nerve Lattice',
      branch: 'Energy Dome',
      description: 'Speeds reaction and adds experience to every action.',
    },
    'surge-capacitor': {
      name: 'Surge Capacitor',
      branch: 'Energy Dome',
      description: 'Stores impulse between cycles.',
    },
    'aurora-dome': {
      name: 'Aurora Dome',
      branch: 'Energy Dome',
      description: 'The crown of the energy branch: the citadel barely tires.',
    },
  },

  doctrinePaths: {
    reaver: {
      name: 'Path of the Reaver',
      motto: 'Faster than the system can answer',
      description:
        'A bet on damage and speed of conquest. The empire takes everything at once and does not look back at threat.',
    },
    warden: {
      name: 'Path of the Warden',
      motto: 'Let them come. The wall will not move',
      description:
        'A bet on integrity, defence and outlasting raids. Slow, but nearly invulnerable.',
    },
    weaver: {
      name: 'Path of the Weaver',
      motto: 'An empire nobody ever saw',
      description:
        'A bet on masking, economy and suppression. The one who was never sought is the one who wins.',
    },
  },

  doctrines: {
    'reaver-1': { name: 'Thirst', description: 'Every blow of the citadel lands heavier.' },
    'reaver-2': {
      name: 'Blood Harvest',
      description: 'Conquests yield more clots and experience.',
    },
    'reaver-3a': {
      name: 'Slaughter',
      description: 'Everything into one blow: pierce and damage against single targets.',
    },
    'reaver-3b': {
      name: 'The Wave',
      description: 'Every victory dampens the system’s attention and feeds the citadel.',
    },
    'reaver-4': {
      name: 'Crimson Apotheosis',
      description: 'The limit of aggression: the citadel hits harder than it should be able to.',
    },

    'warden-1': {
      name: 'Unshakeable',
      description: 'The core withstands what used to punch straight through.',
    },
    'warden-2': { name: 'Circulation', description: 'The citadel recovers every cycle.' },
    'warden-3a': {
      name: 'Wall in the Name of Blood',
      description: 'Raids break against the defence without reaching the core.',
    },
    'warden-3b': {
      name: 'Living Tissue',
      description: 'The core does not so much absorb a blow as close over it.',
    },
    'warden-4': {
      name: 'Eternal Citadel',
      description: 'The limit of defence: it is easier to ignore the empire than to break it.',
    },

    'weaver-1': { name: 'Silence', description: 'Threat grows noticeably slower.' },
    'weaver-2': { name: 'Abundance', description: 'Every sector gives more than it should.' },
    'weaver-3a': {
      name: 'Unthinkable Web',
      description: 'As if the empire did not exist: the system searches in the wrong place.',
    },
    'weaver-3b': {
      name: 'Living Artery',
      description: 'Distance almost ceases to exist for the empire.',
    },
    'weaver-4': {
      name: 'The Nameless Empire',
      description: 'The limit of stealth: the system hunts an enemy that is not there.',
    },
  },

  techs: {
    'flux-cores': {
      name: 'Flux Cores',
      branch: 'Plasma',
      description: 'Basic acceleration of plasma extraction.',
    },
    'plasma-lattice': {
      name: 'Plasma Lattice',
      branch: 'Plasma',
      description: 'Stabilises flow and raises yield.',
    },
    'hyper-osmosis': {
      name: 'Hyper-Osmosis',
      branch: 'Plasma',
      description: 'Squeezes plasma from everything the network can reach.',
    },
    'tidal-conduits': {
      name: 'Tidal Conduits',
      branch: 'Plasma',
      description: 'Pumps surplus plasma to where it is needed.',
    },
    'crimson-tide': {
      name: 'Crimson Tide',
      branch: 'Plasma',
      description: 'The ultimate technology of the plasma branch.',
    },

    granulation: {
      name: 'Granulation',
      branch: 'Clots',
      description: 'Refining loses less material.',
    },
    'clot-cascade': {
      name: 'Clotting Cascade',
      branch: 'Clots',
      description: 'A chain reaction of thickening across the network.',
    },
    'harmonic-forge': {
      name: 'Harmonic Forge',
      branch: 'Clots',
      description: 'Clots come out tougher and fit for battle.',
    },
    'iron-weave': {
      name: 'Iron Weave',
      branch: 'Clots',
      description: 'A technology stripped from the ferritin vaults.',
    },
    'obsidian-clot': {
      name: 'Obsidian Clot',
      branch: 'Clots',
      description: 'The ultimate technology of the clot branch.',
    },

    'essence-distill': {
      name: 'Essence Distillation',
      branch: 'Essence',
      description: 'The first reliable way to obtain essence.',
    },
    'ether-siphon': {
      name: 'Ether Siphon',
      branch: 'Essence',
      description: 'Draws essence out of the system’s background noise.',
    },
    'null-resonance': {
      name: 'Null Resonance',
      branch: 'Essence',
      description: 'Dampens the immune network’s response to the empire’s actions.',
    },
    quintessence: {
      name: 'Quintessence',
      branch: 'Essence',
      description: 'Essence begins to reproduce itself.',
    },
    'aether-crown': {
      name: 'Aether Crown',
      branch: 'Essence',
      description: 'The ultimate technology of the essence branch.',
    },
  },

  mutations: {
    'thick-blood': {
      name: 'Thick Blood',
      tagline: 'Tougher, but slower',
      description: 'The core takes a blow far better, but you get fewer actions per cycle.',
    },
    'thin-walls': {
      name: 'Thin Walls',
      tagline: 'Rich and loud',
      description: 'The channels give much more, but the empire is heard twice as far.',
    },
    'mute-signature': {
      name: 'Mute Signature',
      tagline: 'Unseen and poor',
      description: 'The immune system barely reacts, but essence comes twice as hard.',
    },
    hypercoagulation: {
      name: 'Hypercoagulation',
      tagline: 'Clots instead of flow',
      description: 'Refining runs three times livelier, but less plasma arrives.',
    },
    'predatory-pulse': {
      name: 'Predatory Pulse',
      tagline: 'Strikes first and hard',
      description: 'The citadel wins its very first fight — if it survives.',
    },
    'branched-network': {
      name: 'Branched Network',
      tagline: 'Many actions, little yield',
      description: 'More energy per cycle at the cost of overall productivity.',
    },
    'immune-blindness': {
      name: 'Immune Blindness',
      tagline: 'Rare, but terrible',
      description: 'Threat grows twice as slowly, but the raid that comes is far stronger.',
    },
    'crisis-start': {
      name: 'Crisis Start',
      tagline: 'Everything at once, danger at once',
      description: 'A rich opening, but the immune system is already looking your way.',
    },
  },

  epochs: {
    fever: {
      name: 'Fever',
      description:
        'The temperature spiked: all combat damage rose by a quarter — yours and theirs.',
    },
    'tissue-regeneration': {
      name: 'Tissue Regeneration',
      description: 'The system patches its own faster: enemies recover twice as actively.',
    },
    thrombosis: {
      name: 'Thrombosis',
      description:
        'The current thickens: income falls by a third, but threat grows twice as slowly.',
    },
    inflammation: {
      name: 'Inflammation',
      description:
        'The system is alarmed: threat grows half again as fast, but extraction is richer.',
    },
    sclerosis: {
      name: 'Vascular Sclerosis',
      description: 'Channels narrow: the network loses radius, but the walls hold better.',
    },
    'adrenal-storm': {
      name: 'Adrenal Storm',
      description:
        'Everything accelerates: more energy per cycle, but the immune system does not sleep either.',
    },
    anemia: {
      name: 'Anaemia',
      description: 'Oxygen is short for everyone: the citadel hits weaker, but is noticed less.',
    },
    'marrow-bloom': {
      name: 'Marrow Bloom',
      description: 'The source runs at its limit: markedly more plasma and experience.',
    },
  },

  epochNames: {
    '0': 'The Age of Origin',
    '1': 'The Age of Tempering',
    '2': 'The Age of Pressure',
    '3': 'The Age of Rupture',
    '4': 'The Age of Singularity',
  },
}
