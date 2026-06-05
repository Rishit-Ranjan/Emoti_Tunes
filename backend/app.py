"""Main Flask Application"""

import os
import logging
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from typing import Dict, Tuple

from config import config
from audio_processor import audio_processor
from emotion_model import get_emotion_recognizer
from playlist_generator import playlist_generator

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.config.from_object(config[os.getenv('FLASK_ENV', 'development')])

# Enable CORS
CORS(app, origins=app.config['CORS_ORIGINS'])

# Initialize ML components
emotion_recognizer = get_emotion_recognizer(
    model_path=app.config['EMOTION_MODEL_PATH']
)

@app.before_request
def before_request():
    """Executed before each request"""
    logger.debug(f"{request.method} {request.path}")

@app.after_request
def after_request(response):
    """Executed after each request"""
    response.headers['X-Content-Type-Options'] = 'nosniff'
    response.headers['X-Frame-Options'] = 'SAMEORIGIN'
    response.headers['X-XSS-Protection'] = '1; mode=block'
    return response

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'version': '1.0.0',
        'components': {
            'emotion_model': 'loaded' if emotion_recognizer.is_loaded else 'failed',
            'audio_processor': 'ready',
            'playlist_generator': 'ready'
        }
    }), 200

# ============================================================================
# EMOTION RECOGNITION ENDPOINTS
# ============================================================================

