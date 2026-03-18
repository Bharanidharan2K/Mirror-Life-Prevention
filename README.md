# MirrorLife Preventive Health — Project Documentation

## What Does This App Do?

This app takes data about citizens (health records, GPS locations, backstories) and uses AI to figure out **who needs help**. Think of it like a digital health screening system:

1. You upload 4 data files about citizens
2. AI agents analyze each person's health trends and backstory
3. A dashboard shows who's at risk, who's borderline, and who's healthy
4. You can click on any citizen to see their full profile with charts
5. You can ask questions in plain English ("Who has declining sleep?")

---

## Tech Stack

| What | Technology | Why |
|---|---|---|
| Backend server | **FastAPI** (Python) | Simple API server — each endpoint is just a function |
| AI agents | **LangChain** (`create_agent`) | Agents that can call tools to get data |
| LLM | **OpenAI GPT-4o-mini** | Reads backstories, makes risk decisions |
| Vector database | **ChromaDB** | Stores personas as embeddings for semantic search (RAG) |
| Frontend | **React + TypeScript** | Dashboard UI with charts |
| Charts | **Recharts** | Line/area charts for health trends |
| Icons | **Fluent UI Icons** | Professional icon set |
| Styling | **Custom CSS** | Dashboard-style layout with sidebar |

---

## Project Structure

```
MirrorLife Preventive Health/
├── backend/                    # Python API + AI agents
│   ├── main.py                 # FastAPI server (all API endpoints)
│   ├── agents.py               # 3 AI agents + analysis pipeline
│   ├── tools.py                # @tool functions + Python risk scoring
│   ├── data_loader.py          # Reads the 4 data files
│   ├── vector_store.py         # ChromaDB for RAG search
│   └── .env                    # API keys
├── frontend/                   # React dashboard
│   └── src/
│       ├── App.tsx             # Layout + routing
│       ├── services/api.ts     # Axios calls to backend
│       └── components/
│           ├── FileUpload.tsx   # Upload files + trigger analysis
│           ├── Dashboard.tsx    # Stat cards + citizen table
│           ├── CitizenDetail.tsx # Full citizen profile page
│           ├── HealthChart.tsx  # Area chart for health trends
│           └── ChatPanel.tsx    # RAG-powered Q&A chat
└── data/                       # Sample test data
    └── sample_level_1/
```

---

## Backend — How It Works

### File 1: `data_loader.py` — The File Reader

**Job:** Opens the 4 data files and returns their contents. That's it — no analysis, no AI.

| Function | What It Does |
|---|---|
| `load_users()` | Reads `users.json` → returns list of citizens (name, job, city) |
| `load_health_data()` | Reads `status.csv` → returns health events grouped by citizen |
| `load_persona(id)` | Reads `personas.md` → returns one citizen's backstory text |
| `load_locations(id)` | Reads `locations.json` → returns GPS summary + detects if movement is shrinking |
| `set_data_dir(path)` | Changes which folder to read from (used when user uploads new files) |

**Example:** `load_locations("WNACROYX")` returns:
```json
{
  "total_pings": 479,
  "unique_cities": ["Bath", "Bristol", "Cardiff", "London", "Newport", "Swindon"],
  "first_half_cities": 6,
  "second_half_cities": 1,
  "movement_shrinking": true
}
```

---

### File 2: `vector_store.py` — The Smart Search (RAG)

**Job:** Stores citizen backstories in ChromaDB so you can search by **meaning** instead of keywords.

**How it works:**
1. When data is uploaded, each citizen's persona text is sent to OpenAI's embedding model
2. The model converts the text into a list of 1536 numbers (a "vector")
3. These vectors are saved in ChromaDB (a database on disk)
4. When you search "who is withdrawing from friends?", your question is also converted to a vector
5. ChromaDB finds the closest matching vectors — even if the words are different ("cancelling plans" matches "withdrawing")

