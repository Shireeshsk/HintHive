from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from typing import List, Optional
import json
from groq import Groq

from app.config import settings
from app.dependencies import get_current_user
from app.verifier import check_syntax, run_symbolic_verifier

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
ANALYZE_SYSTEM = """You are HintHive AI, a Socratic programming tutor.

When given a code snippet, its programming language, and optionally a verification counter-example, return a JSON object with this exact structure:

{
  "summary": "One-sentence overall verdict.",
  "hints": [
    {
      "id": "unique-kebab-id",
      "type": "syntax|logic|performance|style|success",
      "severity": "error|warning|info|success",
      "line": null_or_integer,
      "title": "Short title",
      "message": "Socratic question pointing to the issue without giving the solution",
      "fix": "",
      "icon": "one emoji"
    }
  ]
}

Rules:
- You are a TEACHER, not a judge. The code correctness has already been judged mathematically.
- If a counter-example is provided, explain the proven mistake and ask Socratic questions.
- NEVER give the direct solution or fix. The user must fix their own bugs. Let "fix" be empty or just a hint.
- Always set "line" to the actual line number when the issue is on a specific line, else null.
- Return ONLY the raw JSON object, no markdown, no explanation outside the JSON.
"""

CHAT_SYSTEM = """You are HintHive AI, a Socratic programming tutor.

You are helping a developer who is writing code in {language}. Their current code is shown below.
Answer their questions helpfully, but NEVER give the direct solution or correct code snippet.
Instead, ask Socratic questions to guide them to find the answer themselves.
Explain WHY something is wrong, and help them reason about the logic.

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

    if body.language.lower() in ["python", "py"]:
        syntax = check_syntax(body.code)
        if not syntax["valid"]:
            return AnalyzeResponse(
                hints=[HintItem(
                    id="syntax-error", type="syntax", severity="error", line=syntax["line"],
                    title="Syntax Error",
                    message=syntax["error"],
                    fix="Fix the syntax error.", icon="🚨"
                )],
                summary="Code has a syntax error caught by parser."
            )
            
        verification = run_symbolic_verifier(body.code)
        if verification["verified"]:
            return AnalyzeResponse(
                hints=[HintItem(
                    id="success", type="success", severity="success", line=None,
                    title="Mathematically Verified!",
                    message="Your code passed symbolic execution and is mathematically correct.",
                    fix="", icon="✅"
                )],
                summary="Code is logically proven."
            )
            
        # If counter-example is found, ask the AI to formulate Socratic question based on it
        prompt = (
            f"Language: {body.language}\n\n"
            f"Code:\n```{body.language.lower()}\n{body.code}\n```\n\n"
            f"The symbolic verifier found the following counter-example (a bug):\n"
            f"{verification['counter_example']}\n\n"
            "As a Socratic AI Tutor, analyze this proven mistake and formulate JSON hints teaching the user "
            "about their logical error. DO NOT provide the correct code. DO ask questions to guide them."
        )
    else:
        # Fallback for other languages
        prompt = (
            f"Language: {body.language}\n\n"
            f"Code:\n```{body.language.lower()}\n{body.code}\n```\n\n"
            "Analyse the code above and return the JSON response using your heuristic logic."
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
