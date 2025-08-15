import * as tf from '@tensorflow/tfjs';

let model = null;
let labels = [];
let loadingPromise = null;

async function loadModelAndLabels() {
  if (model) return;
  if (!loadingPromise) {
    loadingPromise = (async () => {
      await tf.setBackend('cpu');
      model = await tf.loadGraphModel('/models/yamnet-tfjs/model.json');
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
    const prediction = model.predict(inputTensor);

    // tf.GraphModel.predict may return either a tensor or an array of tensors
    const scoresTensor = Array.isArray(prediction) ? prediction[0] : prediction;
    const scores = scoresTensor.arraySync(); // shape [frames, 521]
    const averaged = tf.tensor(scores).mean(0).arraySync(); // shape [521]

    const topTags = Array.from(data)
      .map((score, i) => ({ score, label: labels[i] }))
      .filter(t => t.score > 0.07)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map(t => t.label);
    

    self.postMessage({ id, tags: topTags });
  } catch (err) {
    console.error('[Worker Error]', err);
    self.postMessage({ id, error: err.message });
  }
};