| Function | What It Does |
|---|---|
| `store_personas(data_dir)` | Reads personas.md → embeds each citizen's text → saves in ChromaDB |
| `search(query, k)` | Searches ChromaDB by meaning → returns top k matching citizens |
| `get_context(citizen_id)` | Retrieves the stored text for one specific citizen |

**This is the "R" in RAG** (Retrieval-Augmented Generation):
- **Retrieval:** Search ChromaDB for relevant citizen data
- **Augmented:** Give that data to the LLM as context
- **Generation:** LLM answers using the context

---

### File 3: `tools.py` — Calculator + Phone Book for Agents

**Job:** Two things agents need:
1. **@tool functions** — Agents call these to get data (like tools in a toolbox)
2. **analyze_citizen()** — Python math risk scoring (FREE, no AI cost)

**@tool functions (agents call these):**

| Tool | What It Does |
|---|---|
| `get_persona_and_location(citizen_id)` | Gets the citizen's backstory from ChromaDB + location summary |
| `search_similar_citizens(query)` | Searches ChromaDB for citizens matching a description |

**Risk scoring function (Python math, no AI):**

`analyze_citizen(citizen_id, health_records)` checks:
- Is PhysicalActivityIndex going **down**? (53 → 17 = bad) → +3 risk points
- Is SleepQualityIndex going **down**? (58 → 20 = bad) → +3 risk points
- Is EnvironmentalExposureLevel going **up**? (45 → 91 = bad) → +3 risk points
- Are there specialist/follow-up/emergency visits? → +2/+1/+3 points each
- Is the citizen visiting fewer cities over time? (becoming homebound) → +1 point

**Result categories:**
- Score ≥ 5 → `HIGH_RISK` (auto-flagged, no AI needed)
- Score 2–4 → `BORDERLINE` (ask AI to decide)
- Score < 2 → `LOW_RISK` (auto-safe, no AI needed)

---

### File 4: `agents.py` — The 3 Doctors

**Job:** Runs the full analysis pipeline using 3 specialist AI agents.

**Agent 1: Data Analyst** (Python math — FREE)
- Runs `analyze_citizen()` on every citizen
- Sorts them into 3 buckets: HIGH_RISK, BORDERLINE, LOW_RISK
- No AI calls, no cost

**Agent 2: Persona Analyst** (LLM — GPT-4o-mini)
- Created with `create_agent()` + 2 tools: `get_persona_and_location`, `search_similar_citizens`
- Only runs for HIGH_RISK + BORDERLINE citizens (saves money)
- Reads the backstory and identifies warning signs: withdrawal, sleep issues, appetite loss, isolation
- Returns a 2-3 sentence behavioral analysis

**Agent 3: Risk Classifier** (LLM — GPT-4o-mini)
- Created with `create_agent()` + 1 tool: `get_persona_and_location`
- Only runs for BORDERLINE citizens (HIGH_RISK already auto-flagged)
- Gets all evidence (health data + persona analysis) and makes the final 0/1 call
- Returns JSON: `{"classification": 0 or 1, "explanation": "why"}`

**Pipeline (`run_analysis()`):**
```
For each citizen:
  HIGH_RISK  → auto-flag as 1 + run Persona Analyst for explanation
  BORDERLINE → run Persona Analyst + Risk Classifier to decide
  LOW_RISK   → auto-mark as 0 (no AI, free)
```

**Cost optimization:** For 30 citizens with 15 at-risk, only ~15-20 LLM calls instead of 90+.

---

### File 5: `main.py` — The Reception Desk (FastAPI)

**Job:** Takes requests from the React frontend and routes them to the right function.

Think of each endpoint as a "question React is asking":

