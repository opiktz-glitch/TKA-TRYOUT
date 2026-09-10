import os
from pathlib import Path

from dotenv import load_dotenv


load_dotenv()


# ==========================================
# PATH DATABASE
# ==========================================
# BASE_DIR = folder backend/ ini sendiri (tempat config.py
# berada). Folder "database" sekarang ada DI DALAM backend/,
# bukan lagi sejajar dengan backend/ dan frontend/.
#
#   login/
#   ├── backend/
#   │   ├── config.py      <- file ini
#   │   └── database/      <- file .db dipindahkan ke sini
#   └── frontend/
#
BASE_DIR = Path(__file__).resolve().parent
DATABASE_DIR = BASE_DIR / "database"

# Pastikan foldernya ada (aman dipanggil berkali-kali)
DATABASE_DIR.mkdir(parents=True, exist_ok=True)

DEFAULT_DATABASE_PATH = DATABASE_DIR / "project_tz.db"

# Kalau DATABASE_URL diisi manual di file .env, nilai itu
# yang dipakai. Kalau tidak diisi (atau dihapus dari .env),
# otomatis fallback ke lokasi backend/database/project_tz.db
# di atas.
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    f"sqlite:///{DEFAULT_DATABASE_PATH}"
)


SECRET_KEY = os.getenv(
    "SECRET_KEY"
)


ALGORITHM = os.getenv(
    "ALGORITHM",
    "HS256"
)


ACCESS_TOKEN_EXPIRE_MINUTES = int(
    os.getenv(
        "ACCESS_TOKEN_EXPIRE_MINUTES",
        "60"
    )
)


# ==========================================
# CORS ORIGINS
# ==========================================
# Diambil dari .env, dipisah koma, mis:
#   CORS_ORIGINS=https://tryout.sekolahku.id,https://admin.sekolahku.id
#
# Kalau tidak diisi di .env, fallback ke origin dev lokal
# (Vite default: localhost:5173) supaya `npm run dev` tetap
# jalan tanpa setup tambahan. Saat deploy ke domain asli,
# WAJIB set CORS_ORIGINS di .env server, jangan andalkan
# fallback ini.
CORS_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173"
)

ALLOWED_ORIGINS = [
    origin.strip()
    for origin in CORS_ORIGINS.split(",")
    if origin.strip()
]


if not SECRET_KEY:

    raise ValueError(
        "SECRET_KEY belum diatur di .env"
    )
