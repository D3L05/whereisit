from pydantic import BaseModel
from typing import List, Optional

class ItemBase(BaseModel):
    name: str
    description: Optional[str] = None
    quantity: int = 1
    category: Optional[str] = None
    photo_path: Optional[str] = None

class ItemCreate(ItemBase):
    pass

class Item(ItemBase):
    id: int
    box_id: int

    class Config:
        from_attributes = True

class BoxBase(BaseModel):
    name: str
    description: Optional[str] = None
    slug: Optional[str] = None

class BoxCreate(BoxBase):
    unit_id: int

class BoxSummary(BoxBase):
    id: int
    unit_id: int

    class Config:
        from_attributes = True

class Box(BoxSummary):
    items: List[Item] = []

    class Config:
        from_attributes = True

class UnitBase(BaseModel):
    name: str
    description: Optional[str] = None

class UnitCreate(UnitBase):
    pass

class UnitUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None

class Unit(UnitBase):
    id: int
    boxes: List[Box] = []

    class Config:
        from_attributes = True

class UnitResponse(UnitBase):
    id: int

    class Config:
        from_attributes = True

class BoxUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    unit_id: Optional[int] = None

class ItemUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    quantity: Optional[int] = None
    category: Optional[str] = None
    photo_path: Optional[str] = None
