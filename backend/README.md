# Anevision — Backend

## Quick Start

```bash
cd backend

# Create virtual environment
python3 -m venv .venv
source .venv/bin/activate   # macOS/Linux
# .venv\Scripts\activate    # Windows

# Install dependencies
pip install -r requirements.txt

# Run the server
uvicorn main:app --reload
```

API docs: http://localhost:8000/docs

## Model Integration

Place your trained models in `backend/models/`:

```
backend/models/
  eye_model.h5
  nail_model.h5
```

Set environment variable:

```bash
export MODEL_MODE=real
```

Then update `services/inference.py` and `services/preprocessing.py` to match your model's requirements.