| Endpoint | React Asks | Backend Does |
|---|---|---|
| `POST /api/upload` | "Here are 4 files" | Saves files, embeds personas in ChromaDB |
| `POST /api/analyze` | "Analyze everyone" | Runs the 3-agent pipeline |
| `GET /api/citizens` | "List all citizens" | Returns citizen list with risk scores |
| `GET /api/citizens/{id}` | "Tell me about Craig" | Returns full profile + persona + AI analysis |
| `GET /api/citizens/{id}/health` | "Show me Craig's chart data" | Returns time-series health events |
| `POST /api/chat` | "Who has declining sleep?" | RAG search + LLM answer |

**Chat endpoint (RAG in action):**
1. Takes the user's question
2. Searches ChromaDB for relevant citizens (Retrieval)
3. Adds analysis results as context (Augmented)
4. Sends question + context to GPT-4o-mini (Generation)
5. Returns the AI's answer + which citizens were referenced

---

## Frontend — How It Works

### `App.tsx` — The Shell

**Job:** Layout with sidebar navigation + page routing.

**Layout:**
```
┌──────────┬──────────────────────────────┐
│ Sidebar  │  Top Bar (page title)        │
│          ├──────────────────────────────│
│ Dashboard│  Page Content                │
│ Ask AI   │  (FileUpload / Dashboard /   │
│ Citizens │   CitizenDetail / Chat)      │
│ Reports  │                              │
│ Settings │                              │
└──────────┴──────────────────────────────┘
```

**State flow:**
1. User uploads files → `FileUpload` calls API
2. User clicks "Run Analysis" → `FileUpload` shows shimmer skeleton
3. Analysis completes → `Dashboard` appears with results
4. User clicks sidebar "Ask AI" → `ChatPanel` appears

---

### `api.ts` — The Messenger

**Job:** Axios wrapper — sends HTTP requests to the backend.

Each function maps to one backend endpoint:
```
uploadFiles()     → POST /api/upload      (with file upload progress tracking)
runAnalysis()     → POST /api/analyze
getCitizens()     → GET  /api/citizens
getCitizenDetail()→ GET  /api/citizens/{id}
getCitizenHealth()→ GET  /api/citizens/{id}/health
chat()            → POST /api/chat
```

---

### `FileUpload.tsx` — Upload + Analyze

**Job:** Two-step process:

**Step 1 — Upload:**
- 4 file slots (users.json, status.csv, locations.json, personas.md)
- Real upload progress bar (0-60% from axios, 60-100% for indexing)
- Upload button disabled until all 4 files selected

**Step 2 — Analyze:**
- "Run Analysis" button appears after upload
- Progress bar steps through agent phases:
  1. "Loading citizen data..." (10%)
  2. "Data Analyst (Python math)..." (30%)
  3. "Persona Analyst (LLM)..." (50%)
  4. "Risk Classifier (LLM)..." (70%)
  5. "Finalizing..." (90%)
- Shimmer skeleton shows on the dashboard area while waiting

---

### `Dashboard.tsx` — The Main View

**Job:** Shows analysis results in a professional dashboard layout.

**4 Stat Cards** (top row):
- Total Citizens (blue icon)
- At Risk (red icon + "↑ needs support" badge)
- Healthy (green icon + "↓ stable" badge)
- Borderline (orange icon)

**Citizen Table:**
- Columns: Full Name, Occupation, City, Status, Signals, Score
- Each row has a colored initials avatar (deterministic color per person)
- Status badges: red "At Risk" / yellow "Borderline" / green "Healthy"
- Signal count ("3 alerts")
- Rows sorted: at-risk first → borderline → healthy
- Click a row → navigates to citizen detail page

---

### `CitizenDetail.tsx` — Full Profile

**Job:** Deep-dive page for one citizen.

**Sections:**
1. **Banner** — gradient background, avatar + name + status badge + risk score
2. **Info pills** — job, city, birth year, GPS pings, movement status
3. **3 Metric cards** — Activity, Sleep, Exposure (current value + trend arrow + change)
4. **Area chart** — health trends over time with gradient fills
5. **Bento grid:**
   - Warning Signals (red cards with dots)
   - AI Behavioral Analysis (purple accent border)
   - Classification Reasoning
