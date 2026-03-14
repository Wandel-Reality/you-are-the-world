function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}

function averageRange(data, startBin, endBin) {
  const safeStart = Math.max(0, startBin);
  const safeEnd = Math.min(data.length - 1, endBin);

  if (safeEnd < safeStart) return 0;

  let sum = 0;
  let count = 0;

  for (let i = safeStart; i <= safeEnd; i++) {
    sum += data[i];
    count++;
  }

  return count > 0 ? sum / count : 0;
}

export function extractAudioFeatures({
  frequencyData,
  timeDomainData,
  analyser,
  previous = {},
}) {
  const nyquist = analyser.context.sampleRate / 2;
  const binCount = frequencyData.length;
  const hzPerBin = nyquist / binCount;

  const binForHz = (hz) => Math.floor(hz / hzPerBin);

  const bassRaw =
    averageRange(frequencyData, binForHz(20), binForHz(140)) / 255;

  const midsRaw =
    averageRange(frequencyData, binForHz(140), binForHz(2000)) / 255;

  const highsRaw =
    averageRange(frequencyData, binForHz(2000), binForHz(8000)) / 255;

  let rms = 0;
  for (let i = 0; i < timeDomainData.length; i++) {
    const normalized = (timeDomainData[i] - 128) / 128;
    rms += normalized * normalized;
  }
  rms = Math.sqrt(rms / timeDomainData.length);

  const levelRaw = clamp01(rms * 2.5);

  const smoothing = 0.12;

  const bass =
    previous.bass != null
      ? previous.bass + (bassRaw - previous.bass) * smoothing
      : bassRaw;

  const mids =
    previous.mids != null
      ? previous.mids + (midsRaw - previous.mids) * smoothing
      : midsRaw;

  const highs =
    previous.highs != null
      ? previous.highs + (highsRaw - previous.highs) * smoothing
      : highsRaw;

  const level =
    previous.level != null
      ? previous.level + (levelRaw - previous.level) * smoothing
      : levelRaw;

  const smoothedLevel =
    previous.smoothedLevel != null
      ? previous.smoothedLevel + (level - previous.smoothedLevel) * 0.08
      : level;

  const peak = Math.max(0, level - (previous.smoothedLevel ?? level));

  return {
    bass: clamp01(bass),
    mids: clamp01(mids),
    highs: clamp01(highs),
    level: clamp01(level),
    smoothedLevel: clamp01(smoothedLevel),
    peak: clamp01(peak * 3.0),
  };
}
