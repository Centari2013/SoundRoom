// audioTaggerNamer.js
import * as tf from '@tensorflow/tfjs';
import { pipeline, read_audio, env } from '@huggingface/transformers';
//import { AutoProcessor, ClapAudioModelWithProjection, read_audio } from '@xenova/transformers';

env.useBrowserCache = false;
env.allowLocalModels = false; // Disable local models for now, use CDN
env.allowRemoteModels = true; // Allow remote models

let nameGenerator = null;
let clapClassifier = null;

/**
 * Initializes CLAP audio embedding components properly.
 */
export async function initClapModel() {
  const start = performance.now();
  if (!clapClassifier) {
    clapClassifier = await pipeline('zero-shot-audio-classification', 'Xenova/clap-htsat-unfused'); 
    console.log(`[Timing] CLAP model loaded in ${(performance.now() - start).toFixed(2)} ms`);
  } else {
    console.log(`[Timing] CLAP model already initialized, skipped loading.`);
  }
}

/**
 * Initializes SmolLM2-135M-Instruct for generating human-readable names.
 */
export async function initSmolLM2() {
  const start = performance.now();
  if (!nameGenerator) {
    const nameGenStart = performance.now();
    nameGenerator = await pipeline('text-generation', 'HuggingFaceTB/SmolLM2-135M-Instruct', {
      max_length: 20,
      do_sample: true,
      temperature: 0.5,
      top_p: 0.9,
      top_k: 50,
      repetition_penalty: 1.2,
      num_return_sequences: 1,
      use_cache: true,
      trust_remote_code: true,
      dtype: 'q8' // or 'int8', 'fp32' if needed
    });
    console.log(`[Timing] Name generator pipeline loaded in ${(performance.now() - nameGenStart).toFixed(2)} ms`);
  } else {
    console.log(`[Timing] Name generator already initialized, skipped loading.`);
  }
  console.log(`[Timing] initSmolLM2 total: ${(performance.now() - start).toFixed(2)} ms`);
}

/**
 * Classifies an audio file using the CLAP zero-shot audio classifier.
 * @param {Blob} input - Audio file as a Blob.
 * @returns {Promise<Array<string>>} - Array of top predicted tags.
 */
export async function classifyAudio(input) {
  const start = performance.now();
  await initClapModel();

  const labelsLoadStart = performance.now();
  const labels = await fetch('/models/labels.json')
    .then(res => res.json())
    .catch(err => {
      console.error('Failed to load labels:', err);
      return [];
    });
  console.log(`[Timing] Labels loaded in ${(performance.now() - labelsLoadStart).toFixed(2)} ms`);

  // Convert input file to a URL for reading
  const objectUrl = URL.createObjectURL(input);
  const audioReadStart = performance.now();
  const audio = await read_audio(objectUrl); // handles decoding + resampling
  console.log(`[Timing] Audio read in ${(performance.now() - audioReadStart).toFixed(2)} ms`);

  const classifyStart = performance.now();
  const scores = await clapClassifier(audio, labels);
  console.log(`[Timing] Audio classified in ${(performance.now() - classifyStart).toFixed(2)} ms`);

  const topTags = scores
    .filter(t => t.score > 0.1)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5)
    .map(t => t.label);

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
  await initSmolLM2();
  const prompt = `Suggest a natural-sounding, title-cased filename for an ambient sound based on these tags: ${tags.join(', ')}. It should sound like a library title — no punctuation, no quotes. Examples: Ocean Waves, Forest Morning, River Creek. Avoid generic terms like "Audio" or "Sound Effect". Use 1-3 words max.`;
  console.log(`[Timing] generateNameFromTags prompt: ${prompt}`);
  const genStart = performance.now();
  const output = await nameGenerator(prompt, { max_new_tokens: 12 });
  console.log(`[Timing] nameGenerator output in ${(performance.now() - genStart).toFixed(2)} ms`);
  console.log(`[Timing] generateNameFromTags total: ${(performance.now() - start).toFixed(2)} ms`);
  console.log(`[NameGen] Generated output:`, output);
  return output[0]?.generated_text.replace(prompt, '').trim();
}

function cleanGeneratedName(text) {
  if (!text) return null;

  return text
    .replace(/[^a-zA-Z0-9\s-]/g, '')     // Remove punctuation
    .replace(/\s{2,}/g, ' ')             // Collapse multiple spaces
    .trim()
    .split(' ')
    .slice(0, 4)                         // Max 3–4 words
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