@app.route('/api/recognize-emotion', methods=['POST'])
def recognize_emotion():
    """
    Recognize emotion from uploaded audio file
    
    Request:
        - file: Audio file (mp3, wav, ogg, etc.)
    
    Response:
        - predicted_emotion: Detected emotion
        - confidence: Confidence score (0-1)
        - playlist_mood: Recommended playlist mood
        - all_emotions: Probabilities for all emotions
    """
    try:
        # Validate file upload
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        # Check file size
        file.seek(0, os.SEEK_END)
        file_length = file.tell()
        file.seek(0)
        
        if file_length > app.config['MAX_AUDIO_SIZE']:
            return jsonify({
                'error': f'File too large. Max size: {app.config["MAX_AUDIO_SIZE"] / (1024*1024):.0f}MB'
            }), 413
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        logger.info(f"Processing audio file: {filename}")
        
        # Extract audio features
        features, feature_dict = audio_processor.extract_all_features(file_path)
        
        # Predict emotion
        emotion_result = emotion_recognizer.predict_emotion(features)
        
        # Clean up
        os.remove(file_path)
        
        return jsonify(emotion_result), 200
        
    except Exception as e:
        logger.error(f"Error in emotion recognition: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize-emotion-image', methods=['POST'])
def recognize_emotion_image():
    """
    Recognize emotion from uploaded image file
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400

        # Placeholder logic: In a production environment, you would 
        # integrate a Computer Vision model or Gemini Pro Vision here.
        return jsonify({
            'predicted_emotion': 'joy',
            'confidence': 0.92,
            'playlist_mood': 'happy',
            'all_emotions': {
                'sadness': 0.02, 'joy': 0.92, 'anger': 0.01, 
                'surprise': 0.03, 'excitement': 0.02
            }
        }), 200
    except Exception as e:
        logger.error(f"Error in image recognition: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/recognize-emotion-stream', methods=['POST'])
def recognize_emotion_stream():
    """
    Recognize emotion from audio stream (for real-time processing)
    
    Request:
        - data: Raw audio data
        - format: Audio format (optional)
    """
    try:
        # For production, implement streaming audio processing
        # This would connect to a WebSocket for real-time emotion detection
        
        return jsonify({
            'status': 'streaming_not_implemented',
            'message': 'Use /api/recognize-emotion with file upload for now'
        }), 501
        
    except Exception as e:
        logger.error(f"Error in stream processing: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# PLAYLIST GENERATION ENDPOINTS
# ============================================================================

@app.route('/api/generate-playlist', methods=['POST'])
def generate_playlist():
    """
    Generate playlist based on emotion
    
    Request:
        - emotion: Detected emotion (sadness, joy, anger, surprise, excitement)
        - mood: Playlist mood (calm, happy, energetic, uplifting, mixed)
        - num_songs: Number of songs (default: 10)
    
    Response:
        - emotion: Emotion used
        - mood: Mood category
        - songs: List of songs
        - total_duration: Total playlist duration in seconds
    """
    try:
        data = request.get_json()
        
        if not data:
            return jsonify({'error': 'No JSON data provided'}), 400
        
        emotion = data.get('emotion', '').lower()
        mood = data.get('mood', 'mixed').lower()
        num_songs = min(int(data.get('num_songs', 10)), 50)  # Cap at 50
        
        # Validate inputs
        valid_moods = list(playlist_generator.playlists.keys())
        if mood not in valid_moods:
            return jsonify({
                'error': f'Invalid mood. Valid options: {valid_moods}'
            }), 400
        
        # Generate playlist
        playlist = playlist_generator.generate_playlist(emotion, mood, num_songs)
        
        return jsonify(playlist), 200
        
    except ValueError as e:
        return jsonify({'error': f'Invalid input: {str(e)}'}), 400
    except Exception as e:
        logger.error(f"Error generating playlist: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

@app.route('/api/analyze-and-generate', methods=['POST'])
def analyze_and_generate():
    """
    Complete pipeline: analyze emotion + generate playlist
    
    Request:
        - file: Audio file
        - num_songs: Number of songs (optional)
    
    Response:
        - emotion_analysis: Emotion recognition results
        - playlist: Generated playlist
    """
    try:
        if 'file' not in request.files:
            return jsonify({'error': 'No file provided'}), 400
        
        file = request.files['file']
        num_songs = int(request.form.get('num_songs', 10))
        
        # Save file temporarily
        filename = secure_filename(file.filename)
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(file_path)
        
        logger.info(f"Analyzing and generating for: {filename}")
        
        # Step 1: Extract features
        features, _ = audio_processor.extract_all_features(file_path)
        
        # Step 2: Recognize emotion
        emotion_result = emotion_recognizer.predict_emotion(features)
        
        # Step 3: Generate playlist
        playlist = playlist_generator.generate_playlist(
            emotion=emotion_result['predicted_emotion'],
            mood=emotion_result['playlist_mood'],
            num_songs=num_songs
        )
        
        # Clean up
        os.remove(file_path)
        
        response = {
            'emotion_analysis': emotion_result,
            'playlist': playlist
        }
        
        return jsonify(response), 200
        
    except Exception as e:
        logger.error(f"Error in analysis and generation: {str(e)}", exc_info=True)
        return jsonify({'error': str(e)}), 500

# ============================================================================
# MODEL INFO & CONFIGURATION ENDPOINTS
# ============================================================================

@app.route('/api/model/info', methods=['GET'])
def get_model_info():
    """Get information about the emotion recognition model"""
    try:
        return jsonify(emotion_recognizer.get_model_info()), 200
    except Exception as e:
        logger.error(f"Error getting model info: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlists/info', methods=['GET'])
def get_playlist_info():
    """Get available playlists information"""
    try:
        return jsonify(playlist_generator.get_playlist_info()), 200
    except Exception as e:
        logger.error(f"Error getting playlist info: {str(e)}")
        return jsonify({'error': str(e)}), 500

# ============================================================================
# ERROR HANDLERS
# ============================================================================

@app.errorhandler(400)
def bad_request(error):
    return jsonify({'error': 'Bad request'}), 400

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Endpoint not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ============================================================================
# MAIN
# ============================================================================

if __name__ == '__main__':
    port = int(os.getenv('PORT', 5000))
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    logger.info(f"Starting Emoti_Tunes API server on port {port}")
    logger.info(f"Debug mode: {debug}")
    
    app.run(
        host='0.0.0.0',
        port=port,
        debug=debug,
        use_reloader=debug
    )
