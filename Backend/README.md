# HintHive — A Truthful AI Programming Tutor

**HintHive is not a smarter AI tutor — it is a truthful one.**

It’s a programming tutor that checks code using **mathematical verification**, not AI guessing. 
- Feedback is logically correct.
- No AI hallucinations in judging code.
- AI is used only for **teaching**, not grading correctness.

---

## 1. Problem We Solve
* Existing AI tutors can be confidently wrong; they **guess** instead of proving logic.
* Our idea: **a tutor should only point out mistakes it can prove**.

---

## 2. Workflow
1. **Student submits Python code**
2. **Syntax check** via Python parser (catches missing colon, indentation, etc.)
3. **Symbolic verifier** (Z3 + CrossHair) checks code mathematically
   * Inputs treated as symbols
   * Finds any input that causes failure
4. **Outcomes:**
   * ✅ Verified: No failing input found
   * ❌ Counter-example found (e.g., empty list, DivisionByZero)
5. **AI Tutor:**
   * Only sees the counter-example
   * Asks Socratic questions to guide the student, never gives the direct solution
6. **Iterate:** Student fixes code → system re-verifies → green light only after mathematical proof.

---

## 3. Key Architectural Idea
* **Judge (Symbolic Execution)** → decides correctness, deterministic, mathematical.
* **Teacher (LLM)** → explains proven mistakes, never judges.

> Separation prevents hallucinations.

---

## 4. Common Errors Caught
* Automatically finds them as counter-examples.
* Examples: empty input, off-by-one, missing recursion base case, wrong loop bounds, logical condition errors.

## 5. Syntax Errors
* Caught immediately by the Python AST parser.
* Examples: missing colon, indentation, invalid syntax.

> HintHive’s main contribution starts **after syntax is correct**.

---

## 6. How It’s Different
* **AI tutors:** guess **vs** **HintHive:** proves
* **Online judges:** test examples **vs** **HintHive:** all possible inputs
* **Static analyzers:** style/types **vs** **HintHive:** logic correctness

> *HintHive proves properties of code, then teaches.*

---

## 7. Why It’s Viable & Feasible
* **Viable:** Existing verification tools work. Education problems are small & bounded. Students need trustworthy feedback.
* **Feasible Tools:** Z3, CrossHair, LangGraph, mutmut.
* **Scope:** Beginner/intermediate Python functions, deterministic logic.
* **Truth:** Verification is tractable & reliable for these workloads.

---

## 8. Evaluation Strategy
* Uses **mutation testing**: injects bugs and checks detection rate.
* Target: >90% mutation score → proves robustness.

---

## 9. Limitations
* No heavy I/O, complex floating-point, or large unbounded programs.
* Verification is **scope-limited by design**.

---

## 10. Common Panel Q&A

* *"Can’t ChatGPT do this?"* → ChatGPT guesses, HintHive proves only when a counter-example exists.
* *"Does it find syntax errors?"* → Yes, but focus is deeper logical correctness.
* *"Does it find common errors?"* → Yes, automatically via counter-examples.
* *"Is this feasible?"* → Yes, scope is restricted to educational programs.
* *"Main contribution?"* → Eliminates hallucinations by separating judgment from teaching.

---

## Quick Start (Backend)

```bash
# 1. Activate virtual environment
.\venv\Scripts\Activate.ps1        # Windows PowerShell

# 2. Copy env template and fill in your secrets
copy .env .env.local   # edit .env with real MONGO_URI + secrets

# 3. Run dev server
.\venv\Scripts\uvicorn.exe main:app --host 0.0.0.0 --port 8000 --reload
```
