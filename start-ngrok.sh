#!/usr/bin/env bash
set -euo pipefail

# Menjalankan AneVision lalu mengeksposnya lewat ngrok supaya orang lain bisa
# mencobanya lewat satu URL publik. Versi cloudflare ada di ./start.sh.
#
# Hanya port frontend yang ditunnel. Vite sudah mem-proxy /api ke backend
# (frontend/vite.config.ts), jadi backend tetap di localhost dan tidak butuh
# tunnel kedua. Itu penting: paket ngrok gratis hanya mengizinkan satu sesi
# agent, jadi dua tunnel sekaligus akan gagal dengan ERR_NGROK_108.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

die() { echo ""; echo "!! $1"; exit 1; }

# ---------------------------------------------------------------- prasyarat

if ! command -v ngrok >/dev/null 2>&1; then
  echo "ngrok tidak ditemukan. Install dulu:"
  echo "  macOS  : brew install --cask ngrok"
  echo "  Linux  : sudo snap install ngrok"
  echo "  manual : https://ngrok.com/download"
  exit 1
fi

NGROK_MAJOR="$(ngrok version 2>/dev/null | sed -nE 's/^ngrok version ([0-9]+).*/\1/p')"
if [ -n "$NGROK_MAJOR" ] && [ "$NGROK_MAJOR" -lt 3 ]; then
  die "ngrok v$NGROK_MAJOR terlalu lama. Butuh ngrok v3 atau lebih baru."
fi

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  die "frontend belum di-install. Jalankan: (cd frontend && npm install)"
fi

if [ ! -d "$BACKEND_DIR/.venv" ]; then
  die "backend belum punya virtualenv. Jalankan setup di README:
  (cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt)"
fi

# Paket gratis = satu sesi agent. Kalau ada ngrok yang sudah jalan, tunnel baru
# akan ditolak, jadi lebih baik diberi tahu sekarang.
if pgrep -x ngrok >/dev/null 2>&1; then
  echo "!! Ada ngrok agent lain yang sedang jalan."
  echo "   Paket gratis hanya boleh satu sesi. Tutup yang lain dulu, atau:"
  echo "   pkill -x ngrok"
  echo ""
fi

# ---------------------------------------------------------------- port

# Vite default-nya bind ke ::1 saja, jadi port yang dipakai proses lain bisa
# tidak terlihat lewat 127.0.0.1. Kedua keluarga IP harus dicek, kalau tidak
# pick_port akan mengembalikan port yang sudah dipakai dan vite gagal dengan
# "Port 5173 is already in use".
port_in_use() {
  nc -z 127.0.0.1 "$1" >/dev/null 2>&1 && return 0
  nc -6 -z ::1 "$1" >/dev/null 2>&1 && return 0
  return 1
}

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
  echo ">> Menghentikan (frontend, backend, ngrok)..."
  for pid in "${pids[@]:-}"; do
    pkill -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  [ -n "${TUNNEL_LOG:-}" ] && rm -f "$TUNNEL_LOG"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if [ -x "$BACKEND_DIR/.venv/bin/python" ]; then
  BACKEND_PY="$BACKEND_DIR/.venv/bin/python"
else
  BACKEND_PY="python"
fi

echo "================================================================"
echo "  Anevision — Start + ngrok"
echo "  Frontend : http://localhost:$PORT_FRONTEND"
echo "  Backend  : http://localhost:$PORT_BACKEND"
echo "================================================================"

echo ">> Menjalankan backend (uvicorn)..."
(cd "$BACKEND_DIR" && exec "$BACKEND_PY" -m uvicorn main:app --host 127.0.0.1 --port "$PORT_BACKEND") &
pids+=($!)

echo ">> Menjalankan frontend (vite)..."
(cd "$FRONTEND_DIR" && VITE_PROXY_TARGET="http://localhost:$PORT_BACKEND" exec npm run dev -- --port "$PORT_FRONTEND" --strictPort) &
pids+=($!)

echo ">> Menunggu frontend siap..."
for _ in $(seq 1 40); do
  if curl -s -o /dev/null "http://localhost:$PORT_FRONTEND" 2>/dev/null; then break; fi
  sleep 1
done

echo ">> Menunggu backend siap..."
for _ in $(seq 1 60); do
  if curl -s -o /dev/null "http://localhost:$PORT_BACKEND/health" 2>/dev/null; then break; fi
  sleep 1
done

# ---------------------------------------------------------------- ngrok

TUNNEL_LOG="$(mktemp)"
NGROK_ARGS=(http "$PORT_FRONTEND" --log=stdout --log-level=info)
[ -n "${NGROK_DOMAIN:-}" ] && NGROK_ARGS+=(--domain="$NGROK_DOMAIN")

echo ">> Menjalankan ngrok..."
ngrok "${NGROK_ARGS[@]}" >"$TUNNEL_LOG" 2>&1 &
pids+=($!)

echo ">> Mencari URL ngrok..."
TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL="$(grep -oE 'url=https://[a-zA-Z0-9.-]+' "$TUNNEL_LOG" | head -n1 | sed 's/^url=//' || true)"
  [ -n "$TUNNEL_URL" ] && break
  if grep -qE 'ERR_NGROK_105|ERR_NGROK_108|ERR_NGROK_334|authentication' "$TUNNEL_LOG"; then break; fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo ""
  echo "!! ngrok gagal start. Isi log:"
  tail -n 20 "$TUNNEL_LOG"
  echo ""
  if grep -qE 'ERR_NGROK_105|authentication|ERR_NGROK_401' "$TUNNEL_LOG"; then
    echo "  Penyebab: authtoken belum diisi."
    echo "  Ambil token di https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "  Lalu jalankan: ngrok config add-authtoken <TOKEN_KAMU>"
  elif grep -q 'ERR_NGROK_108' "$TUNNEL_LOG"; then
    echo "  Penyebab: sesi ngrok sudah dipakai proses lain."
    echo "  Tutup ngrok yang lain, atau: pkill -x ngrok"
  elif grep -q 'ERR_NGROK_334' "$TUNNEL_LOG"; then
    echo "  Penyebab: endpoint '${NGROK_DOMAIN:-domain default akun}' sedang online."
    echo "  Hentikan tunnel sebelumnya, atau pakai NGROK_DOMAIN lain."
  fi
  exit 1
fi

echo ""
echo ">> Memverifikasi tunnel dari luar..."
CHECK_CODE="000"
for _ in $(seq 1 20); do
  CHECK_CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "$TUNNEL_URL/api/health" 2>/dev/null || true)"
  [ "$CHECK_CODE" = "200" ] && break
  sleep 1
done

echo "================================================================"
echo "  ✅ Anevision live : $TUNNEL_URL"
echo "     Halaman skrining : $TUNNEL_URL/screening"
echo "     Cek backend      : $TUNNEL_URL/api/health"
echo "     Panel ngrok      : http://localhost:4040"
if [ "$CHECK_CODE" = "200" ]; then
  echo "     Status           : terverifikasi (frontend + backend merespons)"
else
  echo "     Status           : backend belum merespons (HTTP $CHECK_CODE)"
  echo "                        Halaman tetap terbuka, tapi /screening belum bisa menebak Hb."
  echo "                        Cek log backend di terminal ini."
fi
echo "     Bagikan URL atas ke teman-temanmu."
echo "     (Tekan Ctrl+C untuk menghentikan)"
echo "================================================================"

wait "${pids[@]}" || true