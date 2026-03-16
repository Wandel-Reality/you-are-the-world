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
    // Distinct ring color per performer: left, center, right
    circleRingColors: [0xf6e7a8, 0xa8c8f5, 0xf5b8d4],
    particleGold: 0xf0dfa8,
    particleBlue: 0x5b73b3,
    hazeBlue: 0x09101f,
  },

  circle: {
    radius: 7,
    glowRadius: 9.5,
    followLerp: 0.08,
  },

  performers: {
    // MediaPipe detects up to this many poses; we only use the center one.
    count: 3,
    // Center zone in normalised [0,1] camera space (shoulder midpoint X)
    centerZoneMin: 0.333,
    centerZoneMax: 0.667,
    // EMA smoothing: torso is smoothed heavily for stability;
    // hand is lighter to keep gesture response expressive.
    torsoAlpha: 0.10,
    handAlpha:  0.14,
    // Hand position (camera-normalised 0–1) is mapped to world space.
    // World is 160 × 90 units (±80 × ±45).
    // At scale 120: hand at 0.1 or 0.9 (near edge) → ±48 world units.
    // At scale 80:  hand at 0.1 or 0.9              → ±32 world units.
    handHorizontalScale: 120,
    handVerticalScale:    80,
    // Webcam mirror: set true if camera shows left/right flipped
    mirrorX: true,
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
