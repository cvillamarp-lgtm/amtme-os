import { encodeAudioBufferToWav } from "@/lib/audio-wav";

export interface MasteringProfile {
  name: string;
  highPassHz: number;
  lowShelfHz: number;
  lowShelfGainDb: number;
  presenceHz: number;
  presenceGainDb: number;
  airHz: number;
  airGainDb: number;
  compressorThreshold: number;
  compressorKnee: number;
  compressorRatio: number;
  compressorAttack: number;
  compressorRelease: number;
  makeupGainDb: number;
  targetPeakDb: number;
}

export const PODCAST_VOICE_PROFILE: MasteringProfile = {
  name: "podcast-voice-v1",
  highPassHz: 80,
  lowShelfHz: 120,
  lowShelfGainDb: -1.5,
  presenceHz: 3200,
  presenceGainDb: 1.8,
  airHz: 9000,
  airGainDb: 1.2,
  compressorThreshold: -18,
  compressorKnee: 12,
  compressorRatio: 3,
  compressorAttack: 0.003,
  compressorRelease: 0.2,
  makeupGainDb: 2.5,
  targetPeakDb: -1,
};

export async function masterVoiceBlobInBrowser(
  blob: Blob,
  profile: MasteringProfile = PODCAST_VOICE_PROFILE,
): Promise<{ blob: Blob; profileName: string }> {
  const arrayBuffer = await blob.arrayBuffer();
  const decodeContext = new AudioContext();
  const originalBuffer = await decodeContext.decodeAudioData(arrayBuffer.slice(0));
  await decodeContext.close();

  const offline = new OfflineAudioContext(
    originalBuffer.numberOfChannels,
    originalBuffer.length,
    originalBuffer.sampleRate,
  );

  const source = offline.createBufferSource();
  source.buffer = originalBuffer;

  const highPass = offline.createBiquadFilter();
  highPass.type = "highpass";
  highPass.frequency.value = profile.highPassHz;
  highPass.Q.value = 0.707;

  const lowShelf = offline.createBiquadFilter();
  lowShelf.type = "lowshelf";
  lowShelf.frequency.value = profile.lowShelfHz;
  lowShelf.gain.value = profile.lowShelfGainDb;

  const presence = offline.createBiquadFilter();
  presence.type = "peaking";
  presence.frequency.value = profile.presenceHz;
  presence.Q.value = 0.9;
  presence.gain.value = profile.presenceGainDb;

  const air = offline.createBiquadFilter();
  air.type = "highshelf";
  air.frequency.value = profile.airHz;
  air.gain.value = profile.airGainDb;

  const compressor = offline.createDynamicsCompressor();
  compressor.threshold.value = profile.compressorThreshold;
  compressor.knee.value = profile.compressorKnee;
  compressor.ratio.value = profile.compressorRatio;
  compressor.attack.value = profile.compressorAttack;
  compressor.release.value = profile.compressorRelease;

  const makeup = offline.createGain();
  makeup.gain.value = dbToGain(profile.makeupGainDb);

  source.connect(highPass);
  highPass.connect(lowShelf);
  lowShelf.connect(presence);
  presence.connect(air);
  air.connect(compressor);
  compressor.connect(makeup);
  makeup.connect(offline.destination);

  source.start(0);

  const rendered = await offline.startRendering();
  const normalized = await normalizePeak(rendered, profile.targetPeakDb);
  const wavBlob = encodeAudioBufferToWav(normalized);

  return {
    blob: wavBlob,
    profileName: profile.name,
  };
}

function dbToGain(db: number): number {
  return Math.pow(10, db / 20);
}

async function normalizePeak(audioBuffer: AudioBuffer, targetPeakDb: number): Promise<AudioBuffer> {
  let peak = 0;

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
    const data = audioBuffer.getChannelData(ch);
    for (let i = 0; i < data.length; i += 1) {
      const abs = Math.abs(data[i]);
      if (abs > peak) peak = abs;
    }
  }

  if (peak <= 0) return audioBuffer;

  const targetLinear = dbToGain(targetPeakDb);
  const gain = targetLinear / peak;

  const context = new AudioContext();
  const output = context.createBuffer(
    audioBuffer.numberOfChannels,
    audioBuffer.length,
    audioBuffer.sampleRate,
  );

  for (let ch = 0; ch < audioBuffer.numberOfChannels; ch += 1) {
    const input = audioBuffer.getChannelData(ch);
    const out = output.getChannelData(ch);
    for (let i = 0; i < input.length; i += 1) {
      out[i] = Math.max(-1, Math.min(1, input[i] * gain));
    }
  }

  await context.close();
  return output;
}
