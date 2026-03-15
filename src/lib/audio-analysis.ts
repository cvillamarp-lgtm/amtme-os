export interface AudioAnalysisResult {
  durationSeconds: number;
  peakDb: number;
  rmsDb: number;
  clippingCount: number;
  sampleRate: number;
  channels: number;
}

function toDb(value: number): number {
  if (!isFinite(value) || value <= 0) return -100;
  return 20 * Math.log10(value);
}

export async function analyzeAudioBlob(blob: Blob): Promise<AudioAnalysisResult> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer.slice(0));

  const channels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const durationSeconds = audioBuffer.duration;

  let peak = 0;
  let sumSquares = 0;
  let totalSamples = 0;
  let clippingCount = 0;

  for (let channelIndex = 0; channelIndex < channels; channelIndex += 1) {
    const channelData = audioBuffer.getChannelData(channelIndex);

    for (let i = 0; i < channelData.length; i += 1) {
      const sample = channelData[i];
      const abs = Math.abs(sample);

      if (abs > peak) peak = abs;
      if (abs >= 0.99) clippingCount += 1;

      sumSquares += sample * sample;
      totalSamples += 1;
    }
  }

  const rms = totalSamples > 0 ? Math.sqrt(sumSquares / totalSamples) : 0;

  await audioContext.close();

  return {
    durationSeconds: Number(durationSeconds.toFixed(2)),
    peakDb: Number(toDb(peak).toFixed(2)),
    rmsDb: Number(toDb(rms).toFixed(2)),
    clippingCount,
    sampleRate,
    channels,
  };
}

export function getAudioQualityLabel(analysis: AudioAnalysisResult): {
  label: string;
  tone: "good" | "warning" | "bad";
  notes: string[];
} {
  const notes: string[] = [];
  let score = 0;

  if (analysis.peakDb <= -1 && analysis.peakDb >= -9) {
    score += 1;
  } else {
    notes.push("Ajusta ganancia: el pico ideal no debería quedar demasiado bajo ni demasiado cerca de 0 dB.");
  }

  if (analysis.rmsDb >= -26 && analysis.rmsDb <= -14) {
    score += 1;
  } else {
    notes.push("El volumen promedio está fuera del rango cómodo para voz hablada.");
  }

  if (analysis.clippingCount === 0) {
    score += 1;
  } else {
    notes.push("Se detectó clipping. Baja la ganancia del micrófono y repite la toma si es necesario.");
  }

  if (score === 3) {
    return { label: "Buena base", tone: "good", notes };
  }

  if (score === 2) {
    return { label: "Ajustable", tone: "warning", notes };
  }

  return { label: "Revisar toma", tone: "bad", notes };
}
