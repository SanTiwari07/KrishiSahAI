import os
import firebase_admin
from firebase_admin import credentials, auth
from functools import wraps
from flask import request, jsonify

def init_firebase():
    """Initialize Firebase Admin SDK"""
    try:
        if not firebase_admin._apps:
            cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH")
            if cred_path and os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                print("[INFO] Firebase Admin initialized with credentials file.")
            else:
                # Fallback to default credentials (e.g., from environment variables or Google Cloud context)
                # This often works if GOOGLE_APPLICATION_CREDENTIALS is set
                try:
                    firebase_admin.initialize_app()
                    print("[INFO] Firebase Admin initialized with default credentials.")
                except Exception:
                     print("[WARNING] Firebase authentication configuration not found. Auth checks may fail.")
    except Exception as e:
        print(f"[WARNING] Firebase Admin initialization failed: {e}")

def require_auth(f):
    """Decorator to require Firebase ID Token authentication"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        try:
            with open("app_debug.log", "a") as logf:
                logf.write(f"[AUTH] Checking auth for {request.url}\n")
        except:
            pass

        if request.method == 'OPTIONS':
            return jsonify({'status': 'ok'}), 200

        auth_header = request.headers.get('Authorization')
        
        # Development Bypass
        if os.getenv("FLASK_ENV") == "development" and os.getenv("DISABLE_AUTH") == "true":
             request.user = {"uid": "dev_user", "email": "dev@krishi.ai"}
             return f(*args, **kwargs)

        if not auth_header or not auth_header.startswith('Bearer '):
            try:
                with open("app_debug.log", "a") as logf:
                    logf.write(f"[AUTH] Missing header: {auth_header}\n")
            except: pass
            return jsonify({'error': 'Missing or invalid authorization header'}), 401

        token = auth_header.split(' ')[1]
        try:
            # Verify the token
            decoded_token = auth.verify_id_token(token)
            request.user = decoded_token
        except Exception as e:
            print(f"[AUTH] Token verification failed: {e}")
            try:
                with open("app_debug.log", "a") as logf:
                    logf.write(f"[AUTH] Verification failed: {e}\n")
            except: pass
            return jsonify({'error': 'Invalid or expired token'}), 401
            
        return f(*args, **kwargs)
    return decorated_function