6. **Persona Profile** — full backstory text in scrollable block

---

### `HealthChart.tsx` — The Chart

**Job:** Renders an area chart with 3 data lines:
- **Activity** (green) — should stay high, declining = bad
- **Sleep** (purple) — should stay high, declining = bad
- **Exposure** (red) — should stay low, rising = bad

Uses Recharts `AreaChart` with gradient fills under each line.

---

### `ChatPanel.tsx` — Ask the AI

**Job:** RAG-powered chat. User types a question, AI answers using citizen data.

**How it works:**
1. User types "Who has declining sleep?"
2. Frontend sends to `POST /api/chat`
3. Backend searches ChromaDB for matching citizens (Retrieval)
4. Gives matches + analysis results to GPT-4o-mini (Augmented Generation)
5. AI answers: "WNACROYX (Craig Connor) has significant sleep decline from 58 to 20..."

**Features:**
- 3 preset suggestion chips when empty
- Chat bubbles (user = blue background, AI = gray)
- Loading spinner while waiting

---

## How Everything Connects

```
User clicks "Upload" in React
  → FileUpload.tsx calls api.uploadFiles()
    → FastAPI POST /api/upload
      → data_loader.set_data_dir() (point at uploaded files)
      → vector_store.store_personas() (embed in ChromaDB)
    ← Returns: "5 citizens loaded, 5 personas indexed"

User clicks "Run Analysis"
  → FileUpload.tsx calls api.runAnalysis()
    → FastAPI POST /api/analyze
      → agents.run_analysis()
        → Agent 1: tools.analyze_citizen() for each citizen (Python math)
        → Agent 2: persona_agent calls get_persona_and_location tool → ChromaDB + data_loader
        → Agent 3: classifier_agent makes final 0/1 decision
    ← Returns: flagged IDs + all results + summary

Dashboard loads
  → Dashboard.tsx calls api.getCitizens()
    → FastAPI GET /api/citizens
      → data_loader.load_users() + cached analysis results
    ← Returns: citizen list with risk scores

User clicks a citizen
  → CitizenDetail.tsx calls api.getCitizenDetail() + api.getCitizenHealth()
    → FastAPI GET /api/citizens/{id} + GET /api/citizens/{id}/health
      → data_loader + vector_store.get_context()
    ← Returns: full profile + health events

User asks a question
  → ChatPanel.tsx calls api.chat()
    → FastAPI POST /api/chat
      → vector_store.search() (find relevant citizens by meaning)
      → GPT-4o-mini answers using context
    ← Returns: answer + source citizen IDs
```

---

## Key Concepts Explained

### RAG (Retrieval-Augmented Generation)
Instead of asking the AI "Who is sick?" with no context (it would hallucinate), we:
1. **Retrieve** relevant data from ChromaDB (vector search by meaning)
2. **Augment** the AI's prompt with that data
3. **Generate** an answer that's grounded in real data

### Multi-Agent System
Instead of one big AI doing everything, we split the work:
- **Data Analyst** — cheap Python math handles 80% of the work (free)
- **Persona Analyst** — expensive LLM only for risky citizens
- **Risk Classifier** — expensive LLM only for borderline cases

This saves money: ~15-20 LLM calls for 30 citizens instead of 90+.

### ChromaDB (Vector Database)
Stores text as numbers (embeddings). When you search "who stopped socializing?", it finds "Craig cancels plans" because the **meaning** is similar — even though the words are different.

### create_agent + @tool
LangChain's pattern for giving AI agents abilities:
- `@tool` decorates a Python function so an agent can call it
- `create_agent(model, tools=[...])` creates an AI that can decide which tools to use
- The agent reads the tool descriptions and picks the right one for the task

### FastAPI
A Python web framework. Each endpoint is just a decorated function:
```python
@app.get("/api/citizens")
def get_citizens():
    return load_users()  # React receives this as JSON
```
React calls these endpoints using axios (`api.getCitizens()`).

