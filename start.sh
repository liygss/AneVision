#!/usr/bin/env bash
set -euo pipefail

# Kalau stdout bukan terminal (mis. "./start.sh | tee log" atau dijalankan
# dari IDE yang menangkap output), bash menahan output di buffer sampai
# script selesai, jadi URL tunnel baru terlihat setelah semua selesai.
# Dialihkan ke stderr supaya progresnya selalu kelihatan.
if [ ! -t 1 ]; then exec 1>&2; fi

# Menjalankan AneVision (backend + frontend) lalu mengeksposnya lewat ngrok
# supaya aplikasinya bisa dibuka dari HP atau dibagikan ke teman.
#
# Dua jebakan yang bikin tunnel ngrok membalas 502 Bad Gateway:
#
#   1. Vite secara default hanya bind ke ::1 (IPv6 loopback). Tunnel yang
#      dial ke "localhost" atau 127.0.0.1 tidak akan sampai ke vite. Di sini
#      vite dipaksa bind ke 127.0.0.1 dan ngrok menunjuk ke 127.0.0.1 secara
#      eksplisit, jadi tidak bergantung pada urutan resolusi DNS.
#   2. Port yang dipakai proses lain harus dicek di IPv4 DAN IPv6. Kalau hanya
#      IPv4 yang dicek, port yang diikat di ::1 terlihat bebas, vite lalu mati
#      dengan "Port 5173 is already in use" padahal tidak ada yang salah.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="$ROOT_DIR/frontend"
BACKEND_DIR="$ROOT_DIR/backend"

die() { echo ""; echo "!! $1"; exit 1; }

# ---------------------------------------------------------------- opsi

ENABLE_NGROK=0
usage() {
  cat <<'EOF'
Penggunaan: ./start.sh [opsi]

  (tanpa opsi)   Nyalakan backend + frontend lokal.
  --ngrok, -n    Nyalakan sekaligus tunnel publik ngrok.
  --help, -h     Tampilkan bantuan ini.
EOF
}

for arg in "$@"; do
  case "$arg" in
    --ngrok|-n) ENABLE_NGROK=1 ;;
    --help|-h) usage; exit 0 ;;
    *) echo "!! Opsi tidak dikenal: $arg"; echo ""; usage; exit 1 ;;
  esac
done

# ---------------------------------------------------------------- prasyarat

command -v node >/dev/null 2>&1 \
  || die "node tidak ditemukan. Install Node.js dulu."

if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
  die "frontend belum di-install. Jalankan: (cd frontend && npm install)"
fi

BACKEND_PY="$BACKEND_DIR/.venv/bin/python"
if [ ! -x "$BACKEND_PY" ]; then
  die "backend belum punya virtualenv. Jalankan setup di README:
  (cd backend && python3 -m venv .venv && ./.venv/bin/pip install -r requirements.txt)"
fi

if [ "$ENABLE_NGROK" = "1" ]; then
  command -v ngrok >/dev/null 2>&1 \
    || die "ngrok tidak ditemukan. Install dulu: brew install --cask ngrok"

  # Authtoken wajib sejak ngrok v3. Disimpan di ngrok.yml per-OS:
  # macOS  : ~/Library/Application Support/ngrok/ngrok.yml
  # Linux  : ~/.config/ngrok/ngrok.yml
  NGROK_CFG=""
  for cfg in "$HOME/Library/Application Support/ngrok/ngrok.yml" "$HOME/.config/ngrok/ngrok.yml"; do
    if [ -f "$cfg" ]; then NGROK_CFG="$cfg"; break; fi
  done
  if [ -z "${NGROK_AUTHTOKEN:-}" ] && { [ -z "$NGROK_CFG" ] || ! grep -q "authtoken" "$NGROK_CFG"; }; then
    die "authtoken ngrok belum diisi.
  Ambil token di https://dashboard.ngrok.com/get-started/your-authtoken
  Lalu jalankan: ngrok config add-authtoken <TOKEN_KAMU>"
  fi

  # Paket gratis ngrok cuma boleh satu sesi agent. Tunnel baru akan ditolak
  # dengan ERR_NGROK_334 kalau ada agent lain yang masih jalan.
  if pgrep -x ngrok >/dev/null 2>&1; then
    echo "!! Ada ngrok agent lain yang sedang jalan."
    echo "   Kalau tunnelnya masih menunjuk ke project ini, script akan ambil alih."
    echo "   Kalau bukan, tunnel baru ditolak ERR_NGROK_334 (paket gratis satu sesi):"
    echo "   pkill -x ngrok"
    echo ""
  fi
