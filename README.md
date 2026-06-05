## EmotiTunes

An intelligent music playlist generator that generates personalized playlists based on your current mood/emotions. Using the power of your camera and Gemini, EmotiTunes curates a unique listening experience by matching songs to your detected emotions.

## 🚀 What it does
1. Detects emotions from:
2. camera face capture
3. microphone voice recording
4. Generates mood-matching playlists via Google Gemini AI
5. Supports quick mood selection and search
6. Saves playlists locally in the user library
7. Provides offline fallback playlists when AI is unavailable
8. Uses YouTube and Spotify links for listening

## ✨ Key features
1. Emotion-driven playlist creation
2. Camera-based mood detection
3. Audio emotion recognition
4. Saved playlists and library view
5. Search moods, artists, and tracks
6. Robust fallback mode without Gemini access

## ⚙️ Setup

**Prerequisites:**  Node.js

1. Clone the repo:
```bash
git clone https://github.com/Rishit-Ranjan/Emoti_Tunes.git
```

2. Install dependencies:
```bash
npm install
```

3. Create .env.local in the project root with:
```env
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
```

4. Run locally:
```bash
npm run dev
```

## 📝Notes
1. A working internet connection is required for AI playlist generation and song playback.
2. If Gemini is unavailable or the API key is missing, EmotiTunes uses curated fallback playlists to keep the experience alive.
3. Browser permissions are required for camera and microphone access.

## 💡Tip
Use the camera or microphone options for the most immersive mood discovery experience, then explore the generated playlist and save favorites to your library.

**Home page**<br/><br/>
<img width="1825" height="910" alt="image" src="https://github.com/user-attachments/assets/90a2c337-610b-4ae7-8a75-698792eb03a5" /><br/><br/>

<img width="1810" height="902" alt="image" src="https://github.com/user-attachments/assets/8b103ec1-bc0a-4370-8075-b4191bbfedc3" /><br/><br/>

**Joy Mood**<br/><br/>
<img width="1800" height="911" alt="image" src="https://github.com/user-attachments/assets/4b42ae0b-ec01-4e2f-84d6-a9bf94ce08a0" /><br/><br/>

**Library**<br/><br/>
<img width="1800" height="905" alt="image" src="https://github.com/user-attachments/assets/c9dbe233-3be7-4fe5-8b58-646f5962ea28" />
