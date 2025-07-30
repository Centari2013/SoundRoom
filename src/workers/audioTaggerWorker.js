// This works because HF Transformers v3 is ESM-compatible
import { pipeline, env } from '@huggingface/transformers'

env.allowLocalModels = true;
env.allowRemoteModels = false;
env.useBrowserCache = true;

let classifier = null
let classifierInitPromise = null;
let labels = []


async function loadModelAndLabels() {
  if (classifier) return Promise.resolve();

  classifierInitPromise = pipeline('zero-shot-audio-classification', 'Xenova/clap-htsat-unfused', {
    local_files_only: true,
    trust_remote_code: true,
    use_cache: true,
    dtype: 'q8'
  }).then(pipelineInstance => {
    classifier = pipelineInstance;
  });


  if (!labels.length) {
    const res = await fetch('/models/labels.json')
    labels = await res.json()
  }
  return classifierInitPromise;
}


self.onmessage = async (event) => {
  const { id, audioArray, type = 'classify' } = event.data

  try {
    if (type === 'init') {
      await loadModelAndLabels();
      self.postMessage({ id, status: 'ready' });
      return;
    }

    const result = await classifier(audioArray, labels)

    const topTags = result
      .filter(t => t.score > 0.07)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(t => t.label)

    self.postMessage({ id, tags: topTags })
  } catch (err) {
    console.error('[Worker Error]', err)
    self.postMessage({ id, error: err.message })
  }
}


