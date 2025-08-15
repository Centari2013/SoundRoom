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
      labels = text.trim().split('\n').slice(1).map(line => line.split(',')[2]);
    })();
  }
  await loadingPromise;
}

self.onmessage = async (event) => {
  const { id, audioArray, type = 'classify' } = event.data;
  try {
    await loadModelAndLabels();

    if (type === 'init') {
      self.postMessage({ id, status: 'ready' });
      return;
    }

    const input = tf.tensor(audioArray).reshape([1, audioArray.length]);
    const result = model.predict(input);
    const scoresTensor = Array.isArray(result) ? result[0] : result;
    const meanScores = tf.mean(scoresTensor, 0);
    const data = await meanScores.data();

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
