from __future__ import annotations

from collections.abc import Generator
from pathlib import Path

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


def _ensure_sqlite_directory(database_url: str) -> None:
    prefix = "sqlite:///"
    if not database_url.startswith(prefix):
        return
    raw_path = database_url.removeprefix(prefix)
    if raw_path == ":memory:":
        return
    Path(raw_path).expanduser().resolve().parent.mkdir(parents=True, exist_ok=True)


def normalize_database_url(database_url: str) -> str:
    if database_url.startswith("postgresql+"):
        return database_url
    if database_url.startswith("postgresql://"):
        return database_url.replace("postgresql://", "postgresql+psycopg://", 1)
    if database_url.startswith("postgres://"):
        return database_url.replace("postgres://", "postgresql+psycopg://", 1)
    return database_url


settings = get_settings()
database_url = normalize_database_url(settings.database_url)
_ensure_sqlite_directory(database_url)

engine_kwargs: dict[str, object] = {"pool_pre_ping": True}
if database_url.startswith("sqlite"):
    engine_kwargs["connect_args"] = {"check_same_thread": False}

engine = create_engine(database_url, **engine_kwargs)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False, expire_on_commit=False)


def get_db() -> Generator[Session, None, None]:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_columns(bind: Engine) -> list[str]:
    """Add columns that exist on the models but not yet in the database.

    The project has no migration framework yet; ``create_all`` only creates missing
    tables. This additive step keeps existing SQLite/PostgreSQL databases usable when
    nullable or defaulted columns are introduced (e.g. the billing fields on ``users``).
    """

    inspector = inspect(bind)
    existing_tables = set(inspector.get_table_names())
    added: list[str] = []
    for table in Base.metadata.sorted_tables:
        if table.name not in existing_tables:
            continue
        present = {column["name"] for column in inspector.get_columns(table.name)}
        for column in table.columns:
            if column.name in present:
                continue
            column_type = column.type.compile(dialect=bind.dialect)
            ddl = f'ALTER TABLE {table.name} ADD COLUMN {column.name} {column_type}'
            if not column.nullable:
                default = column.default.arg if column.default is not None and not callable(column.default.arg) else None
                if default is None:
                    raise RuntimeError(
                        f"Cannot add NOT NULL column {table.name}.{column.name} without a static default."
                    )
                literal = "TRUE" if default is True else "FALSE" if default is False else repr(default)
                if bind.dialect.name == "sqlite" and isinstance(default, bool):
                    literal = "1" if default else "0"
                ddl += f" NOT NULL DEFAULT {literal}"
            with bind.begin() as connection:
                connection.execute(text(ddl))
            added.append(f"{table.name}.{column.name}")
    return added


def init_db(bind: Engine | None = None) -> None:
    # Importing models registers the tables on Base.metadata.
    from . import models  # noqa: F401

    target = bind or engine
    Base.metadata.create_all(bind=target)
    ensure_columns(target)
