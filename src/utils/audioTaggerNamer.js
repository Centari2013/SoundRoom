// audioTaggerNamer.js
import * as tf from '@tensorflow/tfjs';
import { pipeline, AutoProcessor, ClapAudioModelWithProjection, read_audio, env } from '@huggingface/transformers';
//import { AutoProcessor, ClapAudioModelWithProjection, read_audio } from '@xenova/transformers';

//env.allowLocalModels=true

let yamnetModel = null;
let nameGenerator = null;
let yamnetLabels = [];
let clapModel = null;
let audioProcessor = null;


/**
 * Initializes CLAP audio embedding components properly.
 */
export async function initClapEmbedding() {
  if (!audioProcessor || !clapModel) {
    // Load processor and audio model
    audioProcessor = await AutoProcessor.from_pretrained('/models/clap-htsat-unfused', {
      local_files_only: true,
    });
    clapModel = await ClapAudioModelWithProjection.from_pretrained('/models/clap-htsat-unfused', {
      local_files_only: true
    });
    console.log('[CLAP] Audio processor and model loaded');
  }
}

/**
 * Extracts a 512-dim semantic embedding using proper CLAP projection.
 * @param {Blob} input - Audio file blob
 * @returns {Promise<Float32Array>}
 */
export async function extractClapEmbedding(input) {
  const start = performance.now();
  await initClapEmbedding();

  // Convert Blob or File to PCM using Xenova's helper
  const audio = await read_audio(input); // handles decoding + resampling
  const processed = await audioProcessor(audio);
  const { audio_embeds } = await audioEmbedder(processed);

  console.log(`[Timing] extractClapEmbedding total: ${(performance.now() - start).toFixed(2)} ms`);
  console.log(`[CLAP] Extracted embedding: ${audio_embeds.data} dims`);
  return audio_embeds.data; // Float32Array(512)
}

/**
 * Initializes models if not already loaded.
 */
export async function initModels() {
  const start = performance.now();
  if (!yamnetModel) {
    const yamnetStart = performance.now();
    yamnetModel = await tf.loadGraphModel('/models/yamnet/model.json');
    console.log(`[Timing] YAMNet model loaded in ${(performance.now() - yamnetStart).toFixed(2)} ms`);

    // Load label file manually (521 classes)
    const labelStart = performance.now();
    const labelText = await fetch('/models/yamnet/labels.csv').then(res => res.text());
    yamnetLabels = labelText
      .split('\n')
      .slice(1)
      .map(line => line.split(',')[2]?.replace(/"/g, '').trim())
      .filter(Boolean);
    console.log(`[Timing] YAMNet labels loaded in ${(performance.now() - labelStart).toFixed(2)} ms`);
  }

  if (!nameGenerator) {
    const nameGenStart = performance.now();
    nameGenerator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct', {
      max_length: 20,
      do_sample: true,
      temperature: 0.7,
      top_p: 0.9,
      top_k: 50,
      repetition_penalty: 1.2,
      num_return_sequences: 1,
      use_cache: true,
      trust_remote_code: true,
      dtype: 'q8' // or 'int8', 'fp32' if needed
    });
    console.log(`[Timing] Name generator pipeline loaded in ${(performance.now() - nameGenStart).toFixed(2)} ms`);
  }

  console.log(`[Timing] initModels total: ${(performance.now() - start).toFixed(2)} ms`);
}

/**
 * Decode a File/Blob to a mono Float32Array at 16kHz
 *
 * @param {File|Blob} file
 * @returns {Promise<Float32Array>}
 */
