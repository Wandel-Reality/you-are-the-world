export const CONFIG = {
  backgroundColor: 0x05070a,

  world: {
    width: 160,
    height: 90,
  },

  nodes: {
    count: 130,
    baseRadius: 0.28,
    revealSpeed: 0.03,
    lineDistance: 7,
    driftAmount: 0.8,
    lineOpacity: 0.1,

    touchRadiusBoost: 1.5,
    touchCooldown: 0.35,
    pulseDecaySpeed: 2.0,
    localRevealRadius: 16,
  },

  colors: {
    node: 0xf4e6a2,
    nodeBright: 0xfff3c2,
    nodeTouched: 0xfff0b8,
    line: 0xf0df9a,
    circleCore: 0x0a0b10,
    circleGlow: 0xf6e7a8,
    particleGold: 0xf0dfa8,
    particleBlue: 0x5b73b3,
    hazeBlue: 0x09101f,
  },

  circle: {
    radius: 7,
    glowRadius: 9.5,
    followLerp: 0.08,
  },

  organic: {
    membraneOpacity: 0.18,
    nucleusOpacity: 0.85,
    veinOpacity: 0.35,
    filamentOpacity: 0.45,

    membraneScale: 3.2,
    veinCount: 6,
    filamentCount: 5,

    wobble: 0.35,
  },

  connectors: {
    curveStrength: 0.18,
    subdivisions: 20,
  },
  particles: {
    count: 80,
    baseSize: 18,
    driftAmount: 0.18,
    opacity: 0.08,
    audioOpacityBoost: 0.05,
    audioSizeBoost: 0.1,
  },
  dust: {
    count: 140,
    baseSize: 1,
    opacity: 0.06,
    driftAmount: 0.08,
  },
};
