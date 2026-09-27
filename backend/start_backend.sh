#!/bin/bash
# Start the Anevision backend.
#
# Works locally and on hosts that inject a PORT (Vercel, Railway, Fly, most
# PaaS). The earlier version hardcoded /Users/macbookpro/... which fails
# anywhere else.
set -euo pipefail

cd "$(dirname "$0")"
export MODEL_MODE="${MODEL_MODE:-real}"
export PORT="${PORT:-8000}"

.venv/bin/python -u -c "
import sys; sys.path.insert(0, '.')
from main import app
import uvicorn
uvicorn.run(app, host='0.0.0.0', port=int(__import__('os').environ['PORT']), log_level='info')
"
