import os
from flask import Flask, request, Response
from flask_cors import CORS
import dashscope
from dashscope.audio.tts_v2 import SpeechSynthesizer
from dotenv import load_dotenv

# Load API key from Vite's .env.local
load_dotenv('.env.local')

api_key = os.environ.get('VITE_DASHSCOPE_API_KEY')
if not api_key:
    # Try alternate name if omitted
    api_key = os.environ.get('DASHSCOPE_API_KEY')

dashscope.api_key = api_key
# Use International endpoint as indicated
dashscope.base_websocket_api_url = 'wss://dashscope-intl.aliyuncs.com/api-ws/v1/inference'

app = Flask(__name__)
CORS(app) # Allow cross-origin if needed

@app.route('/tts', methods=['GET', 'POST'])
def synthesize_speech():
    if request.method == 'POST':
        data = request.json
        text = data.get('text', '')
    else:
        text = request.args.get('q', '')

    if not text:
        return {"error": "No text provided"}, 400

    print(f"Generating audio for text: {text}")

    # Initialize synthesizer for CosyVoice v3 (International)
    synthesizer = SpeechSynthesizer(model="cosyvoice-v3-flash", voice="longanyang")
    
    try:
        # Non-streaming call (blocks until full audio is generated)
        audio = synthesizer.call(text)
        
        # Return binary MP3 data directly to the browser
        return Response(audio, mimetype="audio/mp3")
    except Exception as e:
        print(f"TTS Error: {e}")
        return {"error": str(e)}, 500

if __name__ == '__main__':
    print("Starting CosyVoice TTS Python Server on port 5000...")
    if not dashscope.api_key:
        print("WARNING: VITE_DASHSCOPE_API_KEY is not set in .env.local!")
    app.run(port=5000, debug=True)
