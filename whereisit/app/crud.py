from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from . import models, schemas
import uuid

async def get_units(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(
        select(models.StorageUnit)
        .options(selectinload(models.StorageUnit.boxes).selectinload(models.StorageBox.items))
        .offset(skip)
        .limit(limit)
    )
    return result.scalars().all()

async def create_unit(db: AsyncSession, unit: schemas.UnitCreate):
    db_unit = models.StorageUnit(name=unit.name, description=unit.description)
    db.add(db_unit)
    await db.commit()
    await db.refresh(db_unit)
    return db_unit

async def get_unit(db: AsyncSession, unit_id: int):
    result = await db.execute(
        select(models.StorageUnit)
        .options(selectinload(models.StorageUnit.boxes).selectinload(models.StorageBox.items))
        .where(models.StorageUnit.id == unit_id)
    )
    return result.scalar_one_or_none()

async def get_boxes(db: AsyncSession, skip: int = 0, limit: int = 100):
    result = await db.execute(select(models.StorageBox).options(selectinload(models.StorageBox.items)).offset(skip).limit(limit))
    return result.scalars().all()

async def create_box(db: AsyncSession, box: schemas.BoxCreate):
    # Generate a random slug if not provided
    slug = box.slug or str(uuid.uuid4())
    db_box = models.StorageBox(name=box.name, description=box.description, slug=slug, unit_id=box.unit_id)
    db.add(db_box)
    await db.commit()
    await db.refresh(db_box)
    return db_box

async def get_box(db: AsyncSession, box_id: int):
    result = await db.execute(select(models.StorageBox).options(selectinload(models.StorageBox.items)).where(models.StorageBox.id == box_id))
    return result.scalar_one_or_none()

async def get_box_by_slug(db: AsyncSession, slug: str):
    result = await db.execute(select(models.StorageBox).options(selectinload(models.StorageBox.items)).where(models.StorageBox.slug == slug))
    return result.scalar_one_or_none()

async def create_item(db: AsyncSession, item: schemas.ItemCreate, box_id: int):
    db_item = models.Item(**item.model_dump(), box_id=box_id)
    db.add(db_item)
    await db.commit()
    await db.refresh(db_item)
    return db_item

async def delete_item(db: AsyncSession, item_id: int):
    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    item = result.scalar_one_or_none()
    if item:
        await db.delete(item)
        await db.commit()
    return item

async def update_unit(db: AsyncSession, unit_id: int, unit_update: schemas.UnitUpdate):
    db_unit = await get_unit(db, unit_id)
    if db_unit:
        update_data = unit_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_unit, key, value)
        await db.commit()
        await db.refresh(db_unit)
    return db_unit

async def delete_unit(db: AsyncSession, unit_id: int):
    db_unit = await get_unit(db, unit_id)
    if db_unit:
        await db.delete(db_unit)
        await db.commit()
    return db_unit

async def update_box(db: AsyncSession, box_id: int, box_update: schemas.BoxUpdate):
    db_box = await get_box(db, box_id)
    if db_box:
        update_data = box_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_box, key, value)
        await db.commit()
        await db.refresh(db_box)
    return db_box

async def delete_box(db: AsyncSession, box_id: int):
    db_box = await get_box(db, box_id)
    if db_box:
        await db.delete(db_box)
        await db.commit()
    return db_box

async def update_item(db: AsyncSession, item_id: int, item_update: schemas.ItemUpdate):
    result = await db.execute(select(models.Item).where(models.Item.id == item_id))
    db_item = result.scalar_one_or_none()
    if db_item:
        update_data = item_update.model_dump(exclude_unset=True)
        for key, value in update_data.items():
            setattr(db_item, key, value)
        await db.commit()
        await db.refresh(db_item)
    return db_item

async def search_storage(db: AsyncSession, query: str):
    from sqlalchemy import or_
    
    # Search boxes
    boxes = await db.execute(
        select(models.StorageBox)
        .options(selectinload(models.StorageBox.items))
        .where(models.StorageBox.name.ilike(f"%{query}%"))
    )
    boxes = boxes.scalars().all()
    
    # Search items
    items = await db.execute(
        select(models.Item)
        .options(selectinload(models.Item.box))
        .where(
            or_(
                models.Item.name.ilike(f"%{query}%"),
                models.Item.category.ilike(f"%{query}%")
            )
        )
    )
    items = items.scalars().all()
    
    return {"boxes": boxes, "items": items}