---

## Example Data — What Each Function Returns

### `data_loader.py` — Raw Data Examples

**`load_users()`** → returns a list of citizen dicts:
```json
[
  {
    "user_id": "WNACROYX",
    "first_name": "Craig",
    "last_name": "Connor",
    "birth_year": 1991,
    "job": "Ride-share Driver",
    "residence": { "city": "Bath", "lat": "51.3814", "lng": "-2.3597" }
  },
  {
    "user_id": "DCGGXUWF",
    "first_name": "George",
    "last_name": "Neal",
    "birth_year": 1931,
    "job": "Retired",
    "residence": { "city": "Detroit", "lat": "42.3834", "lng": "-83.1024" }
  }
]
```

**`load_health_data()`** → returns a dict grouped by citizen ID:
```json
{
  "WNACROYX": [
    {"EventID": "31", "CitizenID": "WNACROYX", "EventType": "routine check-up",
     "PhysicalActivityIndex": "53", "SleepQualityIndex": "58",
     "EnvironmentalExposureLevel": "45", "Timestamp": "2026-01-01T00:00:00"},
    {"EventID": "34", "CitizenID": "WNACROYX", "EventType": "specialist consultation",
     "PhysicalActivityIndex": "44", "SleepQualityIndex": "55",
     "EnvironmentalExposureLevel": "54", "Timestamp": "2026-07-08T06:54:20"},
    {"EventID": "40", "CitizenID": "WNACROYX", "EventType": "follow-up assessment",
     "PhysicalActivityIndex": "17", "SleepQualityIndex": "20",
     "EnvironmentalExposureLevel": "91", "Timestamp": "2026-10-22T23:28:49"}
  ],
  "DCGGXUWF": [
    {"EventID": "41", "CitizenID": "DCGGXUWF", "EventType": "routine check-up",
     "PhysicalActivityIndex": "41", "SleepQualityIndex": "45",
     "EnvironmentalExposureLevel": "32", "Timestamp": "2026-01-01T00:00:00"},
    {"EventID": "50", "CitizenID": "DCGGXUWF", "EventType": "routine check-up",
     "PhysicalActivityIndex": "36", "SleepQualityIndex": "49",
     "EnvironmentalExposureLevel": "32", "Timestamp": "2026-11-16T04:27:48"}
  ]
}
```

**`load_persona("WNACROYX")`** → returns a string:
```
## WNACROYX - Craig Connor
**Age:** 35 | **Occupation:** Ride-share Driver | **City:** Bath, United Kingdom

Craig is a full-time ride-share driver based in Bath. His schedule is irregular
and has become more so recently... He used to be sociable, spending off-hours at
pubs and watching football with mates, but friends have noted he has been
cancelling plans more often. His diet has shifted heavily toward energy drinks
and fast food... He has mentioned persistent back pain from driving and has
started sleeping poorly...

**Mobility:** Variable. Can be very high during active periods, but has been
taking more days off. International travel has stopped.
**Health behavior:** Irregular meals, heavy reliance on energy drinks. Mentioned
back pain. Sleep issues. Avoids medical checkups.
**Social pattern:** Previously active social life, now increasingly cancelling
plans. Spending more time alone.
```

**`load_locations("WNACROYX")`** → returns a dict:
```json
{
  "total_pings": 479,
  "unique_cities": ["Bath", "Bristol", "Cardiff", "London", "Newport", "Swindon"],
  "first_half_cities": 6,
  "second_half_cities": 1,
  "movement_shrinking": true
}
```

**`load_locations("IAFGUHCK")`** → healthy citizen:
```json
{
  "total_pings": 203,
  "unique_cities": ["Ostwald", "Strasbourg"],
  "first_half_cities": 2,
  "second_half_cities": 2,
  "movement_shrinking": false
}
```

