from sqlalchemy import Column, Integer, String, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from .database import Base

class StorageUnit(Base):
    __tablename__ = "storage_units"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True)
    description = Column(String, nullable=True)
    
    boxes = relationship("StorageBox", back_populates="unit")

class StorageBox(Base):
    __tablename__ = "storage_boxes"

    id = Column(Integer, primary_key=True, index=True)
    slug = Column(String, unique=True, index=True)  # For QR codes/URLs
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    unit_id = Column(Integer, ForeignKey("storage_units.id"))

    unit = relationship("StorageUnit", back_populates="boxes")
    items = relationship("Item", back_populates="box")

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True)
    description = Column(String, nullable=True)
    quantity = Column(Integer, default=1)
    category = Column(String, index=True, nullable=True)
    photo_path = Column(String, nullable=True)
    box_id = Column(Integer, ForeignKey("storage_boxes.id"))

    box = relationship("StorageBox", back_populates="items")
