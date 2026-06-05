import * as tf from '@tensorflow/tfjs';

const EMOTION_LABELS = [
    'Joy',
    'Sadness',
    'Anger',
    'Excitement',
    'Melancholy',
    'Peaceful',
    'Joy-Anger',
    'Joy-Surprise',
    'Joy-Excitement',
    'Sad-Anger'
];

class LocalMLService {
    constructor() {
        this.model = null;
        this.initialized = false;
    }

    async init() {
        if (this.initialized) return;

        try {
            this.model = tf.sequential();
            this.model.add(tf.layers.dense({ units: 32, activation: 'relu', inputShape: [3] }));
            this.model.add(tf.layers.dense({ units: 16, activation: 'relu' }));
            this.model.add(tf.layers.dense({ units: EMOTION_LABELS.length, activation: 'softmax' }));

            this.model.compile({
                optimizer: tf.train.adam(0.01),
                loss: 'categoricalCrossentropy',
                metrics: ['accuracy']
            });

            await this.seedModel();
            this.initialized = true;
            console.log('🧠 Local Custom AER model ready');
        } catch (error) {
            console.error('Local ML initialization failed:', error);
        }
    }

    async seedModel() {
        const data = [
            [0.85, 0.75, 0.92], // Joy
            [0.15, 0.25, 0.38], // Sadness
            [0.95, 0.50, 0.25], // Anger
            [0.92, 0.92, 0.78], // Excitement
            [0.35, 0.40, 0.58], // Melancholy
            [0.45, 0.22, 0.88], // Peaceful
            [0.80, 0.65, 0.30], // Joy-Anger
            [0.88, 0.85, 0.70], // Joy-Surprise
            [0.93, 0.80, 0.85], // Joy-Excitement
            [0.30, 0.50, 0.28]  // Sad-Anger
        ];
        const labels = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

        const xs = tf.tensor2d(data);
        const ys = tf.oneHot(tf.tensor1d(labels, 'int32'), EMOTION_LABELS.length);

        await this.model.fit(xs, ys, { epochs: 50, verbose: 0 });
        xs.dispose();
        ys.dispose();
    }

    async extractAudioFeatures(audioBlob) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await audioBlob.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
        const channelData = audioBuffer.getChannelData(0);
        const dataLength = channelData.length;

        const rms = Math.sqrt(channelData.reduce((sum, sample) => sum + sample * sample, 0) / dataLength);
        const normalizedEnergy = Math.min(Math.max(rms * 2, 0), 1);

        const zeroCrossings = channelData.reduce((count, sample, index, array) => {
            if (index === 0) return 0;
            return count + ((sample > 0) !== (array[index - 1] > 0) ? 1 : 0);
        }, 0);
        const zeroCrossRate = zeroCrossings / dataLength;

        let spectralCentroid = 0;
        const windowSize = Math.min(2048, dataLength);
        let magnitudeSum = 0;
        for (let i = 0; i < windowSize; i++) {
            magnitudeSum += Math.abs(channelData[i]);
            spectralCentroid += i * Math.abs(channelData[i]);
        }
        spectralCentroid = magnitudeSum === 0 ? 0 : spectralCentroid / (magnitudeSum * windowSize);

        const segments = 10;
        const segmentSize = Math.max(1, Math.floor(dataLength / segments));
        const energySegments = Array.from({ length: segments }, (_, index) => {
            const start = index * segmentSize;
            const end = Math.min(dataLength, start + segmentSize);
            const segmentRms = Math.sqrt(channelData.slice(start, end).reduce((sum, sample) => sum + sample * sample, 0) / (end - start));
            return segmentRms;
        });
        const meanEnergy = energySegments.reduce((sum, value) => sum + value, 0) / segments;
        const variance = energySegments.reduce((sum, value) => sum + Math.pow(value - meanEnergy, 2), 0) / segments;
        const stability = Math.max(0, 1 - Math.min(variance * 10, 1));

        return {
            avgEnergy: normalizedEnergy,
            avgFreq: zeroCrossRate,
            stability: stability * spectralCentroid
        };
    }

    async detectEmotionFromAudio(audioBlob) {
        await this.init();
        const features = await this.extractAudioFeatures(audioBlob);
        const prediction = this.predict(features);
        return prediction || 'Joy';
    }

    predict(features) {
        if (!this.initialized || !features) return null;

        return tf.tidy(() => {
            const input = tf.tensor2d([[
                features.avgEnergy || 0.5,
                features.avgFreq || 0.2,
                features.stability || 0.5
            ]]);
            const prediction = this.model.predict(input);
            const index = prediction.argMax(1).dataSync()[0];
            return EMOTION_LABELS[index];
        });
    }
}

export const localML = new LocalMLService();