fi

# ---------------------------------------------------------------- proses

pids=()
NGROK_LOG=""

# vite dijalankan lewat npm, jadi proses vite adalah cucu dari shell script
# ini. Membunuh PID npm saja tidak selalu ikut memberhentikan vite, dan
# portnya akan tertinggal sehingga run berikutnya bentrok.
kill_tree() {
  local pid="$1" child
  for child in $(pgrep -P "$pid" 2>/dev/null || true); do
    kill_tree "$child"
  done
  kill "$pid" 2>/dev/null || true
}

# Sisa run sebelumnya bikin dua masalah: port frontend/backend bentrok dan
# sesi ngrok yang sudah dipakai (paket gratis hanya satu sesi, tunnel baru
# ditolak ERR_NGROK_334). Sisa run dari project ini dibersihkan dulu supaya
# start.sh selalu mulai dari kondisi bersih.
leftover_frontend_port=""
for pid in $(pgrep -f "$FRONTEND_DIR/node_modules/.bin/vite" 2>/dev/null || true); do
  port="$(ps -o command= -p "$pid" 2>/dev/null \
    | sed -nE 's/.*--port[= ]([0-9]+).*/\1/p' | head -n1 || true)"
  echo ">> Menutup frontend sisa run sebelumnya (PID $pid, port ${port:-?})"
  kill_tree "$pid"
  if [ -n "$port" ]; then leftover_frontend_port="$port"; fi
done

for pid in $(pgrep -f "uvicorn main:app" 2>/dev/null || true); do
  cwd="$(lsof -a -p "$pid" -d cwd -Fn 2>/dev/null | sed -n 's/^n//p' | head -n1 || true)"
  if [ "$cwd" = "$BACKEND_DIR" ]; then
    echo ">> Menutup backend sisa run sebelumnya (PID $pid)"
    kill_tree "$pid"
  fi
done

# Ngrok agent yang menunnel ke vite sisa run tadi ikut dimatikan, tapi hanya
# kalau memang menunjuk ke port project ini. Agent ngrok lain (milik aplikasi
# lain) dibiarkan.
if [ -n "$leftover_frontend_port" ]; then
  for pid in $(pgrep -x ngrok 2>/dev/null || true); do
    agent_port="$(lsof -nP -a -p "$pid" -iTCP -sTCP:LISTEN 2>/dev/null \
      | sed -n 's/.*127\.0\.0\.1:\([0-9]*\) (LISTEN).*/\1/p' | head -n1 || true)"
    if [ -z "$agent_port" ]; then continue; fi
    if curl -s --max-time 2 "http://127.0.0.1:$agent_port/api/tunnels" 2>/dev/null \
      | grep -qF "\"addr\":\"http://127.0.0.1:$leftover_frontend_port\""; then
      echo ">> Menutup tunnel ngrok sisa run sebelumnya (PID $pid)"
      kill_tree "$pid"
    fi
  done
  sleep 1
fi

# ---------------------------------------------------------------- port

port_in_use() {
  if nc -z 127.0.0.1 "$1" >/dev/null 2>&1; then return 0; fi
  if nc -6 -z ::1 "$1" >/dev/null 2>&1; then return 0; fi
  return 1
}

pick_port() {
  local start="$1" p
  if ! port_in_use "$start"; then echo "$start"; return; fi
  for ((p = start + 1; p <= start + 9; p++)); do
    if ! port_in_use "$p"; then echo "$p"; return; fi
  done
  echo "$start"
}

PORT_FRONTEND="$(pick_port "${PORT_FRONTEND:-5173}")"
PORT_BACKEND="$(pick_port "${PORT_BACKEND:-8000}")"

