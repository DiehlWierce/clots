import type { ContentPack } from './types'

/** Английские строки достижений, событий и наград хранилищ. */
export const enMisc: ContentPack = {
  achievements: {
    'first-blood': { title: 'First Movement', description: 'Perform any citadel action.' },
    'first-sector': { title: 'First Seizure', description: 'Bring a sector under control.' },
    'first-module': { title: 'Integration', description: 'Install your first module.' },
    'first-tech': {
      title: 'Applied Science',
      description: 'Unlock your first extraction technology.',
    },
    'first-doctrine': {
      title: 'Choice of Path',
      description: 'Adopt a doctrine and set the empire’s course.',
    },
    'first-battle': { title: 'Baptism', description: 'Win your first battle.' },
    'first-raid': { title: 'Repelled', description: 'Survive an immune raid.' },
    'region-venous': { title: 'Beyond the Gate', description: 'Open the Venous Reaches.' },
    'region-arterial': { title: 'Under Pressure', description: 'Open the Arterial Frontier.' },
    'region-cortex': {
      title: 'At the Threshold of Mind',
      description: 'Break the blood–brain barrier.',
    },
    sovereign: { title: 'Sovereign', description: 'Defeat Sovereign Immunis in the Throne Sinus.' },
    'siege-survivor': {
      title: 'The One Who Stood',
      description: 'Survive the siege after deposing the Sovereign.',
    },
    'second-cycle': {
      title: 'Cycle of the Second Order',
      description: 'Begin a new run carrying progress over.',
    },
    'sectors-10': { title: 'Dominion', description: 'Control 10 sectors.' },
    'sectors-20': { title: 'Empire', description: 'Control 20 sectors.' },
    'sectors-all': { title: 'Total Control', description: 'Capture all 38 sectors.' },
    'plasma-1000': { title: 'High Water', description: 'Accumulate 1000 plasma.' },
    'clots-500': { title: 'Density', description: 'Accumulate 500 clots.' },
    'essence-100': { title: 'Concentrate', description: 'Accumulate 100 essence.' },
    'level-5': { title: 'Maturity', description: 'Reach level 5.' },
    'level-10': { title: 'Apogee', description: 'Reach level 10.' },
    'battles-10': { title: 'Veteran', description: 'Win 10 battles.' },
    'battles-25': { title: 'Butcher of Channels', description: 'Win 25 battles.' },
    'streak-5': { title: 'Without a Scratch', description: 'Win 5 battles in a row.' },
    'modules-5': { title: 'Constructor', description: 'Install 5 modules.' },
    'modules-15': { title: 'Architect', description: 'Install 15 modules.' },
    'branch-max': { title: 'To the Limit', description: 'Raise any module to its maximum level.' },
    'doctrine-max': { title: 'Dogma', description: 'Bring a doctrine to its maximum level.' },
    'tech-10': { title: 'Technocrat', description: 'Unlock 10 extraction technologies.' },
    ghost: { title: 'Ghost', description: 'Reach 90 masking while holding 10 or more sectors.' },
    calm: { title: 'Dead Calm', description: 'Bring threat down to zero.' },
    brink: { title: 'On the Brink', description: 'Win a battle with less than 10 integrity.' },
    'pacifist-region': {
      title: 'Quiet Conquest',
      description: 'Take all of Region I without ever retreating.',
    },
    'cycle-50': { title: 'The Long Game', description: 'Survive to cycle 50.' },
  },

  events: {
    'capillary-rupture': {
      title: 'Capillary Rupture',
      text: 'One of the channels gave way under pressure. The current is bleeding into tissue, and losses grow by the moment.',
    },
    'immune-defector': {
      title: 'The Defector',
      text: 'A lone phagocyte has broken from its patrol and offers to serve the empire. It does not explain why.',
    },
    'hormonal-surge': {
      title: 'Hormonal Surge',
      text: 'The system has injected a command the empire does not understand. For a moment the channels are overflowing.',
    },
    'marrow-echo': {
      title: 'Echo of the Marrow',
      text: 'A signal of new cells being born rises from the depths. It can be intercepted — or silenced.',
    },
    'clot-cannibals': {
      title: 'Cannibal Clots',
      text: 'Part of your own mass has slipped control and is devouring neighbouring nodes. The empire has met itself.',
    },
    'lymph-census': {
      title: 'Lymphatic Census',
      text: 'The system is counting cells. The empire could be recorded as normal — if the signature is forged.',
    },
    'oxygen-debt': {
      title: 'Oxygen Debt',
      text: 'The tissues demand more than the system can deliver. The empire can help — or take advantage.',
    },
    'dormant-forge': {
      title: 'The Dormant Forge',
      text: 'A shut-down synthesis node has been found in the vessel wall. It can be restarted, but it is loud.',
    },
    'immune-memory': {
      title: 'Immune Memory',
      text: 'The system has recalled your previous encounters and retuned its patrols to your tactics.',
    },
    'plasma-tide': {
      title: 'Plasma Tide',
      text: 'A rare confluence of currents: for a few moments the channels yield three times the usual.',
    },
    'pressure-spike': {
      title: 'Pressure Spike',
      text: 'The system has raised pressure through the whole channel. Weak walls are cracking, but the current has turned generous.',
    },
    'patrol-rotation': {
      title: 'Patrol Rotation',
      text: 'The immune system is redrawing its routes. For a few cycles the network has blind spots.',
    },
    'starved-node': {
      title: 'Starving Node',
      text: 'One of your captured nodes is getting no supply. It still holds, but not for long.',
    },
    'ferrous-vein': {
      title: 'Ferrous Vein',
      text: 'Scouts found a seam rich in iron. It can be worked, but not for free.',
    },
    'false-signal': {
      title: 'False Signal',
      text: 'A command nobody issued is moving through the network. Or somebody did — just not the system.',
    },
    'quarantine-order': {
      title: 'Quarantine Order',
      text: 'The system has declared a district infected. Imperial holdings fall under the order too.',
    },
    'severed-relay': {
      title: 'Severed Relay',
      text: 'The link between two nodes is cut. Logistics sag until the break is closed.',
    },
    'wandering-clotmass': {
      title: 'Wandering Clotmass',
      text: 'A mass of foreign clots drifts through the channel — neither imperial nor immune. It simply moves.',
    },
    'imperial-census': {
      title: 'Imperial Census',
      text: 'The holdings have grown so far that the empire no longer knows itself. Time to count.',
    },
    'archon-envoy': {
      title: 'Envoy of the Archon',
      text: 'An archon has come to the border without escort. It does not attack — it speaks.',
    },
    'systemic-fever': {
      title: 'Systemic Fever',
      text: 'The network is running hot. Everything accelerates — the empire’s growth, and the attention paid to it.',
    },
    'marrow-tribute': {
      title: 'Tribute of the Marrow',
      text: 'The marrow offers supply in exchange for being left alone. The empire may accept — or simply take.',
    },
    'old-empire': {
      title: 'Traces of an Older Empire',
      text: 'Deep in the channel lie the remains of something that already tried this. And failed.',
    },
    'immune-schism': {
      title: 'Immune Schism',
      text: 'Two branches of the immune system disagree on who counts as the enemy. While they argue, the empire goes untouched.',
    },
    'terminal-pressure': {
      title: 'Terminal Pressure',
      text: 'The system is pressing on everything at once. This is no longer a test — it is an attempt to finish it.',
    },
    'stray-current': {
      title: 'Stray Current',
      text: 'The channel turned the wrong way for a moment. A small thing, but it can be caught.',
    },
    'clogged-channel': {
      title: 'Clogged Channel',
      text: 'One of the channels has stalled. The blockage must be broken through — or gone around.',
    },
    'silent-cycle': {
      title: 'Silent Cycle',
      text: 'Nothing is happening. In a network that never falls quiet, that is strange in itself.',
    },
    'defector-again': {
      title: 'Another Defector',
      text: 'Word of the first one spread. Now they come on their own.',
    },
  },

  eventOptions: {
    seal: { label: 'Seal the rupture with clots', outcome: 'Spend clots but keep the flow.' },
    bleed: {
      label: 'Let it bleed out',
      outcome: 'Save the material at the cost of core integrity.',
    },
    hire: {
      label: 'Hire it for essence',
      outcome: 'Experience and lower threat: it knows the patrol routes.',
    },
    consume: {
      label: 'Consume it',
      outcome: 'Clots and a little experience, but the immune system will notice.',
    },
    ignore: { label: 'Let it go', outcome: 'Nothing happens. It leaves.' },
    ride: {
      label: 'Ride the wave',
      outcome: 'A large one-off haul at the cost of a sharp rise in threat.',
    },
    hide: { label: 'Wait it out in shadow', outcome: 'Take nothing, but masking will grow.' },
    harvest: {
      label: 'Intercept the flow',
      outcome: 'Much plasma, but the signal will spread through the system.',
    },
    silence: { label: 'Silence it', outcome: 'Threat falls, no resources gained.' },
    study: {
      label: 'Study the structure',
      outcome: 'Notable experience: the empire understands the system a little better.',
    },
    purge: { label: 'Purge by force', outcome: 'Immediate battle with the escaped mass.' },
    absorb: {
      label: 'Absorb it back',
      outcome: 'Reclaim the mass at the cost of integrity: it resists.',
    },
    cede: { label: 'Cede them a node', outcome: 'Lose resources but avoid casualties and noise.' },
    forge: {
      label: 'Forge the signature',
      outcome: 'Expensive in essence, but threat drops sharply.',
    },
    'hide-mass': {
      label: 'Hide part of your mass',
      outcome: 'Give up clots to stay out of the report.',
    },
    defy: { label: 'Do not hide', outcome: 'The empire will be recorded as an anomaly.' },
    supply: {
      label: 'Share the flow',
      outcome: 'Give up plasma; in return the system stops hunting for a while.',
    },
    exploit: {
      label: 'Take what is yours',
      outcome: 'Essence and experience while nobody is watching — but they will notice later.',
    },
    ignite: {
      label: 'Ignite it',
      outcome: 'A permanent gain to maximum energy at the cost of noise.',
    },
    strip: {
      label: 'Strip it for material',
      outcome: 'Many clots at once; the node will not serve again.',
    },
    rebuild: { label: 'Rebuild the circuit', outcome: 'Shed accumulated threat at a steep price.' },
    endure: { label: 'Take the fight', outcome: 'An immediate clash with a prepared hunter.' },
    collect: {
      label: 'Collect everything',
      outcome: 'A large plasma haul with no consequences. It happens.',
    },
    channel: {
      label: 'Let it through you',
      outcome: 'A large plasma haul at the cost of integrity.',
    },
    brace: { label: 'Shut down', outcome: 'Ride out the surge. Nothing gained, nothing lost.' },
    slip: {
      label: 'Slip past unseen',
      outcome: 'A marked drop in threat: the empire is lost from view for a while.',
    },
    ambush: {
      label: 'Strike where the routes meet',
      outcome: 'Experience and clots, but the immune system will remember it.',
    },
    feed: {
      label: 'Feed it from reserves',
      outcome: 'Plasma is spent, the node survives and yields experience.',
    },
    abandon: {
      label: 'Abandon it',
      outcome:
        'The node falls quiet. The immune system is pleased: threat drops, the core loses integrity.',
    },
    mine: { label: 'Work the seam', outcome: 'Plenty of clots for the energy of a cycle.' },
    'refine-on-site': {
      label: 'Refine it on site',
      outcome: 'Fewer clots, but essence as well.',
    },
    trace: {
      label: 'Trace the source',
      outcome: 'Experience and lower threat: the empire understands the network a little better.',
    },
    amplify: {
      label: 'Amplify and rebroadcast',
      outcome: 'The immune system chases ghosts. Masking rises, plasma is spent.',
    },
    comply: {
      label: 'Lie low',
      outcome: 'A cycle is lost, but the empire is struck from the target list.',
    },
    'ignore-order': {
      label: 'Carry on as if nothing happened',
      outcome: 'Income kept, and the immune system’s attention with it.',
    },
    reroute: {
      label: 'Lay a bypass',
      outcome: 'Clots go into a new branch, the nodes are linked again.',
    },
    wait: {
      label: 'Wait for it to knit',
      outcome: 'The break closes on its own, but the empire loses income.',
    },
    engulf: { label: 'Engulf it', outcome: 'A large haul of clots and experience.' },
    divert: {
      label: 'Steer it into a patrol',
      outcome: 'The mass slams into an immune patrol. Threat drops, nothing is gained.',
    },
    count: {
      label: 'Count everything',
      outcome: 'A cycle goes to the ledger, but the surplus found is large.',
    },
    estimate: { label: 'Settle for an estimate', outcome: 'Quick and rough: a modest gain.' },
    listen: {
      label: 'Hear it out',
      outcome: 'Knowledge is expensive: much experience and lower threat.',
    },
    strike: { label: 'Strike first', outcome: 'Immediate battle with the barrier archon.' },
    burn: {
      label: 'Run hot',
      outcome: 'A big haul and experience, but threat will jump.',
    },
    cool: { label: 'Ease off', outcome: 'Some integrity restored, threat falls.' },
    accept: { label: 'Accept the tribute', outcome: 'Steady essence with no consequences.' },
    seize: {
      label: 'Take it all',
      outcome: 'Far more essence, but the marrow will raise the alarm.',
    },
    'study-ruins': {
      label: 'Study the remains',
      outcome: 'A great deal of experience: another’s mistakes come cheaper than your own.',
    },
    salvage: {
      label: 'Break it down for material',
      outcome: 'Large stocks of all three resources.',
    },
    fuel: {
      label: 'Add fuel',
      outcome: 'The schism deepens: threat falls sharply, essence is spent.',
    },
    'use-pause': {
      label: 'Use the lull',
      outcome: 'While they are busy with each other, the empire gathers double.',
    },
    hold: {
      label: 'Hold every node',
      outcome: 'A vast expense, but the empire stands without losses.',
    },
    give: {
      label: 'Give up the periphery',
      outcome: 'Integrity sags, but the pressure lifts on its own.',
    },
    catch: { label: 'Catch it', outcome: 'A little plasma and experience.' },
    clear: { label: 'Break through', outcome: 'Energy is spent, the channel works again.' },
    bypass: {
      label: 'Go around',
      outcome: 'Clots for a new detour, but no turn is lost.',
    },
    rest: { label: 'Use the quiet', outcome: 'Some integrity restored.' },
    attune: {
      label: 'Listen closely',
      outcome: 'Masking rises: the empire learns to fall silent with the network.',
    },
    recruit: { label: 'Take it in', outcome: 'Experience and lower threat for essence.' },
    devour: { label: 'Devour it', outcome: 'Clots instead of an ally.' },
  },

  vaultOptions: {
    'cap-cache-plasma': {
      label: 'Breach the plasma reservoir',
      description: 'An immediate influx of raw material for your first constructions.',
    },
    'cap-cache-clots': {
      label: 'Take the pressed clots',
      description: 'Ready material for modules and combat surges.',
    },
    'cap-cache-essence': {
      label: 'Extract a drop of essence',
      description: 'A rare concentrate that opens the way to doctrines.',
    },
    'ven-hollow-mass': {
      label: 'Loot the stores',
      description: 'A large one-off haul of all three raw materials.',
    },
    'ven-hollow-core': {
      label: 'Absorb the store’s core',
      description: 'Irreversibly strengthens the citadel.',
    },
    'ven-hollow-conduit': {
      label: 'Rewire the trunk line',
      description: 'Permanently expands the citadel’s energy reserve.',
    },
    'art-vault-hoard': {
      label: 'Carry off the entire reserve',
      description: 'A colossal one-off haul.',
    },
    'art-vault-plate': {
      label: 'Fuse the iron into the core',
      description: 'A powerful irreversible boost to integrity.',
    },
    'art-vault-engine': {
      label: 'Start the reserve engine',
      description: 'Permanently expands energy and grants essence.',
    },
    'ctx-vault-hoard': {
      label: 'Empty the crypt',
      description: 'Resources for the whole remaining campaign.',
    },
    'ctx-vault-heart': {
      label: 'Absorb the archon’s heart',
      description: 'The ultimate reinforcement of the core.',
    },
    'ctx-vault-mind': {
      label: 'Appropriate another’s mind',
      description: 'Energy and essence beyond all norms.',
    },
  },
}