async function decodeFileToMonoPCM(file) {
  const start = performance.now();
  const baseContext = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const arrayBufferStart = performance.now();
    const arrayBuffer = await file.arrayBuffer();
    console.log(`[Timing] arrayBuffer loaded in ${(performance.now() - arrayBufferStart).toFixed(2)} ms`);

    const decodeStart = performance.now();
    const audioBuffer = await baseContext.decodeAudioData(arrayBuffer);
    console.log(`[Timing] audioBuffer decoded in ${(performance.now() - decodeStart).toFixed(2)} ms`);

    // Resample if needed using OfflineAudioContext
    let resampled = audioBuffer;
    if (audioBuffer.sampleRate !== 16000) {
      const resampleStart = performance.now();
      const offlineCtx = new OfflineAudioContext(
        audioBuffer.numberOfChannels,
        Math.ceil(audioBuffer.duration * 16000),
        16000
      );
      const source = offlineCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(offlineCtx.destination);
      source.start();
      resampled = await offlineCtx.startRendering();
      console.log(`[Timing] audioBuffer resampled in ${(performance.now() - resampleStart).toFixed(2)} ms`);
    }

    const length = resampled.length;
    const channels = resampled.numberOfChannels;
    if (channels === 1) {
      console.log(`[Timing] decodeFileToMonoPCM total: ${(performance.now() - start).toFixed(2)} ms`);
      return resampled.getChannelData(0);
    }
    const output = new Float32Array(length);
    const channelData = [];
    for (let c = 0; c < channels; c++) {
      channelData.push(resampled.getChannelData(c));
    }
    for (let i = 0; i < length; i++) {
      let sum = 0;
      for (let c = 0; c < channels; c++) {
        sum += channelData[c][i];
      }
      output[i] = sum / channels;
    }
    console.log(`[Timing] decodeFileToMonoPCM total: ${(performance.now() - start).toFixed(2)} ms`);
    return output;
  } finally {
    baseContext.close();
  }
}

/**
 * Classifies an audio buffer using YAMNet.
 * @param {Float32Array} monoBuffer - 1-channel Float32 PCM data @ 16kHz
 * @returns {Promise<Array<{label: string, score: number}>>}
 */
export async function classifyAudio(input) {
  const start = performance.now();
  await initModels();

  let monoBuffer;
  if (input instanceof Float32Array) {
    monoBuffer = input;
  } else if (input instanceof Blob) {
    const decodeStart = performance.now();
    monoBuffer = await decodeFileToMonoPCM(input);
    console.log(`[Timing] decodeFileToMonoPCM in classifyAudio: ${(performance.now() - decodeStart).toFixed(2)} ms`);
  } else {
    throw new Error('Unsupported input type for classifyAudio');
  }

  const tensorStart = performance.now();
  const inputTensor = tf.tensor(monoBuffer, [monoBuffer.length], 'float32');
  console.log(`[Timing] input tensor created in ${(performance.now() - tensorStart).toFixed(2)} ms`);

  const predictStart = performance.now();
  const prediction = yamnetModel.predict(inputTensor);
  console.log(`[Timing] yamnetModel.predict in ${(performance.now() - predictStart).toFixed(2)} ms`);

  const scoresTensor = Array.isArray(prediction) ? prediction[0] : prediction;
  const scores = scoresTensor.arraySync(); // shape [frames, 521]
  const avgStart = performance.now();
  const averaged = tf.tensor(scores).mean(0).arraySync(); // shape [521]
  console.log(`[Timing] Averaging scores in ${(performance.now() - avgStart).toFixed(2)} ms`);
  const topTags = Array.from(averaged)
    .map((score, i) => ({ label: yamnetLabels[i], score }))
    .filter(t => t.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  console.log(`[Timing] classifyAudio total: ${(performance.now() - start).toFixed(2)} ms`);
  return topTags;
}

/**
 * Generates a human-readable name from a list of tags.
 * @param {string[]} tags
 * @returns {Promise<string>}
 */
export async function generateNameFromTags(tags) {
  const start = performance.now();
  await initModels();
  const prompt = `Generate only a short, unique descriptive name for an ambient sound based on these tags: ${tags.map(t => t.label).join(', ')}.\nName:`;
  console.log(`[Timing] generateNameFromTags prompt: ${prompt}`);
  const genStart = performance.now();
  const output = await nameGenerator(prompt, { max_new_tokens: 12 });
  console.log(`[Timing] nameGenerator output in ${(performance.now() - genStart).toFixed(2)} ms`);
  console.log(`[Timing] generateNameFromTags total: ${(performance.now() - start).toFixed(2)} ms`);
  return output[0]?.generated_text.replace(prompt, '').trim();
}

export async function generateNameFromEmbedding(embedding, tags = []) {
  await initModels();
  const prompt = `Suggest a short name for a sound based on its semantic features and tags.\nTags: ${tags.map(t => t.label).join(', ') || 'N/A'}\nEmbedding: [${Array.from(embedding).slice(0, 12).join(', ')}...]\nName:`;
  const result = await nameGenerator(prompt, { max_new_tokens: 12 });
  return result[0]?.generated_text.replace(prompt, '').trim();
}