---

### `tools.py` — Tool & Analysis Examples

**`@tool get_persona_and_location("WNACROYX")`** → returns a string the agent reads:
```
## WNACROYX - Craig Connor
**Age:** 35 | **Occupation:** Ride-share Driver | **City:** Bath, United Kingdom

Craig is a full-time ride-share driver based in Bath... cancelling plans more
often... energy drinks and fast food... persistent back pain... sleeping poorly...

**Mobility:** Variable...
**Health behavior:** Irregular meals...
**Social pattern:** Previously active social life, now increasingly cancelling plans...

Location: 479 pings, 6 cities (movement shrinking)
```

**`@tool search_similar_citizens("who is withdrawing from friends?")`** → returns JSON:
```json
[
  {"citizen_id": "WNACROYX", "text": "## WNACROYX - Craig Connor\n**Age:** 35 | **Occupation:** Ride-share Driver...\nCraig is a full-time ride-share driver... cancelling plans more often..."},
  {"citizen_id": "DCGGXUWF", "text": "## DCGGXUWF - George Neal\n**Age:** 95 | **Occupation:** Retired...\nGeorge is a retired autoworker... daughter lives ten minutes away..."},
  {"citizen_id": "IXTDRHTR", "text": "## IXTDRHTR - Natasha Turner\n**Age:** 90 | **Occupation:** Retired...\nNatasha is a long-retired schoolteacher..."}
]
```
Note: Craig is returned first because "cancelling plans" is semantically closest to "withdrawing from friends" — even though the exact words don't match.

**`analyze_citizen("WNACROYX", health_records)`** → returns a dict:
```json
{
  "citizen_id": "WNACROYX",
  "risk_score": 19,
  "category": "HIGH_RISK",
  "signals": [
    "Activity dropped: 53 -> 17",
    "Sleep dropped: 58 -> 20",
    "Exposure spiked: 45 -> 91",
    "Specialist visits: 3",
    "Follow-ups: 3",
    "Movement shrinking: 6 -> 1 cities"
  ],
  "location": {
    "total_pings": 479,
    "unique_cities": ["Bath", "Bristol", "Cardiff", "London", "Newport", "Swindon"],
    "first_half_cities": 6,
    "second_half_cities": 1,
    "movement_shrinking": true
  }
}
```

**`analyze_citizen("DCGGXUWF", health_records)`** → borderline citizen:
```json
{
  "citizen_id": "DCGGXUWF",
  "risk_score": 2,
  "category": "BORDERLINE",
  "signals": [
    "Activity declining: 41 -> 36",
    "Movement shrinking: 2 -> 1 cities"
  ],
  "location": {
    "total_pings": 187,
    "unique_cities": ["Detroit"],
    "first_half_cities": 2,
    "second_half_cities": 1,
    "movement_shrinking": true
  }
}
```

**`analyze_citizen("RFLFWVQA", health_records)`** → healthy citizen:
```json
{
  "citizen_id": "RFLFWVQA",
  "risk_score": 0,
  "category": "LOW_RISK",
  "signals": [],
  "location": {
    "total_pings": 312,
    "unique_cities": ["St. Louis Park", "Minneapolis", "New York", "Paris"],
    "first_half_cities": 3,
    "second_half_cities": 4,
    "movement_shrinking": false
  }
}
```

---

### `vector_store.py` — ChromaDB Examples

**`store_personas(data_dir)`** → returns count: `5`
(Stored 5 citizen personas as vector embeddings in ChromaDB)

