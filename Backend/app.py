
from flask import Flask, jsonify, request, Response
from flask_cors import CORS
from flask_talisman import Talisman
from dotenv import load_dotenv
import os
import sys
import uuid
import json
import asyncio
import traceback
from pathlib import Path
import warnings

os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
os.environ['TF_ENABLE_ONEDNN_OPTS'] = '0'

# Suppress Deprecation and Future warnings in the terminal
warnings.filterwarnings("ignore", category=FutureWarning)
warnings.filterwarnings("ignore", category=UserWarning)

# Load environment variables
load_dotenv()

# Ensure the Backend directory is in the Python path before local imports
sys.path.insert(0, str(Path(__file__).resolve().parent))

from flask_apscheduler import APScheduler
from werkzeug.utils import secure_filename
import pandas as pd
from datetime import datetime
from middleware.auth import init_firebase, require_auth
import firebase_admin



app = Flask(__name__)

# Initialize Firebase before any routes or scheduler tasks invoke it
init_firebase()

# --- Scheduler Setup ---
scheduler = APScheduler()
app.config['SCHEDULER_API_ENABLED'] = True
scheduler.init_app(app)
scheduler.start()


@app.route('/ping')
def ping():
    return jsonify({'status': 'pong'}), 200

@app.before_request
def log_request():
    print(f"Incoming: {request.method} {request.url}")

# CORS Configuration - Must be set BEFORE Talisman
# In development, allow all origins so phone/emulator can access the API
if os.getenv('FLASK_ENV') == 'development':
    CORS(app, resources={r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Bypass-Tunnel-Reminder", "ngrok-skip-browser-warning"],
        "supports_credentials": False  # Must be False when origins='*'
    }})
else:
    allowed_origins = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000,http://localhost:5173').split(',')
    CORS(app, resources={r"/api/*": {
        "origins": allowed_origins,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization", "Bypass-Tunnel-Reminder", "ngrok-skip-browser-warning"],
        "supports_credentials": True
    }})

# Security Headers - Disabled in development to avoid CORS conflicts
# TODO: Re-enable Talisman in production with proper CORS configuration
# Talisman(app, 
#     force_https=False,
#     content_security_policy=None,
#     content_security_policy_nonce_in=['script-src']
# )

# Configuration
BASE_DIR = Path(__file__).resolve().parent
UPLOAD_FOLDER = str(BASE_DIR / 'uploads')
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'bmp'}
MAX_FILE_SIZE = 16 * 1024 * 1024  # 16MB

app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# --- Disease Detector Setup ---
DISEASE_DETECTOR_DIR = Path(__file__).resolve().parent / 'services' / 'DiseaseDetector'
if str(DISEASE_DETECTOR_DIR) not in sys.path:
    sys.path.append(str(DISEASE_DETECTOR_DIR))

from disease_detector import predict as detector_predict, init_model as detector_init

# We will lazy-load the model to speed up server boot
_disease_model_loaded = False

MODEL_FILE = DISEASE_DETECTOR_DIR / 'plant_disease_model.h5'
CSV_PATH = DISEASE_DETECTOR_DIR / 'crop_disease_data.csv'

disease_data = None
def load_disease_data():
    global disease_data
    try:
        if CSV_PATH.exists():
            disease_data = pd.read_csv(str(CSV_PATH))
            print("Disease data CSV loaded successfully")
        else:
            print(f"Warning: CSV file not found at {CSV_PATH}")
    except Exception as e:
        print(f"Error loading disease data: {e}")
load_disease_data()

# --- Pest Detector Setup ---
PEST_DETECTOR_DIR = Path(__file__).resolve().parent / 'services' / 'PestDetector'
if str(PEST_DETECTOR_DIR) not in sys.path:
    sys.path.append(str(PEST_DETECTOR_DIR))

try:
    from pest_detector import predict as pest_predict, init_model as pest_init
    # We will lazy load the pest detection model
    _pest_model_loaded = False
except Exception as e:
    print(f"Warning: Pest detection model imports failed: {e}")
    print("   The /api/pest/detect endpoint will return errors until dependencies are available.")
    pest_predict = None

# --- Business Advisor Setup ---
BUSINESS_ADVISOR_DIR = Path(__file__).resolve().parent / 'services' / 'BusinessAdvisor'
if str(BUSINESS_ADVISOR_DIR) not in sys.path:
    sys.path.append(str(BUSINESS_ADVISOR_DIR))

from krishi_chatbot import KrishiSahAIAdvisor, FarmerProfile
advisor_sessions = {}

# --- Waste To Value Setup ---
WASTE_TO_VALUE_DIR = Path(__file__).resolve().parent / 'services' / 'WasteToValue' / 'src'
if str(WASTE_TO_VALUE_DIR) not in sys.path:
    sys.path.append(str(WASTE_TO_VALUE_DIR))

from waste_service import WasteToValueEngine
waste_engine = None
try:
    print("Initializing Waste-to-Value Engine...")
    waste_engine = WasteToValueEngine()
    print("Waste-to-Value Engine initialized successfully")
