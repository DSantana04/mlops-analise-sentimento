#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

PORT="${PORT:-8000}"
HOST="${HOST:-0.0.0.0}"

echo "Sincronizando dependências..."
uv sync
echo "OQSente? disponível em http://localhost:${PORT}"
exec uv run uvicorn main:app --app-dir ends/backend --host "$HOST" --port "$PORT" --reload