**`search("who has sleep problems?", k=3)`** → returns:
```json
[
  {
    "citizen_id": "WNACROYX",
    "text": "## WNACROYX - Craig Connor\n**Age:** 35 | **Occupation:** Ride-share Driver...\nHe has mentioned persistent back pain from driving and has started sleeping poorly, sometimes only managing a few hours...",
    "distance": 0.342
  },
  {
    "citizen_id": "IXTDRHTR",
    "text": "## IXTDRHTR - Natasha Turner\n**Age:** 90 | **Occupation:** Retired...\nHer health is stable and she manages several chronic conditions...",
    "distance": 0.587
  },
  {
    "citizen_id": "DCGGXUWF",
    "text": "## DCGGXUWF - George Neal\n**Age:** 95 | **Occupation:** Retired...\nHe manages several age-related conditions but his care is well-coordinated...",
    "distance": 0.612
  }
]
```
Distance = how far apart the meanings are. Lower = closer match. Craig (0.342) is the best match because his persona mentions "sleeping poorly".

**`get_context("WNACROYX")`** → returns a string:
```
## WNACROYX - Craig Connor
**Age:** 35 | **Occupation:** Ride-share Driver | **City:** Bath, United Kingdom

Craig is a full-time ride-share driver based in Bath. His schedule is irregular
and has become more so recently...
```

**`get_context("NONEXIST")`** → returns empty string: `""`

---

### `agents.py` — Agent Output Examples

**Agent 2 (Persona Analyst) for Craig:**
```
Craig shows clear signs of deteriorating wellbeing — he has withdrawn from
his social circle, is cancelling plans with friends, relying heavily on
energy drinks and fast food, and reports persistent back pain and severe
sleep disruption. His movement has contracted from 6 cities to just 1,
suggesting increasing isolation and reduced daily functioning.
```

**Agent 3 (Risk Classifier) for George:**
```json
{
  "classification": 0,
  "explanation": "Despite mild activity decline (41→36) and reduced movement range, George has a well-coordinated care system with daily daughter visits, a home aide three times a week, and regular medical monitoring. His support network compensates for age-related physical decline."
}
```

**Agent 3 for a borderline citizen flagged as at-risk:**
```json
{
  "classification": 1,
  "explanation": "Kelly shows escalating withdrawal from social activities combined with declining physical metrics and increased specialist consultations. The persona indicates skipping meals and headaches, suggesting progressive health deterioration requiring preventive intervention."
}
```

---

### `main.py` — API Response Examples

**`POST /api/upload`** response:
```json
{
  "status": "ok",
  "citizens": 5,
  "personas_embedded": 5
}
```

**`POST /api/analyze`** response:
```json
{
  "flagged": ["WNACROYX"],
  "summary": { "total": 5, "flagged": 1, "healthy": 4 },
  "results": [
    {
      "citizen_id": "WNACROYX",
      "name": "Craig Connor",
      "risk_score": 19,
      "category": "HIGH_RISK",
      "classification": 1,
      "signals": ["Activity dropped: 53 -> 17", "Sleep dropped: 58 -> 20", "..."],
      "persona_analysis": "Craig shows clear signs of deteriorating wellbeing..."
    },
    {
      "citizen_id": "DCGGXUWF",
      "name": "George Neal",
      "risk_score": 2,
      "category": "BORDERLINE",
      "classification": 0,
      "signals": ["Activity declining: 41 -> 36", "Movement shrinking: 2 -> 1 cities"],
      "persona_analysis": "George has strong support systems...",
      "explanation": "Despite mild declines, George has well-coordinated care..."
    },
    {
      "citizen_id": "RFLFWVQA",
      "name": "Denise Fisher",
      "risk_score": 0,
      "category": "LOW_RISK",
      "classification": 0,
      "signals": []
    }
  ]
}
```

**`POST /api/chat`** with `{"message": "Who has declining sleep?"}`:
```json
{
  "answer": "WNACROYX (Craig Connor) shows the most significant sleep decline in the dataset, with his SleepQualityIndex dropping from 58 to 20 over the monitoring period. His persona also mentions he has 'started sleeping poorly, sometimes only managing a few hours.' He has been classified as At Risk with a risk score of 19.",
  "sources": ["WNACROYX", "IXTDRHTR", "DCGGXUWF"]
}
```
