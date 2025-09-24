// audioTaggerNamer.js
import AudioTaggerWorker from '@/workers/audioTaggerWorker.js?worker&type=module'

let nameGenerator = null;
let nameGeneratorPromise = null;

/** * Initializes the audio classifier worker and loads the audio classification model.
 * @returns {Promise<void>}
 */
export function initAudioClassifier() {
  const id = crypto.randomUUID();
  return new Promise((resolve, reject) => {
    classifyCallbacks.set(id, { resolve, reject });
    classifierWorker.postMessage({ id, type: 'init' });
  });
}


/**
 * Classifies an audio file using the audio classification model.
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

async function decodeAndResample(blob) {
  const arrayBuffer = await blob.arrayBuffer()
  const audioCtx = new AudioContext()
  const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

  const targetRate = 16000
  const offlineCtx = new OfflineAudioContext(1, Math.ceil(audioBuffer.duration * targetRate), targetRate)

  const buffer = offlineCtx.createBuffer(1, audioBuffer.length, audioBuffer.sampleRate)
  const channelData = buffer.getChannelData(0)
  for (let c = 0; c < audioBuffer.numberOfChannels; c++) {
    const data = audioBuffer.getChannelData(c)
    for (let i = 0; i < data.length; i++) {
      channelData[i] += data[i] / audioBuffer.numberOfChannels
    }
  }

  const source = offlineCtx.createBufferSource()
  source.buffer = buffer
  source.connect(offlineCtx.destination)
  source.start(0)

  const rendered = await offlineCtx.startRendering()
  return rendered.getChannelData(0)
}

/**
 * Offload audio classification to background worker.
 * @param {Blob} blob
 * @returns {Promise<string[]>}
 */
export async function classifyAudio(input) {
  let monoBuffer;
  if (input instanceof Float32Array) {
    monoBuffer = input;
  } else if (input instanceof Blob) {
    monoBuffer = await decodeFileToMonoPCM(input);
  } else {
    throw new Error('Unsupported input type for classifyAudio');
  }

  const id = crypto.randomUUID()

  return new Promise((resolve, reject) => {
    classifyCallbacks.set(id, { resolve, reject })

    classifierWorker.postMessage(
      { id, monoBuffer },
      [monoBuffer.buffer]
    )
  })
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
 * Generates a human-readable name from a list of tags.
 * @param {string[]} tags
 * @returns {Promise<string>}
 */
export async function generateNameFromTags(tags) {
  await initLLM();

  const prompt = `Tags: ${tags.join(', ')}\nShort Title:`;
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

