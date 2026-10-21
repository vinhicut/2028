import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "..", "..", ".."))

# Nạp tự động các biến môi trường từ tệp .env nếu có
ENV_PATH = os.path.join(PROJECT_ROOT, "backend", ".env")
if os.path.exists(ENV_PATH):
    try:
        with open(ENV_PATH, "r", encoding="utf-8-sig") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    key = key.strip()
                    val = val.strip().strip("'\"")
                    if key not in os.environ or not os.environ[key].strip():
                        os.environ[key] = val
    except Exception:
        pass

DATA_DIR = os.path.join(BASE_DIR, "..", "data")
DB_PATH = os.path.join(DATA_DIR, "tuvi.db")
RELEASE_DIR = os.path.join(PROJECT_ROOT, "releases", "dist")
DIST_DIR = os.getenv("DIST_DIR", RELEASE_DIR)
PUBLIC_DIR = os.path.join(PROJECT_ROOT, "frontend", "public")

# Ensure data directory exists
os.makedirs(DATA_DIR, exist_ok=True)

# Firebase Configuration
FIREBASE_PROJECT_ID = os.getenv("FIREBASE_PROJECT_ID", "tu-vi-hong")
FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", os.path.join(PROJECT_ROOT, "security", "keys-and-secrets", "firebase-service-account.json"))

# Google OAuth Configuration
GOOGLE_CLIENT_ID = os.getenv("GOOGLE_CLIENT_ID", "").strip()
GOOGLE_CLIENT_IDS_RAW = os.getenv("GOOGLE_CLIENT_IDS", "")
GOOGLE_CLIENT_IDS = list(dict.fromkeys(
    client_id.strip() for client_id in [GOOGLE_CLIENT_ID, *GOOGLE_CLIENT_IDS_RAW.split(",")]
    if client_id.strip()
))
GOOGLE_CLIENT_SECRET = os.getenv("GOOGLE_CLIENT_SECRET", "")

# Authorized URIs from client_secret + Local Dev URIs
GOOGLE_REDIRECT_URIS = [
    "http://tuvihongan.com/",
    "http://localhost:5173/",
    "http://localhost:8080/",
    "http://127.0.0.1:5173/",
    "http://127.0.0.1:8080/"
]

GOOGLE_JAVASCRIPT_ORIGINS = [
    "http://tuvihongan.com",
    "http://localhost:5173",
    "http://localhost:8080",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:8080"
]

# Manager / Admin email list (comma-separated in env)
MANAGER_EMAILS_RAW = os.getenv(
    "MANAGER_EMAILS",
    "admin@tuvihongan.com,quanly@tuvihongan.com,nguyenvinhvan90@gmail.com",
)
MANAGER_EMAILS = [e.strip().lower() for e in MANAGER_EMAILS_RAW.split(",") if e.strip()]

# Only these accounts receive unrestricted Admin 1 access. Existing manager
# accounts are migrated as Admin 2 until an owner is explicitly configured.
SUPER_ADMIN_EMAILS_RAW = os.getenv("SUPER_ADMIN_EMAILS", "")
SUPER_ADMIN_EMAILS = [e.strip().lower() for e in SUPER_ADMIN_EMAILS_RAW.split(",") if e.strip()]

# Server configuration
HOST = os.getenv("HOST", "0.0.0.0")
PORT = int(os.getenv("PORT", "8080"))
CORS_ORIGIN = os.getenv("CORS_ORIGIN", "*")
SECRET_KEY = os.getenv("SECRET_KEY", "tuvi-hong-an-production-secret-key-2409")
