"""Request and response schemas for the shared task API."""

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict, Field


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=200)
    original_text: str = Field(default="", max_length=1000)
    due_date: Optional[str] = Field(default=None, max_length=30)
    assignee: Optional[str] = Field(default=None, max_length=100)
    priority: str = Field(default="medium", max_length=10)
    category: str = Field(default="Work", max_length=20)
    recurrence: str = Field(default="none", max_length=10)
    is_clarified: bool = False
    is_sarcastic: bool = False


class TaskUpdate(BaseModel):
    title: Optional[str] = Field(default=None, min_length=1, max_length=200)
    original_text: Optional[str] = Field(default=None, max_length=1000)
    due_date: Optional[str] = Field(default=None, max_length=30)
    assignee: Optional[str] = Field(default=None, max_length=100)
    priority: Optional[str] = Field(default=None, max_length=10)
    category: Optional[str] = Field(default=None, max_length=20)
    recurrence: Optional[str] = Field(default=None, max_length=10)
    is_clarified: Optional[bool] = None
    is_sarcastic: Optional[bool] = None
    is_completed: Optional[bool] = None
    streak: Optional[int] = Field(default=None, ge=0)


class TaskResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    user_id: str
    title: str
    original_text: str
    due_date: Optional[str]
    assignee: Optional[str]
    priority: str
    category: str
    recurrence: str
    is_clarified: bool
    is_sarcastic: bool
    is_completed: bool
    completed_at: Optional[datetime]
    streak: int
    created_at: datetime
    updated_at: Optional[datetime]