/* Cost presets mirroring experiment.mac EXPERIMENT_PRESET. */

export const PRESETS = {
  tiny:   { depth: 1, walks: 50,   steps: 10,  caSteps: 4,  eigMaxN: 600,  kpmMoments: 64,  kpmSamples: 8,  longLoopMax: 6, maxPairs: 4000 },
  small:  { depth: 2, walks: 200,  steps: 20,  caSteps: 8,  eigMaxN: 900,  kpmMoments: 96,  kpmSamples: 12, longLoopMax: 6, maxPairs: 20000 },
  medium: { depth: 3, walks: 1000, steps: 60,  caSteps: 16, eigMaxN: 1200, kpmMoments: 128, kpmSamples: 16, longLoopMax: 7, maxPairs: 60000 },
  large:  { depth: 4, walks: 5000, steps: 200, caSteps: 32, eigMaxN: 1500, kpmMoments: 192, kpmSamples: 20, longLoopMax: 7, maxPairs: 120000 },
  huge:   { depth: 5, walks: 20000, steps: 500, caSteps: 64, eigMaxN: 0,   kpmMoments: 256, kpmSamples: 24, longLoopMax: 8, maxPairs: 200000 },
};

export function resolvePreset(name = 'small', overrides = {}) {
  const base = PRESETS[name];
  if (!base) throw new Error(`unknown preset: ${name}`);
  return { preset: name, ...base, ...overrides };
}