cleanup() {
  echo ""
  echo ">> Menghentikan (frontend, backend, ngrok)..."
  for pid in "${pids[@]:-}"; do
    kill_tree "$pid"
  done
  if [ -n "${NGROK_LOG:-}" ]; then rm -f "$NGROK_LOG"; fi
  return 0
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

echo "================================================================"
if [ "$ENABLE_NGROK" = "1" ]; then
  echo "  Anevision — Start + ngrok"
else
  echo "  Anevision — Start"
fi
echo "  Frontend : http://127.0.0.1:$PORT_FRONTEND"
echo "  Backend  : http://127.0.0.1:$PORT_BACKEND"
echo "================================================================"

echo ">> Menjalankan backend (uvicorn)..."
(cd "$BACKEND_DIR" && exec "$BACKEND_PY" -m uvicorn main:app --host 127.0.0.1 --port "$PORT_BACKEND") &
pids+=($!)
BACKEND_PID=$!

echo ">> Menjalankan frontend (vite)..."
# --host 127.0.0.1 wajib: tanpa itu vite hanya listen di ::1 dan tunnel
# ngrok akan membalas 502.
(cd "$FRONTEND_DIR" && VITE_PROXY_TARGET="http://127.0.0.1:$PORT_BACKEND" exec npm run dev -- --host 127.0.0.1 --port "$PORT_FRONTEND" --strictPort) &
pids+=($!)
FRONTEND_PID=$!

# Tunggu server siap. Kalau prosesnya mati duluan (port bentrok, import
# error), stop di sini dan tampilkan errornya, jangan lanjut diam-diam.
wait_ready() {
  local url="$1" pid="$2" label="$3" timeout="$4" i
  for ((i = 0; i < timeout; i++)); do
    if curl -fsS -o /dev/null --max-time 3 "$url" 2>/dev/null; then
      return 0
    fi
    if ! kill -0 "$pid" 2>/dev/null; then
      echo "" >&2
      echo "!! Proses $label berhenti sebelum siap. Lihat error di atas." >&2
      return 2
    fi
    sleep 1
  done
  return 1
}

echo ">> Menunggu frontend siap..."
if ! wait_ready "http://127.0.0.1:$PORT_FRONTEND" "$FRONTEND_PID" "frontend" 40; then
  die "Frontend tidak merespons di http://127.0.0.1:$PORT_FRONTEND."
fi

echo ">> Menunggu backend siap..."
if ! wait_ready "http://127.0.0.1:$PORT_BACKEND/health" "$BACKEND_PID" "backend" 90; then
  die "Backend tidak merespons di http://127.0.0.1:$PORT_BACKEND/health.
  Model eye/nail butuh ~15 detik untuk dimuat, jadi ini bukan error fatal
  kalau log di atas masih jalan. Kalau sudah berhenti, cek log uvicorn."
fi

# ---------------------------------------------------------------- ngrok

if [ "$ENABLE_NGROK" = "1" ]; then
NGROK_LOG="$(mktemp)"
echo ">> Menjalankan ngrok..."
NGROK_ARGS=(http "127.0.0.1:$PORT_FRONTEND" --log=stdout --log-level=info)
if [ -n "${NGROK_DOMAIN:-}" ]; then NGROK_ARGS+=(--domain="$NGROK_DOMAIN"); fi
ngrok "${NGROK_ARGS[@]}" >"$NGROK_LOG" 2>&1 &
pids+=($!)

ngrok_public_url() {
  local api out
  # Sumber utama: log ngrok milik instance ini. Log ini milik proses yang
  # kita jalankan, jadi URL-nya tidak mungkin milik agent ngrok lain.
  out="$(grep -oE 'url=https://[a-zA-Z0-9.-]+' "$NGROK_LOG" 2>/dev/null \
    | head -n1 | sed -e 's/^url=//' || true)"
  if [ -n "$out" ]; then
    printf '%s' "$out"
    return 0
  fi
  # Cadangan: API lokal ngrok, tapi hanya tunnel yang addr-nya cocok dengan
  # origin instance ini. Tanpa filter ini, URL agent lain bisa ikut terbaca
  # dan instance ini akan report URL yang bukan tunnelnya.
  api="$(curl -s --max-time 3 http://127.0.0.1:4040/api/tunnels 2>/dev/null || true)"
  if [ -n "$api" ]; then
    out="$(printf '%s' "$api" \
      | tr '}' '\n' \
      | grep -F "\"addr\":\"http://127.0.0.1:$PORT_FRONTEND\"" \
      | grep -oE '"public_url"[[:space:]]*:[[:space:]]*"https://[^"]+"' \
      | head -n1 \
      | sed -e 's/^[^"]*"public_url"[[:space:]]*:[[:space:]]*"//' -e 's/"$//' || true)"
    if [ -n "$out" ]; then
      printf '%s' "$out"
      return 0
    fi
  fi
  return 0
}

