from __future__ import annotations

from fastapi import APIRouter, HTTPException
from ...core.harmony_import import fetch_harmony_members


router = APIRouter()


@router.get("/members")
async def get_harmony_members():
    try:
        data = await fetch_harmony_members()
    except Exception:
        raise HTTPException(status_code=500, detail={"error": "فشل في جلب أعضاء Harmony"})
    return {"members": data.get("items") or [], "total": data.get("total")}


