from fastapi import APIRouter, Depends, HTTPException, Response, UploadFile, File
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List
import uuid
import os
from PIL import Image
from io import BytesIO
from .. import crud, schemas, database, utils

router = APIRouter()

@router.get("/boxes/{box_id}/qrcode")
async def get_box_qrcode(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box(db, box_id=box_id)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    
    # URL structure: /api/hassio_ingress/{slug}/#/box/{slug}
    # Note: Ingress path handling might require adjustment based on actual deployment
    # For now, we generate a relative URL or a full URL if domain is known
    # Using the box slug for the URL
    qr_data = f"/hassio/ingress/whereisit/#/box/{db_box.slug}" 
    
    img_bytes = utils.generate_qr_code(qr_data)
    return Response(content=img_bytes, media_type="image/png")

@router.post("/units", response_model=schemas.UnitResponse)
async def create_unit(unit: schemas.UnitCreate, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.create_unit(db=db, unit=unit)
    # Return explicit dict to avoid ANY lazy loading risk during Pydantic validation
    return {"id": db_unit.id, "name": db_unit.name, "description": db_unit.description}

@router.get("/units", response_model=List[schemas.Unit])
async def read_units(skip: int = 0, limit: int = 100, db: AsyncSession = Depends(database.get_db)):
    return await crud.get_units(db, skip=skip, limit=limit)

@router.get("/units/{unit_id}", response_model=schemas.Unit)
async def read_unit(unit_id: int, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.get_unit(db, unit_id=unit_id)
    if db_unit is None:
        raise HTTPException(status_code=404, detail="Unit not found")
    return db_unit

@router.put("/units/{unit_id}", response_model=schemas.UnitResponse)
async def update_unit(unit_id: int, unit_update: schemas.UnitUpdate, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.update_unit(db, unit_id=unit_id, unit_update=unit_update)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"id": db_unit.id, "name": db_unit.name, "description": db_unit.description}

@router.delete("/units/{unit_id}")
async def delete_unit(unit_id: int, db: AsyncSession = Depends(database.get_db)):
    db_unit = await crud.delete_unit(db, unit_id=unit_id)
    if not db_unit:
        raise HTTPException(status_code=404, detail="Unit not found")
    return {"message": "Unit deleted successfully"}

@router.post("/boxes", response_model=schemas.BoxSummary)
async def create_box(box: schemas.BoxCreate, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.create_box(db=db, box=box)
    # Return explicit dict to avoid Pydantic trying to lazily load the un-fetched db_box.items relationship
    return {"id": db_box.id, "name": db_box.name, "description": db_box.description, "slug": db_box.slug, "unit_id": db_box.unit_id}

@router.put("/boxes/{box_id}", response_model=schemas.BoxSummary)
async def update_box(box_id: int, box_update: schemas.BoxUpdate, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.update_box(db, box_id=box_id, box_update=box_update)
    if not db_box:
        raise HTTPException(status_code=404, detail="Box not found")
    return {"id": db_box.id, "name": db_box.name, "description": db_box.description, "slug": db_box.slug, "unit_id": db_box.unit_id}

@router.delete("/boxes/{box_id}")
async def delete_box(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.delete_box(db, box_id=box_id)
    if not db_box:
        raise HTTPException(status_code=404, detail="Box not found")
    return {"message": "Box deleted successfully"}

@router.get("/boxes/{box_id}", response_model=schemas.Box)
async def read_box(box_id: int, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box(db, box_id=box_id)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    return db_box

@router.get("/boxes/slug/{slug}", response_model=schemas.Box)
async def read_box_by_slug(slug: str, db: AsyncSession = Depends(database.get_db)):
    db_box = await crud.get_box_by_slug(db, slug=slug)
    if db_box is None:
        raise HTTPException(status_code=404, detail="Box not found")
    return db_box

@router.post("/boxes/{box_id}/items", response_model=schemas.Item)
async def create_item(box_id: int, item: schemas.ItemCreate, db: AsyncSession = Depends(database.get_db)):
    return await crud.create_item(db=db, item=item, box_id=box_id)

@router.put("/items/{item_id}", response_model=schemas.Item)
async def update_item(item_id: int, item_update: schemas.ItemUpdate, db: AsyncSession = Depends(database.get_db)):
    db_item = await crud.update_item(db, item_id=item_id, item_update=item_update)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return db_item

@router.delete("/items/{item_id}")
async def delete_item(item_id: int, db: AsyncSession = Depends(database.get_db)):
    db_item = await crud.delete_item(db, item_id=item_id)
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"message": "Item deleted successfully"}

@router.post("/items/{item_id}/photo", response_model=schemas.Item)
async def upload_item_photo(item_id: int, file: UploadFile = File(...), db: AsyncSession = Depends(database.get_db)):
    from sqlalchemy.future import select
    from .. import models
    
    # Check if item exists
    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    db_item = result.scalar_one_or_none()
    if not db_item:
        raise HTTPException(status_code=404, detail="Item not found")
        
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="File must be an image")

    try:
        # Read the file
        contents = await file.read()
        image = Image.open(BytesIO(contents))
        
        # Convert to RGB to remove alpha channel since we are saving as JPEG
        if image.mode in ("RGBA", "P"):
            image = image.convert("RGB")
            
        # Resize image to save space, preserving aspect ratio
        image.thumbnail((800, 800))
        
        # Generate unique filename
        filename = f"{uuid.uuid4()}.jpg"
        filepath = os.path.join("/data/photos", filename)
        
        # Save compressed image
        image.save(filepath, format="JPEG", quality=85)
        
        # Update database with relative URL path
        # Assuming app is mounted to serve /data/photos at /api/photos
        photo_url = f"/api/photos/{filename}"
        
        update_data = schemas.ItemUpdate(photo_path=photo_url)
        return await crud.update_item(db, item_id=item_id, item_update=update_data)
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to process image: {str(e)}")

@router.get("/search")
async def search(q: str, db: AsyncSession = Depends(database.get_db)):
    return await crud.search_storage(db, q)
