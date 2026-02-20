from fastapi import FastAPI, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from .database import engine, Base
from . import models
from .api import endpoints
import os
import logging
from sqlalchemy import text

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

@app.middleware("http")
async def log_requests(request, call_next):
    logger.info(f"Incoming request: {request.method} {request.url.path}")
    
    # Fix double slashes in path (e.g. //assets/...)
    if "//" in request.url.path:
        new_path = request.url.path.replace("//", "/")
        request.scope["path"] = new_path
        logger.info(f"Fixed path to: {new_path}")
    
    response = await call_next(request)
    return response

app.include_router(endpoints.router, prefix="/api")

# CORS middleware for development flexibility
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup():
    logger.info(f"Current working directory: {os.getcwd()}")
    try:
        logger.info(f"Directory listing for frontend/dist: {os.listdir('frontend/dist')}")
        logger.info(f"Directory listing for frontend/dist/assets: {os.listdir('frontend/dist/assets')}")
    except Exception as e:
        logger.error(f"Error listing directories: {e}")

    # Ensure photos directory exists
    os.makedirs("/data/photos", exist_ok=True)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
        # SQLite migration to add new columns if they don't exist
        try:
            await conn.execute(text("ALTER TABLE items ADD COLUMN category VARCHAR;"))
            logger.info("Added category column to items table.")
        except Exception as e:
            if "duplicate column name" not in str(e).lower():
                logger.warning(f"Failed to add category column (might already exist): {e}")
                
        try:
            await conn.execute(text("ALTER TABLE items ADD COLUMN photo_path VARCHAR;"))
            logger.info("Added photo_path column to items table.")
        except Exception as e:
            if "duplicate column name" not in str(e).lower():
                logger.warning(f"Failed to add photo_path column (might already exist): {e}")

@app.get("/api/health")
async def health_check():
    return {"status": "ok"}

from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles

# Mount assets implicitly
if os.path.exists("frontend/dist/assets"):
    logger.info("Mounting /assets to frontend/dist/assets")
    app.mount("/assets", StaticFiles(directory="frontend/dist/assets"), name="assets")
else:
    logger.warning("frontend/dist/assets NOT FOUND")

# Mount photos directory
app.mount("/api/photos", StaticFiles(directory="/data/photos"), name="photos")

# Catch-all to serve index.html for SPA (excluding API)
@app.get("/{full_path:path}")
async def catch_all(full_path: str):
    # Only block if it's explicitly an API call to OUR endpoints, not an Ingress path
    if full_path.startswith("api/") and not full_path.startswith("api/hassio_ingress/"):
        # Let FastAPI handle 404 for API routes naturally or raise it here if not matched by router
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Not Found")
    
    # Serve index.html
    if os.path.exists("frontend/dist/index.html"):
        return FileResponse("frontend/dist/index.html")
    return {"error": "Frontend not found"}

