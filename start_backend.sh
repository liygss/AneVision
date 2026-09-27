#!/bin/bash
cd /Users/macbookpro/Downloads/AneVision/backend
source .venv/bin/activate
export MODEL_MODE=real
exec python3 -u -c "
import sys; sys.path.insert(0, '.')
from main import app; import uvicorn
uvicorn.run(app, host='0.0.0.0', port=8000, log_level='info')
"
