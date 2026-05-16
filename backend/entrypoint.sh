#!/bin/sh
set -e

: "${UVICORN_HOST:=0.0.0.0}"
: "${UVICORN_PORT:=8000}"
: "${DB_CONNECT_RETRIES:=30}"
: "${DB_CONNECT_DELAY:=1}"

echo "[backend] Waiting for database…"
python - <<'PY'
import os
import time

import database

retries = int(os.getenv("DB_CONNECT_RETRIES", "30"))
delay = float(os.getenv("DB_CONNECT_DELAY", "1"))

for attempt in range(1, retries + 1):
    if database.test_connection():
        print("[backend] Database connection OK")
        break

    print(f"[backend] Database not ready (attempt {attempt}/{retries}), sleeping {delay}s")
    time.sleep(delay)
else:
    raise SystemExit("[backend] Database not ready after retries")

from models import Base

Base.metadata.create_all(bind=database.engine)
print("[backend] Database schema ensured (create_all)")
PY

echo "[backend] Starting Uvicorn…"
exec uvicorn main:app --host "${UVICORN_HOST}" --port "${UVICORN_PORT}"
