import os
import re
import uuid
import json
from datetime import datetime, timedelta
from typing import List, Dict, Optional, Tuple
from pathlib import Path

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from pydantic import BaseModel
from dotenv import load_dotenv

# =============================================================================
# ENVIRONMENT
# =============================================================================
env_locations = [
    Path(__file__).parent.parent / ".env",
    Path(__file__).parent / ".env",
    Path.cwd() / ".env",
]

for env_path in env_locations:
    if env_path.exists():
        load_dotenv(env_path)
        print(f"[OK] Loaded .env from: {env_path}")
        break


# =============================================================================
# CONFIGURATION
# =============================================================================
class Config:
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    HOST: str = os.getenv("HOST", "0.0.0.0")
    PORT: int = int(os.getenv("PORT", "8000"))
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"
    ALLOWED_ORIGINS: List[str] = [
        o.strip() for o in os.getenv("ALLOWED_ORIGINS", "").split(",") if o.strip()
    ]

config = Config()


# =============================================================================
# OPENAI CLIENT
# =============================================================================
LLM_AVAILABLE = False
openai_client = None

try:
    from openai import OpenAI
    if config.OPENAI_API_KEY and len(config.OPENAI_API_KEY) > 20:
        openai_client = OpenAI(api_key=config.OPENAI_API_KEY)
        LLM_AVAILABLE = True
        print("[OK] OpenAI Client Initialized")
    else:
        print("[INFO] No OpenAI key. Using local extraction.")
except ImportError:
    print("[INFO] openai not installed. Using local extraction.")
except Exception as e:
    print(f"[ERROR] OpenAI init: {e}")


# =============================================================================
# DATABASE (Day 2)
# =============================================================================
from contextlib import asynccontextmanager

try:
    from backend.db import init_db
except ModuleNotFoundError:  # running from inside backend/
    from db import init_db  # type: ignore


@asynccontextmanager
async def lifespan(app: "FastAPI"):
    init_db()
    print("[OK] Database tables ready")
    yield


# =============================================================================
# FASTAPI APP
# =============================================================================
app = FastAPI(
    lifespan=lifespan,
    title="FlowPilot AI",
    description="Smart task extraction with Google Calendar sync",
    version="3.0.0",
    debug=config.DEBUG,
)

default_origins = [
    "https://flowpilot-app.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://localhost:8000",
]
origins = config.ALLOWED_ORIGINS if config.ALLOWED_ORIGINS else default_origins

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "OPTIONS"],
    allow_headers=["*"],
)


# =============================================================================
# MODELS
# =============================================================================
# =============================================================================
# MODELS (UPDATED for Day 8)
# =============================================================================
class Task(BaseModel):
    id: str
    title: str
    original_text: str
    due_date: Optional[str] = None
    assignee: Optional[str] = None
    priority: Optional[str] = "medium"
    category: Optional[str] = "Work"
    recurrence: Optional[str] = "none"  # Day 8: none | daily | weekly | monthly
    is_clarified: bool = False
    is_sarcastic: bool = False
    completedAt: Optional[int] = None   # Day 8: Timestamp when completed
    createdAt: Optional[int] = None     # Day 8: Timestamp when created
    streak: Optional[int] = 0           # Day 8: For recurring tasks


class ExtractionResponse(BaseModel):
    tasks: List[Task]
    clarifications: List[dict]


class ConfigResponse(BaseModel):
    google_client_id: str
    llm_available: bool
    debug: bool


# =============================================================================
# DATE / TIME PARSING
# =============================================================================
WEEKDAY_MAP = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}


def parse_time_from_text(text: str) -> Optional[Tuple[int, int]]:
    text_lower = text.lower()

    match = re.search(r"(\d{1,2})(?::(\d{2}))?\s*(am|pm)", text_lower)
    if match:
        h = int(match.group(1))
        m = int(match.group(2) or 0)
        if match.group(3) == "pm" and h != 12:
            h += 12
        elif match.group(3) == "am" and h == 12:
            h = 0
        return (h, m)

    match24 = re.search(r"\b(\d{1,2}):(\d{2})\b", text)
    if match24:
        h, m = int(match24.group(1)), int(match24.group(2))
        if 0 <= h <= 23 and 0 <= m <= 59:
            return (h, m)

    keywords = {
        "morning": (9, 0), "noon": (12, 0), "lunch": (12, 0),
        "afternoon": (14, 0), "evening": (18, 0), "night": (20, 0),
    }
    for kw, val in keywords.items():
        if kw in text_lower:
            return val

    return None


