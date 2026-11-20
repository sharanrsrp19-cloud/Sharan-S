import { BiomeId, EnemySpawn, LevelDef, Platform, PropDef, WaveDef } from './types';

export const WORLD_WIDTH = 1280;
export const WORLD_HEIGHT = 720;

export const CAMPAIGN_LEVELS: LevelDef[] = [
  {
    id: 1,
    name: 'Sunlit Meadow',
    subtitle: 'Calm breezes & target practice',
    biome: 'meadow',
    windBase: 0,
    windGust: 0,
    playerSpawn: { x: 175, y: 540 },
    platforms: [
      { id: 'p_left', x: 60, y: 540, w: 250, h: 190, material: 'grass' },
      { id: 'p_mid', x: 520, y: 590, w: 220, h: 140, material: 'grass' },
      { id: 'p_right', x: 890, y: 500, w: 300, h: 230, material: 'grass' },
    ],
    props: [
      { id: 'crate_1', kind: 'crate', x: 870, y: 454, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'meadow',
        roundLabel: 'Dusk Meadow',
        windBase: 0,
        windGust: 0,
        enemies: [{ archetype: 'scout', x: 1055, y: 500, platformId: 'p_right' }],
      },
      {
        roundBiome: 'canyon',
        roundLabel: 'Sunset Gusts',
        windBase: -22,
        windGust: 12,
        enemies: [
          { archetype: 'scout', x: 640, y: 590, platformId: 'p_mid' },
          { archetype: 'scout', x: 1085, y: 500, platformId: 'p_right' },
        ],
      },
    ],
    startingAmmo: { triple: 2, fire: 1 },
  },
  {
    id: 2,
    name: 'Timber Watchtower',
    subtitle: 'Multi-tier fort & supply crates',
    biome: 'canyon',
    windBase: 20,
    windGust: 12,
    playerSpawn: { x: 155, y: 560 },
    platforms: [
      { id: 'p_left', x: 50, y: 560, w: 230, h: 170, material: 'grass' },
      { id: 'p_tower_low', x: 760, y: 540, w: 240, h: 190, material: 'wood' },
      { id: 'p_tower_high', x: 960, y: 390, w: 230, h: 26, material: 'wood' },
      { id: 'p_base_r', x: 1000, y: 580, w: 220, h: 150, material: 'grass' },
    ],
    props: [
      { id: 'sup_1', kind: 'supply_crate', x: 775, y: 494, w: 46, h: 46 },
      { id: 'crate_2', kind: 'crate', x: 968, y: 344, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'canyon',
        roundLabel: 'Redrock Outpost',
        windBase: 20,
        windGust: 12,
        enemies: [
          { archetype: 'scout', x: 880, y: 540, platformId: 'p_tower_low' },
          { archetype: 'sniper', x: 1095, y: 390, platformId: 'p_tower_high' },
        ],
      },
      {
        roundBiome: 'fortress',
        roundLabel: 'Rainy Siege',
        windBase: -32,
        windGust: 16,
        enemies: [
          { archetype: 'scout', x: 850, y: 540, platformId: 'p_tower_low' },
          { archetype: 'sniper', x: 1110, y: 390, platformId: 'p_tower_high' },
          { archetype: 'scout', x: 1120, y: 580, platformId: 'p_base_r' },
        ],
      },
    ],
    startingAmmo: { triple: 3, fire: 1 },
  },
  {
    id: 3,
    name: 'Breezy Canyon',
    subtitle: 'Strong crosswinds & cliff snipers',
    biome: 'fortress',
    windBase: -70,
    windGust: 30,
    playerSpawn: { x: 165, y: 470 },
    platforms: [
      { id: 'p_left', x: 55, y: 470, w: 220, h: 260, material: 'stone' },
      { id: 'p_pillar', x: 560, y: 330, w: 110, h: 24, material: 'stone', ricochet: true },
      { id: 'p_mid', x: 690, y: 540, w: 210, h: 190, material: 'stone' },
      { id: 'p_spire', x: 1010, y: 370, w: 200, h: 360, material: 'stone' },
    ],
    props: [
      { id: 'bar_1', kind: 'barrel', x: 710, y: 492, w: 40, h: 48 },
      { id: 'sup_2', kind: 'supply_crate', x: 592, y: 284, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'fortress',
        roundLabel: 'Drizzle Cliffs',
        windBase: -65,
        windGust: 28,
        enemies: [
          { archetype: 'scout', x: 815, y: 540, platformId: 'p_mid' },
          { archetype: 'sniper', x: 1110, y: 370, platformId: 'p_spire' },
        ],
      },
      {
        roundBiome: 'storm',
        roundLabel: 'Thunder Crosswind',
        windBase: 85,
        windGust: 38,
        enemies: [
          { archetype: 'sniper', x: 1090, y: 370, platformId: 'p_spire' },
          { archetype: 'sniper', x: 830, y: 540, platformId: 'p_mid' },
          { archetype: 'scout', x: 615, y: 330, platformId: 'p_pillar' },
        ],
      },
    ],
    startingAmmo: { triple: 3, fire: 2 },
  },
  {
    id: 4,
    name: 'Powder Depot',
    subtitle: 'Chain-reaction explosive barrels',
    biome: 'canyon',
    windBase: 45,
    windGust: 20,
    playerSpawn: { x: 160, y: 540 },
    platforms: [
      { id: 'p_left', x: 45, y: 540, w: 230, h: 190, material: 'wood' },
      { id: 'p_deck_1', x: 650, y: 560, w: 270, h: 170, material: 'wood' },
      { id: 'p_deck_2', x: 930, y: 440, w: 280, h: 290, material: 'wood' },
      { id: 'p_roof', x: 730, y: 370, w: 150, h: 22, material: 'wood' },
    ],
    props: [
      { id: 'bar_a', kind: 'barrel', x: 685, y: 512, w: 40, h: 48 },
      { id: 'bar_b', kind: 'barrel', x: 785, y: 322, w: 40, h: 48 },
      { id: 'bar_c', kind: 'barrel', x: 965, y: 392, w: 40, h: 48 },
      { id: 'crate_d', kind: 'supply_crate', x: 840, y: 514, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'canyon',
        roundLabel: 'Dry Powder',
        windBase: 45,
        windGust: 20,
        enemies: [
          { archetype: 'scout', x: 775, y: 560, platformId: 'p_deck_1' },
          { archetype: 'bombardier', x: 1070, y: 440, platformId: 'p_deck_2' },
        ],
      },
      {
        roundBiome: 'swamp',
        roundLabel: 'Firefly Marsh',
        windBase: -35,
        windGust: 24,
        enemies: [
          { archetype: 'bombardier', x: 760, y: 560, platformId: 'p_deck_1' },
          { archetype: 'sniper', x: 805, y: 370, platformId: 'p_roof' },
          { archetype: 'scout', x: 1115, y: 440, platformId: 'p_deck_2' },
        ],
      },
      {
        roundBiome: 'citadel',
        roundLabel: 'Ember Dusk',
        windBase: 65,
        windGust: 28,
        enemies: [
          { archetype: 'bombardier', x: 1070, y: 440, platformId: 'p_deck_2' },
          { archetype: 'shield', x: 760, y: 560, platformId: 'p_deck_1' },
          { archetype: 'sniper', x: 805, y: 370, platformId: 'p_roof' },
        ],
      },
    ],
    startingAmmo: { triple: 3, fire: 3 },
  },
  {
    id: 5,
    name: 'Iron Bastion',
    subtitle: 'Shielded knights & stone ricochets',
    biome: 'fortress',
    windBase: -30,
    windGust: 18,
    playerSpawn: { x: 165, y: 520 },
    platforms: [
      { id: 'p_left', x: 50, y: 520, w: 230, h: 210, material: 'stone' },
      { id: 'p_ceil', x: 680, y: 155, w: 360, h: 28, material: 'iron', ricochet: true },
      { id: 'p_mid', x: 620, y: 540, w: 250, h: 190, material: 'stone' },
      { id: 'p_right', x: 930, y: 460, w: 290, h: 270, material: 'stone' },
    ],
    props: [
      { id: 'bar_f1', kind: 'barrel', x: 1155, y: 412, w: 40, h: 48 },
      { id: 'sup_f1', kind: 'supply_crate', x: 825, y: 494, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'fortress',
        roundLabel: 'Iron Gate',
        windBase: -30,
        windGust: 18,
        enemies: [
          { archetype: 'shield', x: 735, y: 540, platformId: 'p_mid' },
          { archetype: 'sniper', x: 1080, y: 460, platformId: 'p_right' },
        ],
      },
      {
        roundBiome: 'glacier',
        roundLabel: 'Frost Squall',
        windBase: 55,
        windGust: 25,
        enemies: [
          { archetype: 'shield', x: 720, y: 540, platformId: 'p_mid' },
          { archetype: 'shield', x: 1020, y: 460, platformId: 'p_right' },
          { archetype: 'bombardier', x: 1130, y: 460, platformId: 'p_right' },
        ],
      },
      {
        roundBiome: 'storm',
        roundLabel: 'Lightning Wall',
        windBase: -80,
        windGust: 34,
        enemies: [
          { archetype: 'shield', x: 735, y: 540, platformId: 'p_mid' },
          { archetype: 'sniper', x: 1040, y: 460, platformId: 'p_right' },
          { archetype: 'bombardier', x: 1145, y: 460, platformId: 'p_right' },
        ],
      },
    ],
    startingAmmo: { triple: 3, fire: 3 },
  },
  {
    id: 6,
    name: 'Pendulum Cavern',
    subtitle: 'Sever the chains & dodge the steel',
    biome: 'cavern',
    windBase: 0,
    windGust: 0,
    playerSpawn: { x: 155, y: 540 },
    platforms: [
      { id: 'p_left', x: 45, y: 540, w: 220, h: 190, material: 'stone' },
      { id: 'p_mid', x: 520, y: 575, w: 240, h: 155, material: 'stone' },
      { id: 'p_right', x: 900, y: 470, w: 310, h: 260, material: 'stone' },
      { id: 'p_arch', x: 460, y: 120, w: 460, h: 26, material: 'iron', ricochet: true },
    ],
    props: [
      {
        id: 'pend_1',
        kind: 'pendulum',
        x: 640,
        y: 146,
        w: 44,
        h: 44,
        ropeLength: 270,
        swingAngle: 0.62,
        swingSpeed: 2.1,
        phase: 0,
      },
      { id: 'bar_c1', kind: 'barrel', x: 935, y: 422, w: 40, h: 48 },
      { id: 'sup_c1', kind: 'supply_crate', x: 540, y: 529, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'cavern',
        roundLabel: 'Crystal Vault',
        windBase: 0,
        windGust: 0,
        enemies: [
          { archetype: 'shield', x: 645, y: 575, platformId: 'p_mid' },
          { archetype: 'sniper', x: 1090, y: 470, platformId: 'p_right' },
        ],
      },
      {
        roundBiome: 'swamp',
        roundLabel: 'Glowing Grotto',
        windBase: 28,
        windGust: 18,
        enemies: [
          { archetype: 'bombardier', x: 645, y: 575, platformId: 'p_mid' },
          { archetype: 'shield', x: 1005, y: 470, platformId: 'p_right' },
          { archetype: 'sniper', x: 1135, y: 470, platformId: 'p_right' },
        ],
      },
      {
        roundBiome: 'citadel',
        roundLabel: 'Molten Depths',
        windBase: -45,
        windGust: 22,
        enemies: [
          { archetype: 'shield', x: 645, y: 575, platformId: 'p_mid' },
          { archetype: 'bombardier', x: 1020, y: 470, platformId: 'p_right' },
          { archetype: 'sniper', x: 1140, y: 470, platformId: 'p_right' },
        ],
      },
    ],
    startingAmmo: { triple: 4, fire: 2 },
  },
  {
    id: 7,
    name: 'Twin Spires Storm',
    subtitle: 'Moving lifts & gale-force gusts',
    biome: 'storm',
    windBase: 85,
    windGust: 55,
    playerSpawn: { x: 155, y: 450 },
    platforms: [
      { id: 'p_left', x: 45, y: 450, w: 220, h: 280, material: 'stone' },
      {
        id: 'p_lift',
        x: 610,
        y: 440,
        baseX: 610,
        baseY: 440,
        w: 175,
        h: 24,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 105,
        moveSpeed: 1.5,
        movePhase: 0,
      },
      { id: 'p_right_low', x: 920, y: 560, w: 290, h: 170, material: 'stone' },
      { id: 'p_right_high', x: 960, y: 330, w: 240, h: 26, material: 'wood' },
    ],
    props: [
      { id: 'bar_ts1', kind: 'barrel', x: 970, y: 282, w: 40, h: 48 },
      { id: 'sup_ts1', kind: 'supply_crate', x: 940, y: 514, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'storm',
        roundLabel: 'Gale Spires',
        windBase: 85,
        windGust: 50,
        enemies: [
          { archetype: 'scout', x: 695, y: 440, platformId: 'p_lift' },
          { archetype: 'bombardier', x: 1080, y: 560, platformId: 'p_right_low' },
          { archetype: 'sniper', x: 1110, y: 330, platformId: 'p_right_high' },
        ],
      },
      {
        roundBiome: 'glacier',
        roundLabel: 'Blizzard Lift',
        windBase: -95,
        windGust: 45,
        enemies: [
          { archetype: 'shield', x: 695, y: 440, platformId: 'p_lift' },
          { archetype: 'sniper', x: 1120, y: 330, platformId: 'p_right_high' },
          { archetype: 'bombardier', x: 1090, y: 560, platformId: 'p_right_low' },
        ],
      },
      {
        roundBiome: 'meadow',
        roundLabel: 'Twilight Clearing',
        windBase: 60,
        windGust: 35,
        enemies: [
          { archetype: 'bombardier', x: 695, y: 440, platformId: 'p_lift' },
          { archetype: 'shield', x: 1030, y: 560, platformId: 'p_right_low' },
          { archetype: 'sniper', x: 1110, y: 330, platformId: 'p_right_high' },
          { archetype: 'scout', x: 1150, y: 560, platformId: 'p_right_low' },
        ],
      },
    ],
    startingAmmo: { triple: 4, fire: 3 },
  },
  {
    id: 8,
    name: 'Crimson Citadel',
    subtitle: 'Defeat the Armored Warlord',
    biome: 'citadel',
    windBase: -45,
    windGust: 30,
    playerSpawn: { x: 155, y: 530 },
    platforms: [
      { id: 'p_left', x: 45, y: 530, w: 225, h: 200, material: 'stone' },
      {
        id: 'p_mid_lift',
        x: 565,
        y: 380,
        baseX: 565,
        baseY: 380,
        w: 155,
        h: 22,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 80,
        moveSpeed: 1.35,
        movePhase: 1.2,
      },
      { id: 'p_citadel', x: 840, y: 480, w: 375, h: 250, material: 'stone' },
      { id: 'p_balcony', x: 960, y: 310, w: 230, h: 24, material: 'iron', ricochet: true },
    ],
    props: [
      { id: 'bar_boss_1', kind: 'barrel', x: 865, y: 432, w: 40, h: 48 },
      { id: 'sup_boss_1', kind: 'supply_crate', x: 615, y: 334, w: 46, h: 46, platformId: 'p_mid_lift' },
    ],
    waves: [
      {
        roundBiome: 'citadel',
        roundLabel: 'Outer Keep',
        windBase: -45,
        windGust: 30,
        enemies: [
          { archetype: 'shield', x: 930, y: 480, platformId: 'p_citadel' },
          { archetype: 'sniper', x: 1090, y: 310, platformId: 'p_balcony' },
        ],
      },
      {
        roundBiome: 'fortress',
        roundLabel: 'Rain of Steel',
        windBase: 65,
        windGust: 32,
        enemies: [
          { archetype: 'shield', x: 640, y: 380, platformId: 'p_mid_lift' },
          { archetype: 'bombardier', x: 990, y: 480, platformId: 'p_citadel' },
          { archetype: 'sniper', x: 1110, y: 310, platformId: 'p_balcony' },
        ],
      },
      {
        roundBiome: 'citadel',
        roundLabel: 'Warlord Throne',
        windBase: -75,
        windGust: 35,
        enemies: [
          { archetype: 'boss', x: 1065, y: 480, platformId: 'p_citadel' },
          { archetype: 'bombardier', x: 1085, y: 310, platformId: 'p_balcony' },
        ],
      },
    ],
    startingAmmo: { triple: 4, fire: 3 },
  },
  {
    id: 9,
    name: 'Frostpeak Ridge',
    subtitle: 'Aurora blizzards & elevated snipers',
    biome: 'glacier',
    windBase: -90,
    windGust: 45,
    playerSpawn: { x: 155, y: 500 },
    platforms: [
      { id: 'p_left', x: 45, y: 500, w: 220, h: 230, material: 'stone' },
      {
        id: 'p_glacier_lift',
        x: 525,
        y: 430,
        baseX: 525,
        baseY: 430,
        w: 170,
        h: 24,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 95,
        moveSpeed: 1.75,
        movePhase: 0.4,
      },
      { id: 'p_ice_mid', x: 770, y: 555, w: 200, h: 175, material: 'stone' },
      { id: 'p_ice_peak', x: 990, y: 355, w: 225, h: 375, material: 'stone' },
    ],
    props: [
      { id: 'sup_gl1', kind: 'supply_crate', x: 585, y: 384, w: 46, h: 46, platformId: 'p_glacier_lift' },
      { id: 'bar_gl1', kind: 'barrel', x: 790, y: 507, w: 40, h: 48 },
    ],
    waves: [
      {
        roundBiome: 'glacier',
        roundLabel: 'Aurora Pass',
        windBase: -90,
        windGust: 45,
        enemies: [
          { archetype: 'sniper', x: 1110, y: 355, platformId: 'p_ice_peak' },
          { archetype: 'shield', x: 870, y: 555, platformId: 'p_ice_mid' },
        ],
      },
      {
        roundBiome: 'storm',
        roundLabel: 'Whiteout Gale',
        windBase: 105,
        windGust: 48,
        enemies: [
          { archetype: 'scout', x: 610, y: 430, platformId: 'p_glacier_lift' },
          { archetype: 'bombardier', x: 880, y: 555, platformId: 'p_ice_mid' },
          { archetype: 'sniper', x: 1115, y: 355, platformId: 'p_ice_peak' },
        ],
      },
      {
        roundBiome: 'canyon',
        roundLabel: 'Sunbreak Crag',
        windBase: -110,
        windGust: 50,
        enemies: [
          { archetype: 'shield', x: 610, y: 430, platformId: 'p_glacier_lift' },
          { archetype: 'bombardier', x: 1055, y: 355, platformId: 'p_ice_peak' },
          { archetype: 'sniper', x: 1155, y: 355, platformId: 'p_ice_peak' },
        ],
      },
    ],
    startingAmmo: { triple: 4, fire: 3 },
  },
  {
    id: 10,
    name: 'Shadow Swamp',
    subtitle: 'Mist-shrouded ambush & swinging iron',
    biome: 'swamp',
    windBase: 40,
    windGust: 30,
    playerSpawn: { x: 155, y: 530 },
    platforms: [
      { id: 'p_left', x: 45, y: 530, w: 225, h: 200, material: 'wood' },
      { id: 'p_bog_1', x: 540, y: 565, w: 220, h: 165, material: 'wood' },
      { id: 'p_bog_arch', x: 480, y: 125, w: 420, h: 24, material: 'iron', ricochet: true },
      { id: 'p_bog_2', x: 890, y: 450, w: 320, h: 280, material: 'wood' },
      { id: 'p_bog_perch', x: 995, y: 290, w: 195, h: 24, material: 'wood' },
    ],
    props: [
      {
        id: 'pend_sw1',
        kind: 'pendulum',
        x: 660,
        y: 149,
        w: 44,
        h: 44,
        ropeLength: 265,
        swingAngle: 0.68,
        swingSpeed: 2.35,
        phase: 0.5,
      },
      { id: 'bar_sw1', kind: 'barrel', x: 915, y: 402, w: 40, h: 48 },
      { id: 'sup_sw1', kind: 'supply_crate', x: 555, y: 519, w: 46, h: 46 },
    ],
    waves: [
      {
        roundBiome: 'swamp',
        roundLabel: 'Lantern Mist',
        windBase: 40,
        windGust: 30,
        enemies: [
          { archetype: 'shield', x: 660, y: 565, platformId: 'p_bog_1' },
          { archetype: 'bombardier', x: 1050, y: 450, platformId: 'p_bog_2' },
          { archetype: 'sniper', x: 1095, y: 290, platformId: 'p_bog_perch' },
        ],
      },
      {
        roundBiome: 'cavern',
        roundLabel: 'Sunken Hollow',
        windBase: -55,
        windGust: 25,
        enemies: [
          { archetype: 'bombardier', x: 665, y: 565, platformId: 'p_bog_1' },
          { archetype: 'shield', x: 990, y: 450, platformId: 'p_bog_2' },
          { archetype: 'sniper', x: 1110, y: 290, platformId: 'p_bog_perch' },
        ],
      },
      {
        roundBiome: 'storm',
        roundLabel: 'Bog Tempest',
        windBase: 95,
        windGust: 45,
        enemies: [
          { archetype: 'shield', x: 655, y: 565, platformId: 'p_bog_1' },
          { archetype: 'bombardier', x: 1020, y: 450, platformId: 'p_bog_2' },
          { archetype: 'sniper', x: 1140, y: 450, platformId: 'p_bog_2' },
          { archetype: 'sniper', x: 1095, y: 290, platformId: 'p_bog_perch' },
        ],
      },
    ],
    startingAmmo: { triple: 4, fire: 3 },
  },
  {
    id: 11,
    name: 'Stormspire Gauntlet',
    subtitle: 'Dual moving lifts under lightning skies',
    biome: 'storm',
    windBase: -110,
    windGust: 55,
    playerSpawn: { x: 155, y: 460 },
    platforms: [
      { id: 'p_left', x: 45, y: 460, w: 220, h: 270, material: 'stone' },
      {
        id: 'p_lift_a',
        x: 495,
        y: 420,
        baseX: 495,
        baseY: 420,
        w: 155,
        h: 24,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 110,
        moveSpeed: 1.9,
        movePhase: 0,
      },
      {
        id: 'p_lift_b',
        x: 745,
        y: 360,
        baseX: 745,
        baseY: 360,
        w: 155,
        h: 24,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 95,
        moveSpeed: 1.75,
        movePhase: 2.1,
      },
      { id: 'p_spire_r', x: 960, y: 490, w: 255, h: 240, material: 'stone' },
      { id: 'p_spire_top', x: 990, y: 295, w: 215, h: 24, material: 'iron', ricochet: true },
    ],
    props: [
      { id: 'sup_st1', kind: 'supply_crate', x: 550, y: 374, w: 46, h: 46, platformId: 'p_lift_a' },
      { id: 'bar_st1', kind: 'barrel', x: 975, y: 442, w: 40, h: 48 },
    ],
    waves: [
      {
        roundBiome: 'storm',
        roundLabel: 'Bolt Ridge',
        windBase: -110,
        windGust: 55,
        enemies: [
          { archetype: 'scout', x: 575, y: 420, platformId: 'p_lift_a' },
          { archetype: 'shield', x: 820, y: 360, platformId: 'p_lift_b' },
          { archetype: 'sniper', x: 1100, y: 295, platformId: 'p_spire_top' },
        ],
      },
      {
        roundBiome: 'fortress',
        roundLabel: 'Crossfire Rampart',
        windBase: 115,
        windGust: 50,
        enemies: [
          { archetype: 'shield', x: 575, y: 420, platformId: 'p_lift_a' },
          { archetype: 'bombardier', x: 1085, y: 490, platformId: 'p_spire_r' },
          { archetype: 'sniper', x: 1100, y: 295, platformId: 'p_spire_top' },
        ],
      },
      {
        roundBiome: 'glacier',
        roundLabel: 'Sleet Battery',
        windBase: -120,
        windGust: 60,
        enemies: [
          { archetype: 'bombardier', x: 820, y: 360, platformId: 'p_lift_b' },
          { archetype: 'shield', x: 1050, y: 490, platformId: 'p_spire_r' },
          { archetype: 'sniper', x: 1120, y: 295, platformId: 'p_spire_top' },
        ],
      },
      {
        roundBiome: 'citadel',
        roundLabel: 'Apex Vanguard',
        windBase: 120,
        windGust: 55,
        enemies: [
          { archetype: 'shield', x: 575, y: 420, platformId: 'p_lift_a' },
          { archetype: 'bombardier', x: 820, y: 360, platformId: 'p_lift_b' },
          { archetype: 'bombardier', x: 1085, y: 490, platformId: 'p_spire_r' },
          { archetype: 'sniper', x: 1105, y: 295, platformId: 'p_spire_top' },
        ],
      },
    ],
    startingAmmo: { triple: 5, fire: 4 },
  },
  {
    id: 12,
    name: 'Eclipse Throne',
    subtitle: 'Final gauntlet against the Warlord & Guard',
    biome: 'citadel',
    windBase: -95,
    windGust: 45,
    playerSpawn: { x: 150, y: 525 },
    platforms: [
      { id: 'p_left', x: 40, y: 525, w: 225, h: 205, material: 'stone' },
      {
        id: 'p_throne_lift',
        x: 530,
        y: 410,
        baseX: 530,
        baseY: 410,
        w: 165,
        h: 24,
        material: 'iron',
        ricochet: true,
        moveAxis: 'y',
        moveRange: 95,
        moveSpeed: 1.85,
        movePhase: 0.9,
      },
      { id: 'p_sanctum', x: 820, y: 495, w: 395, h: 235, material: 'stone' },
      { id: 'p_high_crown', x: 945, y: 300, w: 245, h: 24, material: 'iron', ricochet: true },
    ],
    props: [
      { id: 'bar_ec1', kind: 'barrel', x: 845, y: 447, w: 40, h: 48 },
      { id: 'sup_ec1', kind: 'supply_crate', x: 590, y: 364, w: 46, h: 46, platformId: 'p_throne_lift' },
    ],
    waves: [
      {
        roundBiome: 'citadel',
        roundLabel: 'Eclipse Gate',
        windBase: -95,
        windGust: 45,
        enemies: [
          { archetype: 'shield', x: 615, y: 410, platformId: 'p_throne_lift' },
          { archetype: 'bombardier', x: 1005, y: 495, platformId: 'p_sanctum' },
          { archetype: 'sniper', x: 1085, y: 300, platformId: 'p_high_crown' },
        ],
      },
      {
        roundBiome: 'swamp',
        roundLabel: 'Cursed Fog',
        windBase: 105,
        windGust: 50,
        enemies: [
          { archetype: 'bombardier', x: 615, y: 410, platformId: 'p_throne_lift' },
          { archetype: 'shield', x: 960, y: 495, platformId: 'p_sanctum' },
          { archetype: 'sniper', x: 1110, y: 300, platformId: 'p_high_crown' },
          { archetype: 'sniper', x: 1135, y: 495, platformId: 'p_sanctum' },
        ],
      },
      {
        roundBiome: 'storm',
        roundLabel: 'Shattered Sky',
        windBase: -125,
        windGust: 60,
        enemies: [
          { archetype: 'shield', x: 615, y: 410, platformId: 'p_throne_lift' },
          { archetype: 'shield', x: 940, y: 495, platformId: 'p_sanctum' },
          { archetype: 'bombardier', x: 1110, y: 495, platformId: 'p_sanctum' },
          { archetype: 'sniper', x: 1085, y: 300, platformId: 'p_high_crown' },
        ],
      },
      {
        roundBiome: 'citadel',
        roundLabel: 'Eclipse Warlord',
        windBase: 110,
        windGust: 55,
        enemies: [
          { archetype: 'boss', x: 1055, y: 495, platformId: 'p_sanctum' },
          { archetype: 'shield', x: 615, y: 410, platformId: 'p_throne_lift' },
          { archetype: 'sniper', x: 1085, y: 300, platformId: 'p_high_crown' },
        ],
      },
    ],
    startingAmmo: { triple: 5, fire: 4 },
  },
];

