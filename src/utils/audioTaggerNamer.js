// audioTaggerNamer.js
import { pipeline, read_audio, env } from '@huggingface/transformers';
//import { AutoProcessor, ClapAudioModelWithProjection, read_audio } from '@xenova/transformers';

env.useBrowserCache = true;
env.allowLocalModels = true; // Disable local models for now, use CDN
env.allowRemoteModels = false;

let nameGenerator = null;
let nameGeneratorPromise = null;

let clapClassifier = null;
let clapInitPromise = null;


/**
 * Initializes CLAP audio embedding components properly.
 */
export async function initClapModel() {
  if (clapClassifier) return Promise.resolve();
  if (clapInitPromise) return clapInitPromise;

  const start = performance.now();
  clapInitPromise = pipeline('zero-shot-audio-classification', 'Xenova/clap-htsat-unfused', {
    local_files_only: true,
    trust_remote_code: true,
    dtype: 'q8',
    use_cache: true,
  }).then(pipelineInstance => {
    clapClassifier = pipelineInstance;
    console.log(`[Timing] CLAP model loaded in ${(performance.now() - start).toFixed(2)} ms`);
  }).catch(err => {
    console.error('CLAP init failed:', err);
    throw err;
  });

  return clapInitPromise;
}

/**
 * Initializes SmolLM2-135M-Instruct for generating human-readable names.
 */
export async function initLLM() {
  if (nameGenerator) return Promise.resolve();
  if (nameGeneratorPromise) return nameGeneratorPromise;

  const start = performance.now();
  nameGeneratorPromise = pipeline('text-generation', 'Xenova/llama2.c-stories110M'
    //'HuggingFaceTB/SmolLM2-135M-Instruct'
, 
    {
    local_files_only: true,
    max_length: 20,
    do_sample: true,
    temperature: 0.5,
    top_p: 0.9,
    top_k: 50,
    repetition_penalty: 1.2,
    num_return_sequences: 1,
    use_cache: true,
    trust_remote_code: true,
    dtype: 'fp16'
  }).then(pipelineInstance => {
    nameGenerator = pipelineInstance;
    console.log(`[Timing] LLM loaded in ${(performance.now() - start).toFixed(2)} ms`);
    return nameGenerator;
  }).catch(err => {
    console.error('LLM init failed:', err);
    throw err;
  });

  return nameGeneratorPromise;
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
    .filter(t => t.score > 0.07)
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
  await initLLM();
  /* const prompt = `
    You are naming an ambient sound for a curated sound library. Use the following tags as inspiration:

    Tags: ${tags.join(', ')}

    Generate a natural-sounding, title-cased name that feels descriptive and aesthetic - like something found in an ambient or nature sound collection.

    Only output the name. Keep it short (1-3 words). Examples:

    - Ocean Waves
    - Forest Morning
    - Metal Door Creak
    - Deep Synth Pulse
    - Quiet Street

    Name:
    `.trim(); */

  const prompt = `Tags: ${tags.join(', ')}\nShort Title:`;

  console.log(`[Timing] generateNameFromTags prompt: ${prompt}`);
  const genStart = performance.now();
  const output = await nameGenerator(prompt, { max_new_tokens: 12 });
  console.log(`[Timing] nameGenerator output in ${(performance.now() - genStart).toFixed(2)} ms`);
  console.log(`[Timing] generateNameFromTags total: ${(performance.now() - start).toFixed(2)} ms`);
  const nameOnly = output[0].generated_text.split(prompt).pop().trim();
  console.log(`[NameGen] Generated output:`, output);
  return cleanGeneratedName(nameOnly);
}

function cleanGeneratedName(text) {
  if (!text) return null;

  return text
    .replace(/[^a-zA-Z0-9\s-]/g, '')     // Remove punctuation
    .replace(/\s{2,}/g, ' ')             // Collapse multiple spaces
    .trim()
    .split(' ')
    //.slice(0, 4)                         // Max 3–4 words
    //.map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}