def parse_relative_date(text_lower: str, today: datetime) -> Optional[datetime]:
    if "tomorrow" in text_lower:
        return today + timedelta(days=1)
    if "today" in text_lower or "tonight" in text_lower:
        return today
    if "next week" in text_lower:
        return today + timedelta(days=7)
    if "next month" in text_lower:
        return today + timedelta(days=30)

    for name, idx in WEEKDAY_MAP.items():
        if f"next {name}" in text_lower:
            ahead = (idx - today.weekday()) % 7
            return today + timedelta(days=ahead if ahead else 7)
        if f"this {name}" in text_lower:
            ahead = (idx - today.weekday()) % 7
            return today + timedelta(days=ahead)
        if name in text_lower:
            ahead = (idx - today.weekday()) % 7
            return today + timedelta(days=ahead if ahead else 7)

    return None


def build_date_string(text: str) -> Optional[str]:
    today = datetime.now()
    time_info = parse_time_from_text(text)
    base_date = parse_relative_date(text.lower(), today)

    if base_date and time_info:
        h, m = time_info
        return base_date.strftime(f"%Y-%m-%dT{h:02d}:{m:02d}:00")
    elif base_date:
        return base_date.strftime("%Y-%m-%d")
    elif time_info:
        h, m = time_info
        return today.strftime(f"%Y-%m-%dT{h:02d}:{m:02d}:00")
    return None


# =============================================================================
# SMART SPLIT ENGINE
# =============================================================================
def smart_split(text: str) -> List[str]:
    """Split text into task fragments. Protects parentheses/quotes."""
    fragments: List[str] = []
    current: List[str] = []
    depth = 0
    in_quotes = False
    i = 0

    while i < len(text):
        char = text[i]
        remaining = text[i:]

        if char in ('"', "'"):
            in_quotes = not in_quotes
            current.append(char); i += 1; continue

        if char in "([{":
            depth += 1
            current.append(char); i += 1; continue
        elif char in ")]}":
            depth = max(0, depth - 1)
            current.append(char); i += 1; continue

        if depth == 0 and not in_quotes:
            if char in ".;!?\n":
                if current:
                    fragments.append("".join(current).strip())
                    current = []
                i += 1; continue

            if char == ",":
                if current:
                    fragments.append("".join(current).strip())
                    current = []
                i += 1
                while i < len(text) and text[i] == " ":
                    i += 1
                continue

            if char == "+":
                if current:
                    fragments.append("".join(current).strip())
                    current = []
                i += 1; continue

            lower_rem = remaining.lower()
            split_words = [(" and ", 5), (" or ", 4), (" then ", 6), (" also ", 6), (" plus ", 6), (" & ", 3)]
            matched = False
            for word, length in split_words:
                if lower_rem.startswith(word):
                    if current:
                        fragments.append("".join(current).strip())
                        current = []
                    i += length; matched = True; break
            if matched:
                continue

        current.append(char)
        i += 1

    if current:
        f = "".join(current).strip()
        if f:
            fragments.append(f)

    return [f for f in fragments if len(f.strip()) >= 3]


# =============================================================================
# LLM PROCESSING
# =============================================================================
def get_system_prompt():
    now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    return f"""You are FlowPilot AI. Current: {now}.
Transform text into tasks. Return JSON with "tasks" array.
Each task: {{title, original_text, due_date, priority, category, assignee, is_sarcastic}}.
- title: short imperative (no "I want to")
- due_date: "YYYY-MM-DDTHH:MM:SS" or "YYYY-MM-DD" or null
- priority: high/medium/low
- category: Work/Personal/Meeting
- Split multiple actions into separate tasks
- Detect sarcasm: is_sarcastic=true"""


def process_with_llm(text: str) -> Optional[dict]:
    if not openai_client:
        return None
    try:
        resp = openai_client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": "system", "content": get_system_prompt()},
                {"role": "user", "content": text},
            ],
            response_format={"type": "json_object"},
            temperature=0.3,
            max_tokens=1500,
        )
        data = json.loads(resp.choices[0].message.content)
        if "tasks" not in data:
            data["tasks"] = [data["task"]] if "task" in data else []
        return data
    except Exception as e:
        print(f"[ERROR] LLM: {e}")
        return None


