import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-wasm';

async function initBackend() {
  const backends = ['webgl', 'wasm', 'cpu'];
  for (const name of backends) {
    if (tf.findBackend(name)) {
      await tf.setBackend(name);
      await tf.ready();
      if (tf.getBackend() === name) return name;
    }
  }
  return tf.getBackend();
}

let model = null;
let labels = [];
let loadingPromise = null;

async function loadModelAndLabels() {
  if (model) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      await initBackend();
      model = await tf.loadGraphModel('/models/yamnet-tfjs/model.json');

      // Warm up and JIT compile the model
      try {
        const warmup = tf.zeros([16000], 'float32');
        const result = model.predict(warmup);

        // Ensure the prediction actually runs and dispose all tensors
        if (Array.isArray(result)) {
          await Promise.all(result.map(t => t.data()));
          result.forEach(t => t.dispose());
        } else if (result instanceof tf.Tensor) {
          await result.data();
          result.dispose();
        } else if (result && typeof result === 'object') {
          const tensors = Object.values(result);
          await Promise.all(tensors.map(t => t.data()));
          tensors.forEach(t => t.dispose());
        }

        warmup.dispose();
      } catch (e) {
        console.warn('Warmup failed', e);
      }

      const res = await fetch('/models/yamnet-tfjs/yamnet_class_map.csv');
      const text = await res.text();

      labels = text
        .split('\n')
        .slice(1)
        .map(line => line.split(',')[2]?.replace(/"/g, '').trim())
        .filter(Boolean);
    })();
  }
  await loadingPromise;
}

self.onmessage = async (event) => {
  const { id, monoBuffer, type = 'classify' } = event.data;
  try {
    await loadModelAndLabels();

    if (type === 'init') {
      self.postMessage({ id, status: 'ready' });
      return;
    }
    const inputTensor = tf.tensor(monoBuffer, [monoBuffer.length], 'float32');

    const { values, indices } = tf.tidy(() => {
      const prediction = model.predict(inputTensor);
      let scoresTensor;
      if (Array.isArray(prediction)) {
        scoresTensor = prediction[0];
      } else if (prediction instanceof tf.Tensor) {
        scoresTensor = prediction;
      } else {
        const first = Object.values(prediction)[0];
        scoresTensor = first;
      }
      const averaged = scoresTensor.mean(0);
      return tf.topk(averaged, 5);
    });

    const [vals, idxs] = await Promise.all([values.data(), indices.data()]);
    values.dispose();
    indices.dispose();
    inputTensor.dispose();

    const topTags = [];
    for (let i = 0; i < idxs.length; i++) {
      if (vals[i] > 0.07) topTags.push(labels[idxs[i]]);
    }

    self.postMessage({ id, tags: topTags });
  } catch (err) {
    console.error('[Worker Error]', err);
    self.postMessage({ id, error: err.message });
  }
};