export function generateEndlessWave(waveNumber: number): {
  platforms: Platform[];
  props: PropDef[];
  wave: WaveDef;
  windBase: number;
  windGust: number;
  biome: BiomeId;
} {
  const biomes: BiomeId[] = [
    'meadow',
    'canyon',
    'fortress',
    'cavern',
    'glacier',
    'swamp',
    'storm',
    'citadel',
  ];
  const biome = biomes[(waveNumber - 1) % biomes.length];

  const midY = 470 + ((waveNumber * 53) % 110);
  const rightY = 410 + ((waveNumber * 79) % 130);

  const platforms: Platform[] = [
    { id: 'p_left', x: 50, y: 530, w: 230, h: 200, material: biome === 'meadow' ? 'grass' : 'stone' },
    {
      id: 'p_mid',
      x: 560,
      y: midY,
      baseX: 560,
      baseY: midY,
      w: 200,
      h: 24,
      material: waveNumber % 2 === 0 ? 'iron' : 'wood',
      ricochet: waveNumber % 2 === 0,
      moveAxis: waveNumber >= 3 ? 'y' : undefined,
      moveRange: waveNumber >= 3 ? Math.min(105, 55 + waveNumber * 6) : 0,
      moveSpeed: Math.min(2.1, 1.2 + waveNumber * 0.08),
      movePhase: waveNumber * 0.7,
    },
    {
      id: 'p_right',
      x: 890,
      y: rightY,
      w: 320,
      h: 720 - rightY + 20,
      material: biome === 'meadow' ? 'grass' : 'stone',
    },
  ];

  const props: PropDef[] = [
    { id: `e_sup_${waveNumber}`, kind: 'supply_crate', x: 580, y: midY - 46, w: 46, h: 46, platformId: 'p_mid' },
    { id: `e_bar_${waveNumber}`, kind: 'barrel', x: 925, y: rightY - 48, w: 40, h: 48 },
  ];

  const enemies: EnemySpawn[] = [];
  const count = Math.min(4, 1 + Math.floor((waveNumber + 1) / 2));

  for (let i = 0; i < count; i++) {
    const roll = (waveNumber + i * 3) % 5;
    let archetype: EnemySpawn['archetype'] = 'scout';
    if (waveNumber >= 2 && roll === 1) archetype = 'sniper';
    else if (waveNumber >= 3 && roll === 2) archetype = 'shield';
    else if (waveNumber >= 4 && roll === 3) archetype = 'bombardier';
    else if (waveNumber >= 5 && waveNumber % 5 === 0 && i === 0) archetype = 'boss';

    if (i === 0 && count >= 2) {
      enemies.push({ archetype, x: 675, y: midY, platformId: 'p_mid' });
    } else {
      enemies.push({
        archetype,
        x: 990 + (i * 65) % 160,
        y: rightY,
        platformId: 'p_right',
      });
    }
  }

  const windDir = waveNumber % 2 === 0 ? 1 : -1;
  const windBase = waveNumber >= 2 ? windDir * Math.min(125, 25 + waveNumber * 10) : 0;
  const windGust = waveNumber >= 3 ? Math.min(60, 14 + waveNumber * 4.5) : 0;

  return {
    platforms,
    props,
    wave: { enemies, roundBiome: biome },
    windBase,
    windGust,
    biome,
  };
}