# =============================================================================
# LOCAL EXTRACTION ENGINE
# =============================================================================
PRIORITY_MAP = {
    "high": ["asap", "urgent", "now", "immediately", "critical", "eod", "today",
             "must", "important", "emergency", "right away", "tonight"],
    "medium": ["tomorrow", "friday", "monday", "tuesday", "wednesday", "thursday",
               "saturday", "sunday", "next week", "meeting", "soon", "this week",
               "by", "deadline", "due", "schedule", "morning", "afternoon",
               "evening", "night", "noon", "remind"],
    "low": ["later", "maybe", "whenever", "someday", "eventually", "consider",
            "possibly", "no rush", "optional", "when possible"],
}

CATEGORY_MAP = {
    "Meeting": ["call", "meeting", "meet", "discuss", "chat", "talk", "conference",
                "zoom", "teams", "catchup", "sync", "standup", "interview", "demo"],
    "Personal": ["gym", "buy", "shop", "groceries", "doctor", "dentist", "workout",
                 "exercise", "cook", "clean", "laundry", "medicine", "haircut",
                 "home", "family", "friend", "birthday", "gift", "vacation",
                 "dinner", "lunch", "pharmacy", "grocery", "pick up", "drop off",
                 "personal", "shopping", "diet", "shoes"],
    "Work": ["boss", "project", "report", "budget", "client", "review", "deadline",
             "proposal", "email", "document", "team", "office", "submit", "update",
             "company", "memo", "invoice", "contract", "quarterly", "analysis"],
}

SARCASM_PATTERNS = [
    r"yeah right", r"sure.{0,10}5 minutes", r"oh great",
    r"can't wait to", r"totally gonna", r"good luck with that",
]


def detect_priority(text: str) -> str:
    t = text.lower()
    for p, kws in PRIORITY_MAP.items():
        if any(k in t for k in kws):
            return p
    return "medium"


def detect_category(text: str) -> str:
    t = text.lower()
    scores = {c: sum(1 for k in kws if k in t) for c, kws in CATEGORY_MAP.items()}
    best = max(scores, key=scores.get)
    return best if scores[best] > 0 else "Work"


def clean_title(text: str) -> str:
    title = text.strip()
    title = re.sub(r"^\s*(i\s+(want|need|have|will|should|am going|plan)\s+to)\s+", "", title, flags=re.I)
    title = re.sub(r"^\s*i\s+('m|am)\s+", "", title, flags=re.I)
    for w in ["and", "or", "then", "also", "but", "so", "to"]:
        title = re.sub(rf"^{w}\s+", "", title, flags=re.I)
    time_pats = [
        r"\b(tomorrow|today|tonight|next week|next month)\b",
        r"\b(this|next)\s+(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\b(monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b",
        r"\bat\s+\d{1,2}(?::\d{2})?\s*(?:am|pm)?\b",
        r"\bby\s+(eod|end\s+of\s+day|tomorrow|friday|monday)\b",
        r"\b(morning|afternoon|evening|night|noon)\b",
        r"\b\d{1,2}(?::\d{2})?\s*(?:am|pm)\b",
    ]
    for p in time_pats:
        title = re.sub(p, "", title, flags=re.I)
    title = re.sub(r"\s+", " ", title).strip().rstrip(",;:")
    if len(title) > 100:
        title = title[:97] + "..."
    if title:
        title = title[0].upper() + title[1:]
        if not title.endswith((".", "!", "?")):
            title += "."
    return title


def process_local(text: str) -> dict:
    fragments = smart_split(text)
    tasks = []
    seen = set()

    for frag in fragments:
        frag = frag.strip().strip('"').strip("'")
        if len(frag) < 3:
            continue
        if any(re.search(p, frag.lower()) for p in SARCASM_PATTERNS):
            continue
        if re.match(r"^(\d{1,2}(am|pm|:\d{2})|tomorrow|today|tonight|monday|tuesday|wednesday|thursday|friday|saturday|sunday)$", frag, re.I):
            continue

        title = clean_title(frag)
        if len(title) < 3 or title.lower() in seen:
            continue
        seen.add(title.lower())

        priority = detect_priority(frag)
        date_str = build_date_string(frag)
        if date_str and "T" in date_str and priority == "low":
            priority = "medium"

        assignee = None
        m = re.search(r"(?:assign(?:ed)?\s+to|@|tell|ask|remind)\s+(\w+)", frag.lower())
        if m:
            assignee = m.group(1).title()

