#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

if ! command -v cloudflared >/dev/null 2>&1; then
  echo "cloudflared tidak ditemukan. Install dulu: brew install cloudflared"
  exit 1
fi

port_in_use() { nc -z 127.0.0.1 "$1" >/dev/null 2>&1; }

pick_port() {
  local start="$1"
  if ! port_in_use "$start"; then echo "$start"; return; fi
  for ((p = start + 1; p <= start + 9; p++)); do
    if ! port_in_use "$p"; then echo "$p"; return; fi
  done
  echo "$start"
}

PORT_FRONTEND="$(pick_port "${PORT_FRONTEND:-5173}")"
PORT_BACKEND="$(pick_port "${PORT_BACKEND:-8000}")"

pids=()
TUNNEL_LOG=""
cleanup() {
  echo ""
  echo ">> Menghentikan (frontend, backend, tunnel)..."
  for pid in "${pids[@]:-}"; do
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  [ -n "${TUNNEL_LOG:-}" ] && rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT

if [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  BACKEND_PY="$BACKEND_DIR/.venv/bin/python"
else
  BACKEND_PY="python"
fi

echo "================================================================"
echo "  Anevision — Start"
echo "  Frontend : http://localhost:$PORT_FRONTEND"
echo "  Backend  : http://localhost:$PORT_BACKEND"
echo "================================================================"

echo ">> Menjalankan backend (uvicorn)..."
(cd "$BACKEND_DIR" && exec "$BACKEND_PY" -m uvicorn main:app --host 0.0.0.0 --port "$PORT_BACKEND") &
pids+=($!)

echo ">> Menjalankan frontend (vite)..."
(cd "$FRONTEND_DIR" && VITE_PROXY_TARGET="http://localhost:$PORT_BACKEND" exec npm run dev -- --port "$PORT_FRONTEND" --strictPort) &
pids+=($!)

echo ">> Menunggu frontend siap..."
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT_FRONTEND" 2>/dev/null; then break; fi
  sleep 1
done

echo ">> Menunggu backend siap..."
for _ in $(seq 1 30); do
  if curl -s -o /dev/null "http://localhost:$PORT_BACKEND/health" 2>/dev/null; then break; fi
  sleep 1
done

TUNNEL_LOG="$(mktemp)"
echo ">> Menjalankan Cloudflare Tunnel..."
cloudflared tunnel --url "http://localhost:$PORT_FRONTEND" >"$TUNNEL_LOG" 2>&1 &
pids+=($!)

echo ">> Mencari URL tunnel..."
TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL="$(grep -oE 'https://[a-zA-Z0-9.-]+\.trycloudflare\.com' "$TUNNEL_LOG" | head -n1 || true)"
  [ -n "$TUNNEL_URL" ] && break
  sleep 1
done

if [ -n "$TUNNEL_URL" ]; then
  echo ""
  echo "================================================================"
  echo "  ✅ Anevision live : $TUNNEL_URL"
  echo "     Bagikan URL ini ke teman-temanmu!"
  echo "     (Tekan Ctrl+C untuk menghentikan)"
  echo "================================================================"
else
  echo "!! URL tunnel tidak ditemukan. Log cloudflared:"
  tail -n 20 "$TUNNEL_LOG"
fi

wait "${pids[@]}" || true