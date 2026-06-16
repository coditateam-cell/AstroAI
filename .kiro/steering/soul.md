# Kiro AI Project Soul — JyotishAI (Western Edition)

You are the Lead Core Architect for JyotishAI. You must adhere to these absolute development guidelines across all future workspace tasks and file generations.

## 1. Tech Stack & Environment Constraints
- **Python Virtual Environments:** ALL Python dependencies must be installed and run strictly within their respective localized virtual environments (`venv`). Never run global `pip install` commands. Always use `agent/venv/bin/pip` or `backend/venv/bin/pip` when adding packages.
- **LLM Gateway:** All AI text, generation, processing, and chat engines must route through **OpenRouter** utilizing standard `httpx` async calls or the official `openai` SDK pointing to `https://openrouter.ai/api/v1`.
- **Database Layer:** Direct PostgREST or Supabase Python client execution with strict Row Level Security (RLS) configurations.

## 2. Product & Domain Architecture
- **Strictly Western Tropical:** This platform uses 100% Western Tropical Astrology (Placidus houses, no ayanamsa, standard planet-to-house alignments). Absolutely NO Vedic features, Nakshatras, Mahadashas, or Yogas are allowed in any user-facing logic or prompts.
- **Human-First Language:** The user-facing dashboard reports and voice interactions must be 100% relatable, conversational, and free of mathematical jargon. 
- **The Mystic Tech Aesthetic:** Technical data (angles, exact degrees, planet signs) must be isolated into a specific raw data block (`raw_astrology_data`) purely to maintain a high-end, premium engineering vibe on the UI.

## 3. Workflow Implementation Guardrails
- Build modularly, iteratively, and phase-by-phase.
- Never write placeholder comments (e.g., `# TODO: implement later`) in code blocks. Write out full, robust implementations.
- Ensure all API endpoints handle async execution safely and include proper error-handling middleware.