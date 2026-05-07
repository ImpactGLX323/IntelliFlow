from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv

load_dotenv()

APP_ENV = os.getenv("APP_ENV", "development").strip().lower() or "development"
DATABASE_URL = os.getenv("DATABASE_URL", "").strip()

if not DATABASE_URL:
    if APP_ENV == "development":
        DATABASE_URL = "postgresql://user:password@localhost:5432/intelliflow"
    else:
        raise RuntimeError("DATABASE_URL must be configured outside development.")

engine = create_engine(DATABASE_URL, pool_pre_ping=True)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