except Exception as e:
    print(f"Warning: Waste-to-Value Engine failed to initialize: {e}")
    print("   The /api/waste-to-value endpoints will return errors until Ollama is available.")
    import traceback
    traceback.print_exc()

# --- Farm Health AI Setup ---
FARM_HEALTH_DIR = Path(__file__).resolve().parent / 'services' / 'FarmHealth' / 'src'
if str(FARM_HEALTH_DIR) not in sys.path:
    sys.path.append(str(FARM_HEALTH_DIR))

health_engine = None
try:
    from health_service import FarmHealthEngine
    print("Initializing Farm Health AI Engine...")
    health_engine = FarmHealthEngine()
    print("Farm Health AI Engine initialized successfully")
except Exception as e:
    print(f"Warning: Farm Health AI Engine failed to initialize: {e}")

# --- VoiceText Setup ---
from services.VoiceText.voice_service import voice_service, AUDIO_FOLDER


# --- Utilities ---
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_disease_info(crop_name, disease_name):
    if disease_data is None: return None
    try:
        match = disease_data[
            (disease_data['Crop Name'].str.lower() == crop_name.lower()) &
            (disease_data['Crop Disease'].str.lower() == disease_name.lower())
        ]
        if not match.empty:
            row = match.iloc[0]
            return {
                'crop': row['Crop Name'],
                'disease': row['Crop Disease'],
                'pathogen': row['Pathogen'],
                'home_remedy': row['Home Remedy'],
                'chemical_recommendation': row['Chemical Recommendation']
            }
    except Exception as e:
        print(f"Error getting disease info: {e}")
    return None

def predict_disease(image_path):
    global _disease_model_loaded
    try:
        if not _disease_model_loaded:
            print("Lazy loading Disease Detection model...")
            detector_init()
            _disease_model_loaded = True
        return detector_predict(image_path)
    except Exception as e:
        print(f"Error in prediction: {e}")
        return {
            'crop': 'Unknown',
            'disease': f'Error during detection: {e}',
            'confidence': 0.0,
            'severity': 'low'
        }

@app.route('/api/health')
def health_check():
    health_data = {'status': 'online'}
    
    # 1. GPU Check
    try:
        import tensorflow as tf
        gpus = tf.config.list_physical_devices('GPU')
        health_data['gpu'] = {
            'available': len(gpus) > 0,
            'count': len(gpus),
            'devices': [g.name for g in gpus]
        }
    except Exception as e:
        health_data['gpu'] = {'error': str(e)}

    # 2. Ollama Check
    try:
        import requests
        ollama_url = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
        # Fast timeout check
        resp = requests.get(f"{ollama_url}/api/tags", timeout=2)
        health_data['ollama'] = {
            'status': 'connected' if resp.status_code == 200 else 'error',
            'url': ollama_url
        }
    except Exception as e:
        health_data['ollama'] = {'status': 'disconnected', 'error': str(e)}

    # 3. System Memory (if psutil available)
    try:
        import psutil
        mem = psutil.virtual_memory()
        health_data['memory'] = f"{mem.available / (1024**3):.2f} GB available"
    except ImportError:
        health_data['memory'] = "psutil module not installed"
    except Exception as e:
         health_data['memory'] = str(e)

    return jsonify(health_data)

