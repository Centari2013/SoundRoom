// audioTaggerNamer.js
import * as tf from '@tensorflow/tfjs';
import { pipeline } from '@xenova/transformers';

let yamnetModel = null;
let nameGenerator = null;
let yamnetLabels = [];

/**
 * Initializes models if not already loaded.
 */
export async function initModels() {
  if (!yamnetModel) {
    yamnetModel = await tf.loadGraphModel(
      'https://tfhub.dev/google/tfjs-model/yamnet/tfjs/1/model.json',
      { fromTFHub: true }
    );
    // Load label file manually (521 classes)
    const labelText = await fetch('https://raw.githubusercontent.com/tensorflow/models/master/research/audioset/yamnet/yamnet_class_map.csv')
      .then(res => res.text());
    yamnetLabels = labelText
      .split('\n')
      .slice(1)
      .map(line => line.split(',')[2]?.replace(/"/g, '').trim())
      .filter(Boolean);
  }

  if (!nameGenerator) {
    nameGenerator = await pipeline('text-generation', 'Xenova/distilgpt2');
  }
}

/**
 * Decode a File/Blob to a mono Float32Array at 16kHz
 *
 * @param {File|Blob} file
 * @returns {Promise<Float32Array>}
 */
async function decodeFileToMonoPCM(file) {
  const baseContext = new (window.AudioContext || window.webkitAudioContext)();
  try {
    const arrayBuffer = await file.arrayBuffer();
    const audioBuffer = await baseContext.decodeAudioData(arrayBuffer);

    // Resample if needed using OfflineAudioContext
    let resampled = audioBuffer;
    if (audioBuffer.sampleRate !== 16000) {
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
    }

    const length = resampled.length;
    const channels = resampled.numberOfChannels;
    if (channels === 1) {
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
  await initModels();

  let monoBuffer;
  if (input instanceof Float32Array) {
    monoBuffer = input;
  } else if (input instanceof Blob) {
    monoBuffer = await decodeFileToMonoPCM(input);
  } else {
    throw new Error('Unsupported input type for classifyAudio');
  }

  const inputTensor = tf.tensor(monoBuffer, [monoBuffer.length], 'float32');
  const prediction = yamnetModel.predict(inputTensor);

  // tf.GraphModel.predict may return either a tensor or an array of tensors
  const scoresTensor = Array.isArray(prediction) ? prediction[0] : prediction;
  const scores = scoresTensor.arraySync(); // shape [frames, 521]
  const averaged = tf.tensor(scores).mean(0).arraySync(); // shape [521]

  const topTags = Array.from(averaged)
    .map((score, i) => ({ label: yamnetLabels[i], score }))
    .filter(t => t.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  return topTags;
}

/**
 * Generates a human-readable name from a list of tags.
 * @param {string[]} tags
 * @returns {Promise<string>}
 */
export async function generateNameFromTags(tags) {
  await initModels();
  const prompt = `Generate a short descriptive name for an ambient sound based on these tags: ${tags.join(', ')}.\nName:`;
  const output = await nameGenerator(prompt, { max_new_tokens: 12 });
  return output[0]?.generated_text.replace(prompt, '').trim();
}
