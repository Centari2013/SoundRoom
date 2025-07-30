// audioTaggerNamer.js
import { pipeline, read_audio, env } from '@huggingface/transformers';
import AudioTaggerWorker from '@/workers/audioTaggerWorker.js?worker&type=module'

//import { AutoProcessor, ClapAudioModelWithProjection, read_audio } from '@xenova/transformers';

env.useBrowserCache = true;
env.allowLocalModels = true; // Disable local models for now, use CDN
env.allowRemoteModels = false;

let nameGenerator = null;
let nameGeneratorPromise = null;


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
    return nameGenerator;
  }).catch(err => {
    throw err;
  });

  return nameGeneratorPromise;
}


/**
 * Classifies an audio file using the CLAP zero-shot audio classifier.
 * @param {Blob} input - Audio file as a Blob.
 * @returns {Promise<Array<string>>} - Array of top predicted tags.
 */
const classifyCallbacks = new Map()

const classifierWorker = new AudioTaggerWorker()


classifierWorker.onmessage = (event) => {
  const { id, tags, error } = event.data
  const cb = classifyCallbacks.get(id)
  if (cb) {
    if (error) cb.reject(new Error(error))
    else cb.resolve(tags)
    classifyCallbacks.delete(id)
  }
}

/**
 * Offload audio classification to background worker.
 * @param {Blob} blob
 * @returns {Promise<string[]>}
 */
export async function classifyAudio(blob) {
  const audioArray = await read_audio(URL.createObjectURL(blob));
  const id = crypto.randomUUID();

  return new Promise((resolve, reject) => {
    classifyCallbacks.set(id, { resolve, reject })


      classifierWorker.postMessage(
        { id, audioArray } // transferable for better performance
      )
    })
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

  const genStart = performance.now();
  const output = await nameGenerator(prompt, { max_new_tokens: 12 });
  const nameOnly = output[0].generated_text.split(prompt).pop().trim();
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

