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
 * Classifies an audio buffer using YAMNet.
 * @param {Float32Array} monoBuffer - 1-channel Float32 PCM data @ 16kHz
 * @returns {Promise<Array<{label: string, score: number}>>}
 */
export async function classifyAudio(monoBuffer) {
  await initModels();

  const inputTensor = tf.tensor(monoBuffer, [monoBuffer.length], 'float32');
  const output = yamnetModel.predict(inputTensor);

  const scores = output[0].arraySync(); // shape [frames, 521]
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
