import { localML } from './LocalMLService';

// ML Model API Configuration
const ML_API_BASE = import.meta.env.VITE_ML_API_URL || "http://localhost:5000";

const api = {
    recognizeEmotion: async (audioFile) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        return fetch(`${ML_API_BASE}/api/recognize-emotion`, {
            method: 'POST',
            body: formData
        });
    },
    
    recognizeEmotionImage: async (imageBlob) => {
        const formData = new FormData();
        formData.append('file', imageBlob, 'capture.jpg');
        return fetch(`${ML_API_BASE}/api/recognize-emotion-image`, {
            method: 'POST',
            body: formData
        });
    },
    
    generatePlaylist: async (emotion, mood, numSongs = 10) => {
        return fetch(`${ML_API_BASE}/api/generate-playlist`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ emotion, mood, num_songs: numSongs })
        });
    },
    
    analyzeAndGenerate: async (audioFile, numSongs = 10) => {
        const formData = new FormData();
        formData.append('file', audioFile);
        formData.append('num_songs', numSongs);
        return fetch(`${ML_API_BASE}/api/analyze-and-generate`, {
            method: 'POST',
            body: formData
        });
    },
    
    health: async () => {
        return fetch(`${ML_API_BASE}/api/health`);
    }
};

// Configuration
const CONFIG = {
    retryAttempts: 2,
    retryDelay: 1000,
};

// Response cache
class ResponseCache {
    constructor(maxSize = 50, ttl = 3600000) {
        this.cache = new Map();
        this.maxSize = maxSize;
        this.ttl = ttl;
    }

    get(key) {
        const item = this.cache.get(key);
        if (!item) return null;

        if (Date.now() - item.timestamp > this.ttl) {
            this.cache.delete(key);
            return null;
        }

        return item.value;
    }

    set(key, value) {
        if (this.cache.size >= this.maxSize) {
            const oldestKey = this.cache.keys().next().value;
            this.cache.delete(oldestKey);
        }

        this.cache.set(key, {
            value,
            timestamp: Date.now()
        });
    }
}

const playlistCache = new ResponseCache();

// Retry wrapper
const withRetry = async (fn, context, retries = CONFIG.retryAttempts) => {
    for (let i = 0; i <= retries; i++) {
        try {
            return await fn();
        } catch (error) {
            if (i === retries) throw error;
            console.warn(`Retry ${i + 1}/${retries} for ${context}:`, error.message);
            await new Promise(resolve => setTimeout(resolve, CONFIG.retryDelay * (i + 1)));
        }
    }
};

// Fallback playlists for when API is unavailable
const FALLBACK_PLAYLISTS = {
    'calm': [
        { title: "Weightless", artist: "Marconi Union", duration: 480, bpm: 60 },
        { title: "Music for Airports", artist: "Brian Eno", duration: 1260, bpm: 55 },
        { title: "Sunrise", artist: "Ólafur Arnalds", duration: 240, bpm: 65 },
        { title: "Re: Stacks", artist: "Bon Iver", duration: 300, bpm: 70 },
        { title: "Nuvole Bianche", artist: "Ludovico Einaudi", duration: 270, bpm: 68 },
    ],
    'happy': [
        { title: "Walking On Sunshine", artist: "Katrina & The Waves", duration: 240, bpm: 128 },
        { title: "Good As Hell", artist: "Lizzo", duration: 160, bpm: 98 },
        { title: "Levitating", artist: "Dua Lipa", duration: 203, bpm: 103 },
        { title: "Electric Feel", artist: "MGMT", duration: 234, bpm: 105 },
        { title: "Shut Up and Dance", artist: "Walk the Moon", duration: 210, bpm: 115 },
    ],
    'energetic': [
        { title: "Eye of the Tiger", artist: "Survivor", duration: 246, bpm: 108 },
        { title: "Pump It Up", artist: "Endor", duration: 233, bpm: 128 },
        { title: "Kickstart My Heart", artist: "Mötley Crüe", duration: 239, bpm: 112 },
        { title: "We Will Rock You", artist: "Queen", duration: 302, bpm: 78 },
        { title: "Thunderstruck", artist: "AC/DC", duration: 292, bpm: 120 },
    ],
    'uplifting': [
        { title: "Here Comes the Sun", artist: "The Beatles", duration: 185, bpm: 129 },
        { title: "Three Little Birds", artist: "Bob Marley", duration: 181, bpm: 76 },
        { title: "Don't Stop Me Now", artist: "Queen", duration: 236, bpm: 156 },
        { title: "I Will Survive", artist: "Gloria Gaynor", duration: 315, bpm: 117 },
        { title: "Believer", artist: "Imagine Dragons", duration: 204, bpm: 123 },
    ],
};

