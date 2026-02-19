
import os
import uuid
import threading
from pathlib import Path
from flask import jsonify

# Configure paths
BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_FOLDER = BASE_DIR / 'uploads'
AUDIO_FOLDER = BASE_DIR / 'uploads' / 'audio'
os.makedirs(AUDIO_FOLDER, exist_ok=True)

# Try imports
try:
    import whisper
    WHISPER_AVAILABLE = True
    # Load model lazily to avoid startup delay
    whisper_model = None
except ImportError:
    WHISPER_AVAILABLE = False
    print("Warning: 'openai-whisper' not installed. STT will not work.")

try:
    from gtts import gTTS
    TTS_AVAILABLE = True
except ImportError:
    TTS_AVAILABLE = False
    print("Warning: 'gTTS' not installed. TTS will not work.")


class VoiceService:
    def __init__(self):
        self.model = None

    def _log(self, message):
        try:
            with open("stt_debug.log", "a", encoding='utf-8') as f:
                f.write(f"{message}\n")
        except:
            print(message)

    def _load_model(self):
        self._log("Loading model...")
        if not WHISPER_AVAILABLE:
            self._log("Whisper not installed!")
            raise ImportError("Whisper is not installed")
        
        if self.model is None:
            self._log("Model is None, loading base model...")
            try:
                # Use 'base' model for balance of speed/accuracy
                import whisper
                self.model = whisper.load_model("base") 
                self._log("Whisper model loaded successfully.")
            except Exception as e:
                self._log(f"Error loading whisper model: {e}")
                import traceback
                self._log(traceback.format_exc())
                raise e

    def transcribe(self, file_path):
        """Transcribe audio file to text"""
        self._log(f"Transcribing file: {file_path}")
        
        if not os.path.exists(file_path):
            self._log(f"Error: File not found: {file_path}")
            return {"error": "Audio file lost during processing"}

        file_size = os.path.getsize(file_path)
        self._log(f"File size: {file_size} bytes")
        
        if file_size == 0:
            self._log("Error: Empty audio file received")
            return {"error": "Empty audio recording. Please speak into the microphone."}

        if not WHISPER_AVAILABLE:
            self._log("Whisper not available in transcribe()")
            return {"error": "STT service unavailable (missing dependency)"}
        
        try:
            self._load_model()
            # whisper supports many formats, but let's be explicit
            result = self.model.transcribe(str(file_path), fp16=False) # fp16=False for CPU stability
            text = result["text"].strip()
            self._log(f"Transcription success: {text[:50]}...")
            return {"text": text}
        except Exception as e:
            self._log(f"Transcription error: {e}")
            import traceback
            self._log(traceback.format_exc())
            return {"error": str(e)}

    def text_to_speech(self, text, language='en'):
        """Convert text to speech audio file"""
        if not TTS_AVAILABLE:
            return {"error": "TTS service unavailable (missing dependency)"}
            
        try:
            # Map language codes if necessary
            lang_map = {'en': 'en', 'hi': 'hi', 'mr': 'mr'} # gTTS supports hi, mr
            lang = lang_map.get(language, 'en')
            
            filename = f"tts_{uuid.uuid4()}.mp3"
            filepath = AUDIO_FOLDER / filename
            
            tts = gTTS(text=text, lang=lang, slow=False)
            tts.save(filepath)
            
            # Return relative path for frontend to fetch
            return {"audio_url": f"/uploads/audio/{filename}", "filepath": str(filepath)}
            
        except Exception as e:
            print(f"TTS error: {e}")
            return {"error": str(e)}

# Singleton instance
voice_service = VoiceService()
