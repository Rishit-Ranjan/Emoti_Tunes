## EmotiTunes

An intelligent music playlist generator that generates personalized playlists based on your current mood/emotions. Using the power of your camera and Gemini, EmotiTunes curates a unique listening experience by matching songs to your detected emotions.

## 🚀 What it does
Detects emotions from:
camera face capture
microphone voice recording
Generates mood-matching playlists via Google Gemini AI
Supports quick mood selection and search
Saves playlists locally in the user library
Provides offline fallback playlists when AI is unavailable
Uses YouTube and Spotify links for listening

## ✨ Key features
Emotion-driven playlist creation
Camera-based mood detection
Audio emotion recognition
Saved playlists and library view
Search moods, artists, and tracks
Robust fallback mode without Gemini access

## ⚙️ Setup

**Prerequisites:**  Node.js

1. Install dependencies:
'''bash
npm install
'''

2. Create .env.local in the project root with:
'''bash
VITE_GEMINI_API_KEY=YOUR_GEMINI_API_KEY
'''

3. Run locally:
'''bash
npm run dev
'''

## 📝Notes
A working internet connection is required for AI playlist generation and song playback.
If Gemini is unavailable or the API key is missing, EmotiTunes uses curated fallback playlists to keep the experience alive.
Browser permissions are required for camera and microphone access.

## 💡Tip
Use the camera or microphone options for the most immersive mood discovery experience, then explore the generated playlist and save favorites to your library.

**Home page**
<img width="1833" height="910" alt="image" src="https://github.com/user-attachments/assets/90a2c337-610b-4ae7-8a75-698792eb03a5" /><br/><br/>

<img width="1823" height="902" alt="image" src="https://github.com/user-attachments/assets/8b103ec1-bc0a-4370-8075-b4191bbfedc3" /><br/><br/>

**Joy Mood**
<img width="1841" height="911" alt="image" src="https://github.com/user-attachments/assets/4b42ae0b-ec01-4e2f-84d6-a9bf94ce08a0" /><br/><br/>

**Library**
<img width="1840" height="905" alt="image" src="https://github.com/user-attachments/assets/c9dbe233-3be7-4fe5-8b58-646f5962ea28" />