# Inside process_local function, when creating tasks dict:
        tasks.append({
            "title": title,
            "original_text": frag,
            "priority": priority,
            "due_date": date_str,
            "category": detect_category(frag),
            "assignee": assignee,
            "is_sarcastic": False,
            "recurrence": "none",      # Day 8
            "completedAt": None,       # Day 8
            "createdAt": int(datetime.now().timestamp() * 1000),  # Day 8
            "streak": 0,               # Day 8
        })

    return {"tasks": tasks}


# =============================================================================
# API ENDPOINTS
# =============================================================================
@app.get("/api/config", response_model=ConfigResponse)
async def get_config():
    return ConfigResponse(
        google_client_id=config.GOOGLE_CLIENT_ID,
        llm_available=LLM_AVAILABLE,
        debug=config.DEBUG,
    )


@app.get("/api/health")
async def health_check():
    return {
        "status": "ok",
        "version": "3.0.0",
        "llm_available": LLM_AVAILABLE,
        "google_configured": bool(config.GOOGLE_CLIENT_ID and "your-client" not in config.GOOGLE_CLIENT_ID.lower()),
        "timestamp": datetime.now().isoformat(),
    }


@app.post("/api/process", response_model=ExtractionResponse)
async def process_input(request: Request):
    text = ""
    content_type = request.headers.get("content-type", "")

    try:
        if "application/json" in content_type:
            body = await request.json()
            text = body.get("text", "").strip()
        else:
            form = await request.form()
            text = (form.get("text") or "").strip()
    except Exception:
        raise HTTPException(400, "Invalid request format")

    if len(text) < 3:
        raise HTTPException(400, "Text too short. Minimum 3 characters.")
    if len(text) > 10000:
        raise HTTPException(413, "Text too long. Maximum 10,000 characters.")

    print(f"[INPUT] ({len(text)} chars): {text[:80]}...")

    data = None
    if LLM_AVAILABLE:
        data = process_with_llm(text)

    if not data or not data.get("tasks"):
        data = process_local(text)

    final_tasks = []
    clarifications = []

    for t in data.get("tasks", []):
        if t.get("is_sarcastic"):
            continue

        task_id = str(uuid.uuid4())
        date_str = t.get("due_date")

        if date_str:
            try:
                fmt = "%Y-%m-%dT%H:%M:%S" if "T" in date_str else "%Y-%m-%d"
                datetime.strptime(date_str.split(".")[0], fmt)
            except ValueError:
                date_str = None

        is_clarified = bool(date_str)
        if not date_str:
            clarifications.append({
                "id": task_id,
                "task_title": t.get("title", "Unknown"),
                "question": "When is this due? (e.g., 'Tomorrow at 2pm', 'Next Friday')",
            })

        priority = (t.get("priority") or "medium").lower()
        if priority not in ("high", "medium", "low"):
            priority = "medium"
        category = t.get("category", "Work")
        if category not in ("Work", "Personal", "Meeting"):
            category = "Work"

        final_tasks.append(Task(
            id=task_id,
            title=t.get("title", "Untitled")[:100],
            original_text=t.get("original_text", "")[:500],
            due_date=date_str,
            assignee=t.get("assignee"),
            priority=priority,
            category=category,
            recurrence=t.get("recurrence"),
            is_clarified=is_clarified,
            is_sarcastic=False,
        ))

    return ExtractionResponse(tasks=final_tasks, clarifications=clarifications)


@app.get("/api/test")
async def test_extraction():
    tests = [
        "Email boss tomorrow, gym 6pm, call Sarah about meeting",
        "Buy groceries (milk, eggs, bread) + finish report by Friday",
        "Urgent: submit proposal ASAP, maybe clean room later",
        "Call doctor at 3pm then pick up medicine from pharmacy",
    ]
    return {"results": [{"input": t, "tasks": process_local(t)["tasks"]} for t in tests]}


@app.get("/")
async def root():
    return {
        "name": "FlowPilot AI API",
        "version": "3.0.0",
        "docs": "/docs",
        "health": "/api/health",
        "test": "/api/test",
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=config.HOST, port=config.PORT, reload=config.DEBUG)