echo ">> Mencari URL ngrok..."
TUNNEL_URL=""
for _ in $(seq 1 45); do
  TUNNEL_URL="$(ngrok_public_url)"
  if [ -n "$TUNNEL_URL" ]; then break; fi
  if grep -qE 'ERR_NGROK_108|ERR_NGROK_105|ERR_NGROK_334|ERR_NGROK_401|authentication' "$NGROK_LOG"; then break; fi
  sleep 1
done

if [ -z "$TUNNEL_URL" ]; then
  echo ""
  echo "!! ngrok gagal start. Isi log:"
  tail -n 20 "$NGROK_LOG"
  echo ""
  if grep -qE 'ERR_NGROK_401|authentication' "$NGROK_LOG"; then
    echo "  Penyebab: authtoken belum diisi."
    echo "  Ambil token di https://dashboard.ngrok.com/get-started/your-authtoken"
    echo "  Lalu jalankan: ngrok config add-authtoken <TOKEN_KAMU>"
  elif grep -qE 'ERR_NGROK_108|ERR_NGROK_334' "$NGROK_LOG"; then
    echo "  Penyebab: sesi ngrok sudah dipakai tunnel lain."
    echo "  Paket gratis hanya boleh satu sesi. Tutup yang lain, atau:"
    echo "  pkill -x ngrok"
  elif grep -q 'ERR_NGROK_105' "$NGROK_LOG"; then
    echo "  Penyebab: endpoint domain sedang dipakai tunnel lain."
  fi
  exit 1
fi

echo ">> Memverifikasi tunnel dari luar..."
# Edge ngrok butuh beberapa detik untuk memakai domain yang baru dibuat, dan
# sesaat masih bisa balas 307. Pengecekannya ditunggu sampai body-nya benar,
# bukan cuma status 200, supaya halaman peringatan ngrok tidak dianggap
# "berhasil".
sleep 3
CHECK_API="gagal"
CHECK_PAGE="gagal"
for _ in $(seq 1 30); do
  body="$(curl -sL --max-time 15 -H "ngrok-skip-browser-warning: true" "$TUNNEL_URL/api/health" 2>/dev/null || true)"
  if printf '%s' "$body" | grep -q '"status":"ok"'; then
    CHECK_API="ok"
  fi
  page="$(curl -sL --max-time 15 -H "ngrok-skip-browser-warning: true" "$TUNNEL_URL/" 2>/dev/null || true)"
  if printf '%s' "$page" | grep -q "Skrining Anemia"; then
    CHECK_PAGE="ok"
  fi
  if [ "$CHECK_API" = "ok" ] && [ "$CHECK_PAGE" = "ok" ]; then break; fi
  sleep 1
done

echo ""
echo "================================================================"
echo "  ✅ Anevision live : $TUNNEL_URL"
echo "     Buka di HP     : $TUNNEL_URL/screening"
echo "     Cek backend    : $TUNNEL_URL/api/health"
echo "     Panel ngrok    : http://localhost:4040"
if [ "$CHECK_API" = "ok" ] && [ "$CHECK_PAGE" = "ok" ]; then
  echo "     Status         : terverifikasi (frontend + backend merespons)"
else
  echo "     Status         : belum merespons penuh"
  echo "                        frontend=$CHECK_PAGE  backend=$CHECK_API"
  echo "                        Halaman tetap terbuka, tapi /screening belum bisa menebak Hb."
  echo "                        Cek log backend di terminal ini."
fi
echo "     Catatan        : paket ngrok gratis memunculkan halaman peringatan"
echo "                        sekali di browser HP. Klik \"Visit Site\" sekali saja."
echo "     (Tekan Ctrl+C untuk menghentikan)"
echo "================================================================"
else
  echo ""
  echo "================================================================"
  echo "  ✅ Anevision siap"
  echo "     Buka           : http://127.0.0.1:$PORT_FRONTEND"
  echo "     Halaman        : http://127.0.0.1:$PORT_FRONTEND/screening"
  echo "     Backend health : http://127.0.0.1:$PORT_BACKEND/health"
  echo "     (Tekan Ctrl+C untuk menghentikan)"
  echo "================================================================"
  echo ""
  echo "  Butuh URL publik untuk dibuka dari HP?"
  echo "  Jalankan ulang dengan: ./start.sh --ngrok"
  echo ""
fi

wait "${pids[@]}" || true
