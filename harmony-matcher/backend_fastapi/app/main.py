from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from starlette.websockets import WebSocketDisconnect

from .db import init_db
from .settings import settings
from .api.router import api_router
from .ws import handle_ws_message, manager


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    settings.resolved_uploads_dir.mkdir(parents=True, exist_ok=True)
    yield


app = FastAPI(title="harmony-matcher", version="2.0.0", lifespan=lifespan)


@app.exception_handler(StarletteHTTPException)
def http_exception_handler(_, exc: StarletteHTTPException):
    # Normalize errors to `{ error: "..." }` like the previous Express backend.
    if isinstance(exc.detail, dict) and "error" in exc.detail:
        return JSONResponse(status_code=exc.status_code, content=exc.detail)
    if isinstance(exc.detail, str):
        return JSONResponse(status_code=exc.status_code, content={"error": exc.detail})
    return JSONResponse(status_code=exc.status_code, content={"error": "حدث خطأ"})


@app.exception_handler(RequestValidationError)
def validation_exception_handler(_, __: RequestValidationError):
    return JSONResponse(status_code=400, content={"error": "بيانات غير صالحة"})

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.mount("/uploads", StaticFiles(directory=str(settings.resolved_uploads_dir)), name="uploads")

app.include_router(api_router, prefix="/api")


@app.websocket("/ws")
async def websocket_endpoint(ws):
    await manager.connect(ws)
    try:
        # Optional: accept token via query param for convenience
        token = ws.query_params.get("token")
        if token:
            await manager.authenticate(ws, token)

        while True:
            raw = await ws.receive_text()
            try:
                msg = __import__("json").loads(raw)
            except Exception:
                await manager.send(ws, {"type": "error", "error": "invalid_json"})
                continue
            await handle_ws_message(ws, msg)
    except WebSocketDisconnect:
        await manager.disconnect(ws)
    except Exception:
        await manager.disconnect(ws)


