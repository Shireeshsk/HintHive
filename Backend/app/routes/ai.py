from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import json
from groq import Groq

from app.config import settings
from app.dependencies import get_current_user

router = APIRouter(prefix="/ai", tags=["AI"])

# ─── lazy Groq client (initialised on first request) ────────
_groq_client = None

def get_groq():
    global _groq_client
    if _groq_client is None:
        api_key = settings.GROQ_API_KEY
        if not api_key or api_key == "your_groq_api_key_here":
            raise HTTPException(
                status_code=503,
                detail="GROQ_API_KEY is not set. Add your key to Backend/.env and restart the server."
            )
        _groq_client = Groq(api_key=api_key)
    return _groq_client


# ─── Request / Response models ───────────────────────────────
class AnalyzeRequest(BaseModel):
    code: str
    language: str


class ChatMessage(BaseModel):
    role: str   # "user" | "assistant"
    content: str


class ChatRequest(BaseModel):
    code: str
    language: str
    messages: List[ChatMessage]   # full conversation history


class HintItem(BaseModel):
    id: str
    type: str        # syntax | logic | performance | style | success
    severity: str    # error | warning | info | success
    line: Optional[int] = None
    title: str
    message: str
    fix: str
    icon: str


class AnalyzeResponse(BaseModel):
    hints: List[HintItem]
    summary: str


class ChatResponse(BaseModel):
    reply: str


# ─── System prompts ──────────────────────────────────────────
ANALYZE_SYSTEM = """You are HintHive AI, an expert code analyser and mentor.

When given a code snippet and its programming language, analyse it carefully and return a JSON object with this exact structure:

{
  "summary": "One-sentence overall verdict.",
  "hints": [
    {
      "id": "unique-kebab-id",
      "type": "syntax|logic|performance|style|success",
      "severity": "error|warning|info|success",
      "line": null_or_integer,
      "title": "Short title",
      "message": "Clear explanation of the issue",
      "fix": "Exact fix or corrected code snippet",
      "icon": "one emoji"
    }
  ]
}

Rules:
- Detect ALL syntax errors (missing semicolons, brackets, colons, indentation errors, typos, etc.)
- Detect logic errors (off-by-one, infinite loops, wrong conditions, unreachable code, etc.)
- Detect performance issues (O(n^2) loops, unnecessary re-computation, missing memoisation, etc.)
- Detect style/best-practice issues (magic numbers, bad variable names, var vs const, etc.)
- If the code is perfect, return one hint with type "success" and severity "success".
- Always set "line" to the actual line number when the issue is on a specific line, else null.
- Keep "fix" concise and show corrected code where possible.
- Return ONLY the raw JSON object, no markdown, no explanation outside the JSON.
"""

CHAT_SYSTEM = """You are HintHive AI, a friendly and expert coding mentor.

You are helping a developer who is writing code in {language}. Their current code is shown below.
Answer their question helpfully, clearly, and concisely. When showing code, use proper formatting.
Be encouraging and educational — explain WHY something is wrong, not just what.

Current code:
```{language}
{code}
```
"""


# ════════════════════════════════════════════════════════════
#  POST /ai/analyze  — full code analysis
# ════════════════════════════════════════════════════════════
@router.post("/analyze", response_model=AnalyzeResponse)
async def analyze_code(
    body: AnalyzeRequest,
    current_user: dict = Depends(get_current_user),
):
    if not body.code.strip():
        return AnalyzeResponse(
            hints=[HintItem(
                id="empty", type="info", severity="info", line=None,
                title="No Code Yet",
                message="Start typing to get AI-powered hints.",
                fix="", icon="🎯"
            )],
            summary="No code to analyse."
        )

    prompt = (
        f"Language: {body.language}\n\n"
        f"Code:\n```{body.language.lower()}\n{body.code}\n```\n\n"
        "Analyse the code above and return the JSON response."
    )

    try:
        completion = get_groq().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": ANALYZE_SYSTEM},
                {"role": "user",   "content": prompt},
            ],
            temperature=0.2,
            max_tokens=2048,
            response_format={"type": "json_object"},
        )
        raw = completion.choices[0].message.content

        import json
        data = json.loads(raw)

        hints_raw = data.get("hints", [])
        hints = []
        for i, h in enumerate(hints_raw):
            hints.append(HintItem(
                id=h.get("id", f"hint-{i}"),
                type=h.get("type", "info"),
                severity=h.get("severity", "info"),
                line=h.get("line"),
                title=h.get("title", "Hint"),
                message=h.get("message", ""),
                fix=h.get("fix", ""),
                icon=h.get("icon", "💡"),
            ))

        return AnalyzeResponse(
            hints=hints,
            summary=data.get("summary", "Analysis complete.")
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq API error: {str(e)}"
        )


# ════════════════════════════════════════════════════════════
#  POST /ai/chat  — conversational Q&A about the code
# ════════════════════════════════════════════════════════════
@router.post("/chat", response_model=ChatResponse)
async def chat(
    body: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    system_prompt = CHAT_SYSTEM.format(
        language=body.language,
        code=body.code[:3000],   # cap to avoid token overflow
    )

    # build message history (cap at last 10 turns to stay in context)
    history = body.messages[-10:]
    messages = [{"role": "system", "content": system_prompt}]
    for m in history:
        messages.append({"role": m.role if m.role in ("user", "assistant") else "user",
                         "content": m.content})

    try:
        completion = get_groq().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=messages,
            temperature=0.6,
            max_tokens=1024,
        )
        reply = completion.choices[0].message.content.strip()
        return ChatResponse(reply=reply)

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Groq API error: {str(e)}"
        )


# ════════════════════════════════════════════════════════════
#  GET /ai/motivate  — fresh motivational quote for devs
#  (no auth required — displayed immediately after login)
# ════════════════════════════════════════════════════════════
class MotivateResponse(BaseModel):
    quote: str
    author: str
    tag: str      # e.g. "debugging", "perseverance", "growth"


MOTIVATE_SYSTEM = """You are an inspiring mentor for software developers and programmers.
Generate a single, fresh, powerful motivational quote targeted at coders/developers.
The quote should feel authentic and NOT be a cliché (avoid "code like nobody is watching" style).
It should relate to one of: debugging, learning, persistence, problem-solving, growth mindset, creativity in coding, or the joy of building.

Return ONLY a JSON object with this exact structure, no markdown, no extra text:
{
  "quote": "The full motivational quote here.",
  "author": "Real person name OR 'HintHive Wisdom' if original",
  "tag": "one of: debugging | learning | persistence | problem-solving | growth | creativity | building"
}"""

@router.get("/motivate", response_model=MotivateResponse)
async def get_motivation():
    """Returns a fresh AI-generated motivational quote for developers."""
    try:
        completion = get_groq().chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=[
                {"role": "system", "content": MOTIVATE_SYSTEM},
                {"role": "user",   "content": "Give me an inspiring quote for a developer right now."},
            ],
            temperature=0.95,   # high temp for variety
            max_tokens=200,
            response_format={"type": "json_object"},
        )
        data = json.loads(completion.choices[0].message.content)
        return MotivateResponse(
            quote=data.get("quote", "Every bug you fix makes you a better engineer."),
            author=data.get("author", "HintHive Wisdom"),
            tag=data.get("tag", "growth"),
        )
    except HTTPException:
        raise
    except Exception:
        # graceful fallback — never block the welcome screen
        return MotivateResponse(
            quote="Every expert was once a beginner. Every bug is just a lesson in disguise.",
            author="HintHive Wisdom",
            tag="growth",
        )
