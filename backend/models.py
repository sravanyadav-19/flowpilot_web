# ==========================================================================
# FILE: backend/models.py  (Day 2 — database foundation)
# One Google account = one User; tasks belong to a user and are shared
# across every client (web / Android / extension).
# ==========================================================================
from datetime import datetime
from uuid import uuid4

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


def _uuid() -> str:
    return str(uuid4())


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    name: Mapped[str] = mapped_column(String(255), default="")
    picture: Mapped[str] = mapped_column(String(1024), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)

    tasks: Mapped[list["Task"]] = relationship(
        back_populates="user", cascade="all, delete-orphan"
    )


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    user_id: Mapped[str] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False
    )

    # --- AI-extracted content (mirrors frontend/src/types/task.ts) ---
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    original_text: Mapped[str] = mapped_column(String(1000), default="")
    due_date: Mapped[str] = mapped_column(String(30), nullable=True, default=None)
    assignee: Mapped[str] = mapped_column(String(100), nullable=True, default=None)
    priority: Mapped[str] = mapped_column(String(10), default="medium")
    category: Mapped[str] = mapped_column(String(20), default="Work")
    recurrence: Mapped[str] = mapped_column(String(10), default="none")
    is_clarified: Mapped[bool] = mapped_column(Boolean, default=False)
    is_sarcastic: Mapped[bool] = mapped_column(Boolean, default=False)

    # --- Board state (Day 8 features) ---
    is_completed: Mapped[bool] = mapped_column(Boolean, default=False)
    completed_at: Mapped[datetime] = mapped_column(DateTime, nullable=True, default=None)
    streak: Mapped[int] = mapped_column(Integer, default=0)
    sort_order: Mapped[int] = mapped_column(Integer, default=0)

    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime, default=datetime.utcnow, onupdate=datetime.utcnow
    )

    user: Mapped["User"] = relationship(back_populates="tasks")

    def to_dict(self) -> dict:
        """JSON shape that matches the frontend Task interface."""
        return {
            "id": self.id,
            "title": self.title,
            "original_text": self.original_text,
            "due_date": self.due_date,
            "assignee": self.assignee,
            "priority": self.priority,
            "category": self.category,
            "recurrence": self.recurrence,
            "is_clarified": self.is_clarified,
            "is_sarcastic": self.is_sarcastic,
            "completedAt": int(self.completed_at.timestamp() * 1000) if self.completed_at else None,
            "createdAt": int(self.created_at.timestamp() * 1000),
            "streak": self.streak,
        }
    