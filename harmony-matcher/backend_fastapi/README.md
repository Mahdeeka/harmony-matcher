# `backend_fastapi` (FastAPI backend)

This is the FastAPI backend that replaces the Node/Express backend under `backend/`.

## Setup

1) Create a virtualenv (recommended) and install deps:

```bash
cd backend_fastapi
pip install -r requirements.txt
```

2) Configure environment variables

Copy `backend_fastapi/env.example` to a local env file of your choice (or set env vars in your shell).

## Run (dev)

```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 3001
```