// Generate playlist from emotion
export const generatePlaylist = async (emotion, numSongs = 10) => {
    try {
        console.log(`🎵 Generating playlist for emotion: ${emotion}`);
        
        const response = await withRetry(async () => {
            return await api.generatePlaylist(emotion, 'mixed', numSongs);
        }, `playlist generation for ${emotion}`);

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const songs = data.songs || [];
        
        if (songs.length > 0) {
            console.log(`✅ Generated playlist with ${songs.length} songs`);
            playlistCache.set(emotion, songs);
            return songs;
        } else {
            throw new Error('No songs in response');
        }
    } catch (error) {
        console.error(`❌ Playlist generation failed:`, error.message);
        console.warn('⚠️ Using fallback playlist');
        const mood = emotion.toLowerCase();
        return FALLBACK_PLAYLISTS[mood] || FALLBACK_PLAYLISTS.happy;
    }
};

// Emotion detection from camera capture (image data URL)
export const detectEmotionFromImage = async (imageData) => {
    console.log("📸 Image Emotion Recognition (IER) via ML Model");
    
    try {
        // Convert data URL to Blob for upload
        const res = await fetch(imageData);
        const blob = await res.blob();

        const response = await withRetry(async () => {
            return await api.recognizeEmotionImage(blob);
        }, 'image emotion detection');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotion = data.predicted_emotion || 'joy';
        
        console.log(`✅ Detected emotion from image: ${emotion}`);
        return emotion;
    } catch (error) {
        console.error(`❌ Image emotion detection failed:`, error.message);
        console.warn('⚠️ Defaulting to joy');
        return 'joy';
    }
};

// Emotion detection from audio file
export const detectEmotionFromAudio = async (audioFile) => {
    console.log('🎤 Audio Emotion Recognition (AER) via Local ML Model');

    try {
        const detectedEmotion = await localML.detectEmotionFromAudio(audioFile);
        console.log(`✅ Local model detected emotion: ${detectedEmotion}`);
        return detectedEmotion;
    } catch (localError) {
        console.warn('Local AER failed:', localError.message || localError);
    }

    try {
        const response = await withRetry(async () => {
            return await api.recognizeEmotion(audioFile);
        }, 'emotion detection');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotion = data.predicted_emotion || 'joy';
        
        console.log(`✅ Remote API detected emotion: ${emotion} (confidence: ${(data.confidence * 100).toFixed(1)}%)`);
        return emotion;
    } catch (error) {
        console.error('❌ Emotion detection failed:', error.message || error);
        console.warn('⚠️ Defaulting to Joy');
        return 'Joy';
    }
};

// Complete analysis pipeline: detect emotion + generate playlist
export const analyzeAndGeneratePlaylist = async (audioFile, numSongs = 10) => {
    console.log("🎵 Starting complete analysis pipeline...");
    
    try {
        const response = await withRetry(async () => {
            return await api.analyzeAndGenerate(audioFile, numSongs);
        }, 'analysis and playlist generation');

        if (!response.ok) {
            throw new Error(`API error: ${response.status}`);
        }

        const data = await response.json();
        const emotionAnalysis = data.emotion_analysis;
        const playlistData = data.playlist;
        
        console.log(`✅ Analysis complete:`);
        console.log(`   - Emotion: ${emotionAnalysis.predicted_emotion}`);
        console.log(`   - Confidence: ${(emotionAnalysis.confidence * 100).toFixed(1)}%`);
        console.log(`   - Playlist songs: ${playlistData.song_count}`);
        
        return {
            emotion: emotionAnalysis.predicted_emotion,
            confidence: emotionAnalysis.confidence,
            playlist: playlistData.songs,
            all_emotions: emotionAnalysis.all_emotions
        };
    } catch (error) {
        console.error(`❌ Pipeline failed:`, error.message);
        throw error;
    }
};

// Health check - verify ML API is running
export const checkMLHealth = async () => {
    try {
        const response = await api.health();
        
        if (response.ok) {
            const data = await response.json();
            return {
                healthy: true,
                message: '✅ ML API is running',
                components: data.components
            };
        } else {
            return {
                healthy: false,
                message: '❌ ML API returned error: ' + response.status,
                error: response.status
            };
        }
    } catch (error) {
        return {
            healthy: false,
            message: `❌ Cannot connect to ML API at ${ML_API_BASE}`,
            error: error.message
        };
    }
};

// Legacy function for backward compatibility
export const checkFoundryHealth = checkMLHealth;