# --- Disease Detector Routes ---
@app.route('/api/disease/detect', methods=['POST'])
@require_auth
def detect_disease():
    try:
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        filename = secure_filename(file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(image_path)
        
        print(f"[SCAN] Request received: {filename}")
        result = predict_disease(image_path)
        print(f"[SCAN] Result: {result.get('disease')} ({int(result.get('confidence',0)*100)}%)")
        
        disease_info = get_disease_info(result['crop'], result['disease'])
        
        treatment = []
        if disease_info:
            if disease_info['home_remedy'] and disease_info['home_remedy'] != 'N/A':
                treatment.append(disease_info['home_remedy'])
            if disease_info['chemical_recommendation'] and disease_info['chemical_recommendation'] != 'N/A':
                treatment.append(f"Chemical: {disease_info['chemical_recommendation']}")
        else:
            treatment = ['Remove affected leaves', 'Apply fungicide']
            
        try: os.remove(image_path)
        except: pass
        
        return jsonify({
            'success': True,
            'result': {
                'crop': result['crop'],
                'disease': result['disease'],
                'severity': result['severity'],
                'confidence': result['confidence'],
                'treatment': treatment,
                'pathogen': disease_info['pathogen'] if disease_info else None
            }
        })
    except Exception as e:
        print(f"[SCAN] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# --- Pest Detector Routes ---
@app.route('/api/pest/detect', methods=['POST'])
@require_auth
def detect_pest():
    try:
        global _pest_model_loaded
        if not _pest_model_loaded and pest_predict is not None:
            print("Lazy loading Pest Detection model...")
            pest_init()
            _pest_model_loaded = True

        if pest_predict is None:
            return jsonify({'error': 'Pest detection service is currently unavailable'}), 503
            
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        file = request.files['image']
        if file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        if not allowed_file(file.filename):
            return jsonify({'error': 'Invalid file type'}), 400
        
        filename = secure_filename(file.filename)
        image_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(image_path)
        
        print(f"[PEST] Request received: {filename}")
        result = pest_predict(image_path)
        print(f"[PEST] Result: {result.get('pest_name')} ({int(result.get('confidence',0)*100)}%)")
        
        try: os.remove(image_path)
        except: pass
        
        return jsonify({
            'success': True,
            'result': {
                'pest_name': result['pest_name'],
                'confidence': result['confidence'],
                'severity': result['severity'],
                'description': result.get('description', '')
            }
        })
    except Exception as e:
        print(f"[PEST] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# --- Business Advisor Routes ---
@app.route('/api/business-advisor/init', methods=['POST'])
@require_auth
def init_advisor():
    try:
        data = request.json
        name = data.get('name', 'Farmer')
        print(f"[ADVISOR] Init -> Farmer: {name}")
        
        def safe_float(val, default=0.0):
            try:
                return float(val) if val is not None else default
            except (ValueError, TypeError):
                return default

        # 1. Get User Profile from Firestore to enrich context
        user_id = request.user.get('uid')
        firestore_profile = {}
        if user_id:
            try:
                import firebase_admin
                from firebase_admin import firestore
                db = firestore.client()
                user_doc = db.collection('users').document(user_id).get()
                if user_doc.exists:
                    firestore_profile = user_doc.to_dict()
                    print(f"[ADVISOR] Enriched profile from Firestore for UID: {user_id}")
            except Exception as fe:
                print(f"[ADVISOR WARNING] Firestore fetch failed: {fe}")

        # 2. Re-map Firestore fields if they differ from API request names
        # Firestore usually uses camelCase or specific names from the frontend
        def get_val(key, default=None):
            # Priority: Request JSON > Firestore > Default
            return data.get(key, firestore_profile.get(key, firestore_profile.get(key.replace('_', ''), default)))

        profile = FarmerProfile(
            name=get_val('name', 'Farmer'),
            land_size=safe_float(get_val('land_size', get_val('landSize')), 5.0),
            capital=safe_float(get_val('capital'), 100000.0),
            market_access=get_val('market_access', 'moderate'),
            skills=get_val('skills', []),
            risk_level=get_val('risk_level', 'medium'),
            time_availability=get_val('time_availability', 'full-time'),
            experience_years=int(get_val('experience_years', get_val('experience', 0))),
            language=get_val('language', 'english').lower(),
            selling_preference=get_val('selling_preference'),
            recovery_timeline=get_val('recovery_timeline'),
            loss_tolerance=get_val('loss_tolerance'),
            risk_preference=get_val('risk_preference'),
            age=get_val('age'),
            role=get_val('role', 'farmer'),
            state=get_val('state'),
            district=get_val('district'),
            village=get_val('village'),
            soil_type=get_val('soil_type'),
            water_availability=get_val('water_availability'),
            crops_grown=get_val('crops_grown', get_val('cropsGrown', [])),
            land_unit=get_val('land_unit', get_val('landUnit', 'acres')),
            
            # Additional Fields
            current_profit=get_val('current_profit'),
            running_plan=get_val('running_plan'),
            space_type=get_val('space_type', get_val('spaceType')),
            covered_space=get_val('covered_space', get_val('coveredSpace')),
            infra_type=get_val('infra_type', get_val('infraType')),
            electricity=get_val('electricity'),
            animal_handling=get_val('animal_handling'),
            daily_labor=get_val('daily_labor'),
            hands_on_work=get_val('hands_on_work'),
            income_comfort=get_val('income_comfort'),
            main_goal=get_val('main_goal'),
            interests=get_val('interests', []),
            total_land=safe_float(get_val('total_land', get_val('totalLand')), 0.0),
            farm_name=get_val('farm_name', get_val('activeFarmName'))
        )
        
        session_id = str(uuid.uuid4())
        advisor = KrishiSahAIAdvisor(profile)
        advisor_sessions[session_id] = advisor
        
        try:
            recommendations = advisor.generate_recommendations()
        except Exception as rec_err:
             recommendations = advisor._get_fallback_recommendations()
        
        print(f"[ADVISOR] Success -> Session: {session_id[:8]}... ({len(recommendations)} recs)")
        
        return jsonify({
            'success': True,
            'session_id': session_id,
            'recommendations': recommendations,
            'message': 'Business advisor initialized successfully'
        })
    except Exception as e:
        print(f"[ADVISOR] Init Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/business-advisor/chat', methods=['POST'])
@require_auth
def chat_advisor_api():
    try:
        data = request.json
        session_id = data.get('session_id')
        message = data.get('message')
        
        if not session_id or session_id not in advisor_sessions:
            return jsonify({'error': 'Invalid session_id'}), 404
        if not message:
            return jsonify({'error': 'message is required'}), 400
            
        advisor = advisor_sessions[session_id]
        print(f"[ADVISOR] Chat -> Input: \"{message[:50]}...\"")
        response = advisor.chat(message, language=data.get('language'))
        print(f"[ADVISOR] Success -> Output: \"{response[:50]}...\" ({len(response)} chars)")
        
        return jsonify({'success': True, 'response': response})
    except Exception as e:
        print(f"[ADVISOR] Chat Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/business-advisor/chat/stream', methods=['POST'])
@require_auth
def chat_advisor_stream():
    try:
        data = request.json
        session_id = data.get('session_id')
        message = data.get('message')
        
        if not session_id or session_id not in advisor_sessions:
            return jsonify({'error': 'Invalid session_id'}), 400
        if not message:
            return jsonify({'error': 'message is required'}), 400
            
        advisor = advisor_sessions[session_id]
        print(f"[ADVISOR] Stream Chat -> Input: \"{message[:50]}...\"")

        def generate():
            try:
                for chunk in advisor.stream_chat(message, language=data.get('language')):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
                print(f"[ADVISOR] Stream completed for session {session_id[:8]}...")
            except Exception as e:
                print(f"[ADVISOR] Generator Error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = Response(generate(), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response
    except Exception as e:
        print(f"[ADVISOR] Stream Chat Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat/generate-title', methods=['POST'])
@require_auth
def generate_chat_title():
    try:
        data = request.json
        session_id = data.get('session_id')
        
        if not session_id or session_id not in advisor_sessions:
            return jsonify({'error': 'Invalid session_id'}), 404
            
        advisor = advisor_sessions[session_id]
        print(f"[ADVISOR] Generating smart title for session {session_id[:8]}...")
        title = advisor.generate_title()
        print(f"[ADVISOR] Smart Title: \"{title}\"")
        
        return jsonify({'success': True, 'title': title})
    except Exception as e:
        print(f"[ADVISOR] Title Generation Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/business-advisor/integrated-advice', methods=['POST'])
@require_auth
def integrated_advice():
    try:
        data = request.json
        session_id = data.get('session_id')
        disease_result = data.get('disease_result')
        
        if not session_id: 
            return jsonify({'error': 'session_id is required'}), 400
        if session_id not in advisor_sessions: 
            return jsonify({'error': 'Invalid session_id'}), 404
        if not disease_result: 
            return jsonify({'error': 'disease_result is required'}), 400
        
        advisor = advisor_sessions[session_id]
        crop = disease_result.get('crop', 'Unknown')
        disease = disease_result.get('disease', 'Unknown')
        severity = disease_result.get('severity', 'medium')
        
        context_message = f"I have detected {disease} disease in my {crop} crop with {severity} severity."
        print(f"[ADVISOR] Integrated Advice -> Disease: {disease} on {crop}")
        
        response = advisor.chat(context_message, language=data.get('language'))
        print(f"[ADVISOR] Integrated Advice Success")
        
        return jsonify({
            'success': True,
            'response': response,
            'disease_context': {'crop': crop, 'disease': disease, 'severity': severity}
        })
    except Exception as e:
        print(f"[ADVISOR] Integrated Advice Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# --- Waste To Value Routes ---
@app.route('/api/waste-to-value/analyze', methods=['POST'])
@require_auth
def analyze_waste():
    try:
        data = request.json
        crop = data.get('crop')
        language = data.get('language', 'English')
        print(f"[WASTE] Analyze -> Crop: {crop}, Lang: {language}")
        
        if not crop:
            return jsonify({'error': 'Crop name is required'}), 400
        
        if waste_engine is None:
            return jsonify({'error': 'Waste-to-Value service is currently unavailable.'}), 503
        
        result = waste_engine.analyze_waste(crop, language)
        print(f"[WASTE] Success -> Result: {result.get('conclusion', {}).get('title', 'N/A')}")
        
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        print(f"[WASTE] Analyze Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/waste-to-value/chat', methods=['POST'])
@require_auth
def chat_waste_api():
    try:
        data = request.json
        context = data.get('context')
        question = data.get('question')
        language = data.get('language', 'English')
        
        print(f"[WASTE] Chat -> Question: \"{question[:50]}...\"")
        
        if not context or not question:
            return jsonify({'error': 'Context and question are required'}), 400
        
        if waste_engine is None:
            return jsonify({'error': 'Waste-to-Value service is currently unavailable.'}), 503
        
        response = waste_engine.chat_waste(context, question, language)
        print(f"[WASTE] Success -> Response Length: {len(response)} chars")
        
        return jsonify({'success': True, 'response': response})
    except Exception as e:
        print(f"[WASTE] Chat Error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/waste-to-value/chat/stream', methods=['POST'])
@require_auth
def chat_waste_stream():
    try:
        data = request.json
        context = data.get('context')
        question = data.get('question')
        language = data.get('language', 'English')
        
        print(f"[WASTE] Stream Chat -> Question: \"{question[:50]}...\"")
        
        if not context or not question:
            return jsonify({'error': 'Context and question are required'}), 400
        
        if waste_engine is None:
            return jsonify({'error': 'Waste-to-Value service is currently unavailable.'}), 503
        
        def generate():
            try:
                for chunk in waste_engine.stream_chat_waste(context, question, language):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                print(f"[WASTE] Generator Error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
        
        response = Response(generate(), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response
    except Exception as e:
        print(f"[WASTE] Stream Chat Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- Farm Health AI Routes ---
@app.route('/api/farm-health/analyze', methods=['POST'])
@require_auth
def analyze_farm_health():
    try:
        data = request.json
        crop = data.get('crop')
        soil_data = data.get('soil_data', {})
        language = data.get('language', 'English')
        location = data.get('location', 'Unknown Region, India')
        soil_type = data.get('soil_type', 'Unknown Soil Type')
        
        print(f"[FARM_HEALTH] Analyze -> Crop: {crop}, Loc: {location}, Soil: {soil_type}, Lang: {language}")
        
        if not crop:
            return jsonify({'error': 'Crop name is required'}), 400
            
        if health_engine is None:
            return jsonify({'error': 'Farm Health AI Engine is currently unavailable.'}), 503
            
        result = health_engine.analyze_health(crop, soil_data, location, soil_type, language)
        print(f"[FARM_HEALTH] Success -> recommendation generated")
        
        return jsonify({'success': True, 'result': result})
    except Exception as e:
        print(f"[FARM_HEALTH] Analyze Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/farm-health/chat/stream', methods=['POST'])
@require_auth
def chat_health_stream():
    try:
        data = request.json
        context = data.get('context')
        question = data.get('question')
        language = data.get('language', 'English')
        
        print(f"[FARM_HEALTH] Stream Chat -> Question: \"{question[:50]}...\"")
        
        if not context or not question:
            return jsonify({'error': 'Context and question are required'}), 400
            
        if health_engine is None:
            return jsonify({'error': 'Farm Health AI service is currently unavailable.'}), 503
            
        def generate():
            try:
                for chunk in health_engine.stream_chat_health(context, question, language):
                    yield f"data: {json.dumps({'chunk': chunk})}\n\n"
            except Exception as e:
                print(f"[FARM_HEALTH] Generator Error: {e}")
                yield f"data: {json.dumps({'error': str(e)})}\n\n"
                
        response = Response(generate(), mimetype='text/event-stream')
        response.headers['Cache-Control'] = 'no-cache'
        response.headers['X-Accel-Buffering'] = 'no'
        response.headers['Connection'] = 'keep-alive'
        return response
    except Exception as e:
        print(f"[FARM_HEALTH] Stream Chat Error: {e}")
        return jsonify({'error': str(e)}), 500

# --- 5-10 Year Roadmap Routes ---
# Lazy load to avoid circular dependencies if any
from services.FiveToTenYear.roadmap_service import SustainabilityRoadmapGenerator
roadmap_generator = SustainabilityRoadmapGenerator()

from services.Planner.planner_service import CropPlannerGenerator
crop_planner_generator = CropPlannerGenerator()

@app.route('/api/generate-roadmap', methods=['POST'])
@require_auth
def generate_roadmap():
    try:
        data = request.json
        user_id = request.user.get('uid') # Extracted from token by require_auth decorator
        
        # If testing with bypass, we might not have uid in token, fallback to body or error
        if not user_id and os.getenv("FLASK_ENV") == "development":
             user_id = data.get('user_id', 'test_user')

        business_name = data.get('business_name') or data.get('selected_business_name')
        language = data.get('language', 'en')
        
        if not business_name:
            return jsonify({'error': 'Business name is required'}), 400
            
        print(f"[ROADMAP] Generating for User: {user_id}, Business: {business_name}, Language: {language}")
        
        roadmap = roadmap_generator.generate_roadmap(user_id, business_name, language)
        
        return jsonify({'success': True, 'roadmap': roadmap})

    except Exception as e:
        print(f"[ROADMAP] Generation Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/generate-crop-roadmap', methods=['POST'])
@require_auth
def generate_crop_roadmap():
    try:
        data = request.json
        user_id = request.user.get('uid')
        
        if not user_id and os.getenv("FLASK_ENV") == "development":
             user_id = data.get('user_id', 'test_user')

        crop_name = data.get('crop_name')
        language = data.get('language', 'en')
        
        if not crop_name:
            return jsonify({'error': 'Crop name is required'}), 400
            
        print(f"[CROP-ROADMAP] Generating for User: {user_id}, Crop: {crop_name}, Language: {language}")
        
        import firebase_admin
        from firebase_admin import firestore
        
        db = None
        doc_ref = None
        try:
            db = firestore.client()
            plan_id = f"{crop_name}_{language}"
            doc_ref = db.collection('users').document(user_id).collection('crop_plans').document(plan_id)
            
            doc = doc_ref.get()
            if doc.exists:
                print(f"[CROP-ROADMAP] Returning existing plan for {crop_name} in {language}")
                return jsonify({'success': True, 'roadmap': doc.to_dict().get('roadmap')})
        except Exception as e:
            print(f"[CROP-ROADMAP WARNING] Firestore not available: {e}")
            
        roadmap = crop_planner_generator.generate_crop_roadmap(user_id, crop_name, language)
        
        if db and doc_ref and roadmap and roadmap.get('verdict') != 'Error' and not roadmap.get('overview', '').startswith('Error'):
            try:
                doc_ref.set({'roadmap': roadmap, 'created_at': firestore.SERVER_TIMESTAMP})
                print(f"[CROP-ROADMAP] Saved new plan for {crop_name} in {language}")
            except Exception as e:
                print(f"[CROP-ROADMAP WARNING] Failed to save plan: {e}")
        
        return jsonify({'success': True, 'roadmap': roadmap})

    except Exception as e:
        print(f"[CROP-ROADMAP] Generation Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


# --- Weather & News Services ---
from services.WeatherNewsIntegration.weather_service import WeatherService
from services.WeatherNewsIntegration.news_service import NewsService
from services.WeatherNewsIntegration.src.agri_pro.agent import AgriAgent

weather_service = WeatherService()
news_service = NewsService()
agri_agent = AgriAgent()

# --- Pest & Disease Forecaster Setup ---
forecaster = None
try:
    from services.PestDiseaseForecaster.forecaster_service import PestDiseaseForecaster
    print("Initializing Pest & Disease Forecaster...")
    forecaster = PestDiseaseForecaster()
    print("Pest & Disease Forecaster initialized successfully")
except Exception as e:
    print(f"Warning: Pest & Disease Forecaster failed to initialize: {e}")
    traceback.print_exc()

@app.route('/api/news/general', methods=['GET', 'OPTIONS'])
def get_general_news():
    """
    Fetch general agriculture news for India.
    No authentication required as this is public news.
    """
    try:
        print(f"[NEWS] General Intelligence - Fetching broad agriculture news")
        
        # For general news, we use a default profile or simplified agent logic
        # For now, let's use the NewsService directly as it was, or adapt AgriAgent
        # Since AgriAgent needs a profile, we'll give it a generic one for national level
        generic_profile = {
            "name": "Indian Farmer",
            "location": {"district": "", "state": "India"},
            "crops": ["Agriculture"], # Broad category
            "soil_type": "Various",
            "market_access": "Multiple",
            "farming_stage": "Various"
        }

        # Async call wrapper
        import asyncio
        advisory = asyncio.run(agri_agent.generate_advisory(generic_profile, mode='general'))
        
        if isinstance(advisory, dict) and 'error' in advisory:
            return jsonify({'success': False, 'error': advisory['error']}), 500
        
        return jsonify({
            'success': True, 
            'news': advisory.get('relevant_agri_news', []),
            'weather_summary': advisory.get('weather_summary'),
            'weather_alerts': advisory.get('weather_alerts')
        })
    except Exception as e:
        print(f"[NEWS] General Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/news/<user_id>', methods=['GET', 'OPTIONS'])
@require_auth
def get_personalized_news(user_id):
    try:
        # Verify user_id matches token (optional, but good practice)
        if request.user.get('uid') != user_id and os.getenv("FLASK_ENV") != "development":
             return jsonify({'error': 'Unauthorized access to this user profile'}), 403

        # Fetch user profile from Firebase to get crops/location
        crops = []
        location = "India"
        
        user_doc = None
        user_data = {}
        try:
            import firebase_admin
            from firebase_admin import firestore
            db = firestore.client()
            user_doc = db.collection('users').document(user_id).get()
            
            if user_doc and user_doc.exists:
                user_data = user_doc.to_dict()
                # Frontend uses 'crops_grown' from the UserProfile interface
                crops = user_data.get('crops_grown') or user_data.get('mainCrops') or user_data.get('crops', [])
                
                # Construct best possible location string
                district = user_data.get('district')
                state = user_data.get('state')
                
                if district and state:
                   location = f"{district}, {state}"
                elif state:
                   location = state
                elif district:
                   location = district
                else:
                   location = user_data.get('location') or "India"
            else:
                print(f"[NEWS] User {user_id} not found in Firestore. Falling back to general news.")
                return get_general_news()
        except Exception as db_err:
            print(f"[NEWS] Firestore Error (Falling back to general news): {db_err}")
            return get_general_news()
            
        print(f"[NEWS] Personalized Intelligence - Fetching for {user_id} (Crops: {crops}, Loc: {location})")
        
        # Construct farmer profile for AgriAgent
        farmer_profile = user_data if (user_doc and user_doc.exists) else {
            "name": "Farmer",
            "location": {"district": "Unknown", "state": "India"},
            "crops": crops,
            "soil_type": "Unknown",
            "market_access": "Unknown",
            "farming_stage": "Unknown"
        }

        # Async call wrapper
        import asyncio
        advisory = asyncio.run(agri_agent.generate_advisory(farmer_profile))
        
        if isinstance(advisory, dict) and 'error' in advisory:
            print(f"[NEWS] AgriAgent failed. Falling back to general news.")
            return get_general_news()
        
        # Return the relevant news from the advisory, plus the metadata
        return jsonify({
            'success': True,
            'news': advisory.get('relevant_agri_news', []),
            'weather_summary': advisory.get('weather_summary'),
            'weather_alerts': advisory.get('weather_alerts'),
            'advice': advisory.get('personalized_advice', []),
            "next_actions": advisory.get('next_actions_for_farmer', [])
        })
    except Exception as e:
        print(f"[NEWS] Unexpected Error: {e}")
        import traceback
        traceback.print_exc()
        return get_general_news()

# --- VoiceText Routes ---
from flask import send_from_directory

@app.route('/uploads/audio/<filename>')
def uploaded_audio(filename):
    return send_from_directory(AUDIO_FOLDER, filename)

@app.route('/api/voice/stt', methods=['POST'])
@require_auth
def speech_to_text():
    try:
        with open("app_debug.log", "a", encoding='utf-8') as f:
            f.write(f"\n[STT] Request received at {datetime.now()}\n")

        if 'audio' not in request.files:
            with open("app_debug.log", "a", encoding='utf-8') as f: f.write("[STT] No audio file provided\n")
            return jsonify({'error': 'No audio file provided'}), 400
            
        file = request.files['audio']
        if file.filename == '':
            with open("app_debug.log", "a", encoding='utf-8') as f: f.write("[STT] No file selected\n")
            return jsonify({'error': 'No file selected'}), 400
            
        # Save temporarily
        filename = f"stt_{uuid.uuid4()}.wav"
        
        # Ensure AUDIO_FOLDER is a string
        audio_folder_str = str(AUDIO_FOLDER)
        filepath = os.path.join(audio_folder_str, filename)
        
        with open("app_debug.log", "a", encoding='utf-8') as f:
            f.write(f"[STT] Saving file to: {filepath}\n")
            
        file.save(filepath)
        
        with open("app_debug.log", "a", encoding='utf-8') as f: f.write("[STT] File saved, calling transcribe...\n")
        
        result = voice_service.transcribe(filepath)
        
        with open("app_debug.log", "a", encoding='utf-8') as f: f.write(f"[STT] Transcription result: {result}\n")
        
        # Cleanup
        try:
            os.remove(filepath)
        except:
            pass
            
        if 'error' in result:
             return jsonify(result), 500
             
        return jsonify({'success': True, 'text': result['text']})
        
    except Exception as e:
        error_msg = f"[STT] Route Error: {str(e)}"
        print(error_msg)
        try:
            with open("app_debug.log", "a", encoding='utf-8') as f:
                import traceback
                f.write(f"{error_msg}\n")
                f.write(traceback.format_exc())
        except:
            pass
        return jsonify({'error': str(e)}), 500

@app.route('/api/voice/tts', methods=['POST'])
@require_auth
def text_to_speech():
    try:
        data = request.json
        text = data.get('text')
        language = data.get('language', 'en')
        
        if not text:
            return jsonify({'error': 'Text is required'}), 400
            
        result = voice_service.text_to_speech(text, language)
        
        if 'error' in result:
             return jsonify(result), 500
             
        # Result contains audio_url which points to /uploads/audio/...
        return jsonify({'success': True, 'audio_url': result['audio_url']})
        
    except Exception as e:
        print(f"TTS Route Error: {e}")
        return jsonify({'error': str(e)}), 500


# --- PDF Generation Route ---
from services.pdfGeneration.pdf_service import generate_chat_pdf, generate_roadmap_pdf
from flask import send_file

@app.route('/api/generate-pdf', methods=['POST'])
@require_auth
def generate_pdf():
    """Generate PDF from chat conversation"""
    try:
        data = request.json
        user_id = data.get('userId')
        chat_id = data.get('chatId')
        
        # Verify user_id matches token
        if request.user.get('uid') != user_id and os.getenv("FLASK_ENV") != "development":
            return jsonify({'success': False, 'error': 'Unauthorized access'}), 403

            
        pdf_buffer = generate_chat_pdf(user_id, chat_id)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"KrishiSahAI_Advisory_{chat_id[:8]}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"[PDF] Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/generate-roadmap-pdf', methods=['POST'])
@require_auth
def generate_roadmap_pdf_route():
    """Generate PDF for Roadmap"""
    try:
        data = request.json
        roadmap = data.get('roadmap')
        business_name = data.get('businessName', 'My Business')
        
        if not roadmap:
            return jsonify({'success': False, 'error': 'Missing roadmap data'}), 400
            
        print(f"[PDF] Generating Roadmap PDF for {business_name}")
        pdf_buffer = generate_roadmap_pdf(roadmap, business_name)
        
        return send_file(
            pdf_buffer,
            as_attachment=True,
            download_name=f"KrishiSahAI_Roadmap_{business_name.replace(' ', '_')}.pdf",
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"[PDF] Roadmap Error: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500



@app.route('/api/weather/current', methods=['GET', 'OPTIONS'])
@require_auth
def get_current_weather():
    try:
        location = request.args.get('location', 'India')
        import asyncio
        weather = asyncio.run(weather_service.get_weather(location))
        return jsonify({'success': True, 'weather': weather})
    except Exception as e:
        print(f"[WEATHER] Error: {e}")
        return jsonify({'error': str(e)}), 500


# ──────────────────────────────────────────────────────────────────────────────
# Pest & Disease Forecasting Routes
# ──────────────────────────────────────────────────────────────────────────────

_forecast_cache = {}
_forecast_cache_date = None

@app.route('/api/forecast/predict', methods=['POST', 'OPTIONS'])
@require_auth
def forecast_predict():
    """Main forecasting endpoint — returns multi-day risk predictions."""
    if not forecaster:
        return jsonify({'success': False, 'error': 'Forecasting service not available'}), 503
    try:
        data = request.get_json()
        crop_name = data.get('crop', '')
        location = data.get('location', 'Pune')
        soil_type = data.get('soil_type', 'Unknown')
        sowing_date = data.get('sowing_date')  # YYYY-MM-DD or None
        language = data.get('language', 'en')

        if not crop_name:
            return jsonify({'success': False, 'error': 'Crop name is required'}), 400

        global _forecast_cache, _forecast_cache_date
        current_date = datetime.now().date()
        if current_date != _forecast_cache_date:
            _forecast_cache.clear()
            _forecast_cache_date = current_date

        cache_key = f"{crop_name}_{location}_{soil_type}_{sowing_date}_{language}"
        if cache_key in _forecast_cache:
            print(f"[FORECAST] Returning cached prediction for {cache_key}")
            return jsonify({'success': True, 'forecast': _forecast_cache[cache_key]})

        # Fetch extended weather forecast
        weather_forecast = asyncio.run(
            weather_service.get_forecast_for_prediction(location, days=3)
        )

        if isinstance(weather_forecast, dict) and 'error' in weather_forecast:
            return jsonify({'success': False, 'error': f"Weather data unavailable: {weather_forecast['error']}"}), 502

        # Run prediction
        result = forecaster.predict_risk(
            crop_name=crop_name,
            location=location,
            soil_type=soil_type,
            sowing_date=sowing_date,
            weather_forecast=weather_forecast,
            language=language,
        )

        _forecast_cache[cache_key] = result

        return jsonify({'success': True, 'forecast': result})
    except Exception as e:
        print(f"[FORECAST] Prediction error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/forecast/pest-calendar', methods=['GET', 'OPTIONS'])
@require_auth
def forecast_pest_calendar():
    """Get pest calendar entries for a crop and optional month."""
    if not forecaster:
        return jsonify({'success': False, 'error': 'Forecasting service not available'}), 503
    try:
        from services.PestDiseaseForecaster.pest_calendar import get_pest_calendar
        crop = request.args.get('crop', '')
        month = request.args.get('month')

        if not crop:
            return jsonify({'success': False, 'error': 'Crop name is required'}), 400

        month_int = int(month) if month else None
        entries = get_pest_calendar(crop, month_int)
        return jsonify({'success': True, 'calendar': entries, 'crop': crop})
    except Exception as e:
        print(f"[FORECAST] Pest calendar error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/forecast/ipm-advisory', methods=['POST', 'OPTIONS'])
@require_auth
def forecast_ipm_advisory():
    """Stream a detailed IPM advisory via SSE."""
    if not forecaster:
        return jsonify({'success': False, 'error': 'Forecasting service not available'}), 503
    try:
        data = request.get_json()
        crop_name = data.get('crop', '')
        location = data.get('location', 'Pune')
        soil_type = data.get('soil_type', 'Unknown')
        sowing_date = data.get('sowing_date')
        language = data.get('language', 'en')

        if not crop_name:
            return jsonify({'success': False, 'error': 'Crop name is required'}), 400

        # Fetch weather
        weather_forecast = asyncio.run(
            weather_service.get_forecast_for_prediction(location, days=3)
        )
        if isinstance(weather_forecast, dict) and 'error' in weather_forecast:
            weather_forecast = []  # Proceed without weather

        def generate():
            for chunk in forecaster.stream_ipm_advisory(
                crop_name=crop_name,
                location=location,
                soil_type=soil_type,
                sowing_date=sowing_date,
                weather_forecast=weather_forecast,
                language=language,
            ):
                yield f"data: {json.dumps({'text': chunk})}\n\n"
            yield f"data: {json.dumps({'done': True})}\n\n"

        return Response(
            generate(),
            mimetype='text/event-stream',
            headers={'Cache-Control': 'no-cache', 'X-Accel-Buffering': 'no'}
        )
    except Exception as e:
        print(f"[FORECAST] IPM advisory error: {e}")
        traceback.print_exc()
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/forecast/phase', methods=['GET', 'OPTIONS'])
@require_auth
def forecast_crop_phase():
    """Detect the current crop growth phase from sowing date."""
    if not forecaster:
        return jsonify({'success': False, 'error': 'Forecasting service not available'}), 503
    try:
        crop = request.args.get('crop', '')
        sowing_date = request.args.get('sowing_date')

        if not crop:
            return jsonify({'success': False, 'error': 'Crop name is required'}), 400

        phase_info = forecaster.get_phase_info(crop, sowing_date)
        return jsonify({'success': True, 'phase': phase_info})
    except Exception as e:
        print(f"[FORECAST] Phase detection error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500


if __name__ == '__main__':
    print("Starting KrishiSahAI backend server...")
    port = int(os.environ.get('PORT', 5000))
    # Set debug=False in production. In development, FLASK_ENV=development enables helpful errors.
    debug_mode = os.getenv('FLASK_ENV') == 'development'
    app.run(debug=debug_mode, host='0.0.0.0', port=port, use_reloader=debug_mode, threaded=True)
