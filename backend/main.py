# FastAPI server — Run: uvicorn main:app --reload — Docs: http://localhost:8000/docs

import os, json
from dotenv import load_dotenv
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage, SystemMessage

load_dotenv()

from data_loader import set_data_dir, load_users, load_status, load_locations
from vector_store import store_personas, search, get_context
from agents import run_analysis

app = FastAPI(title="MirrorLife Preventive Health API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

results = {}


@app.get("/")
def root():
    return {"status": "ok", "app": "MirrorLife Preventive Health"}


@app.post("/api/upload")
async def upload(
    users: UploadFile = File(...),
    status: UploadFile = File(...),
    locations: UploadFile = File(...),
    personas: UploadFile = File(...),
):
    upload_dir = os.path.join(os.path.dirname(__file__), "uploads", "current")
    os.makedirs(upload_dir, exist_ok=True)

    for name, f in {"users.json": users, "status.csv": status, "locations.json": locations, "personas.md": personas}.items():
        with open(os.path.join(upload_dir, name), "wb") as out:
            out.write(await f.read())

    set_data_dir(upload_dir)
    count = store_personas(upload_dir)

    with open(os.path.join(upload_dir, "users.json"), "r", encoding="utf-8") as f:
        citizens = len(json.load(f))

    return {"status": "ok", "citizens": citizens, "personas_embedded": count}


@app.post("/api/analyze")
def analyze():
    global results
    results = run_analysis()
    return {"flagged": results["flagged"], "summary": results["summary"], "results": results["all_results"]}


@app.get("/api/citizens")
def list_citizens():
    users = load_users()
    risk_map = {r["citizen_id"]: r for r in results.get("all_results", [])}
    return [
        {
            "user_id": u["user_id"],
            "name": f"{u['first_name']} {u['last_name']}",
            "birth_year": u["birth_year"],
            "job": u["job"],
            "city": u["residence"]["city"],
            **({"classification": risk_map[u["user_id"]].get("classification"),
                "risk_score": risk_map[u["user_id"]].get("risk_score"),
                "category": risk_map[u["user_id"]].get("category"),
                "signals": risk_map[u["user_id"]].get("signals", [])}
               if u["user_id"] in risk_map else {}),
        }
        for u in users
    ]


@app.get("/api/citizens/{citizen_id}")
def citizen_detail(citizen_id: str):
    users = load_users()
    user = next((u for u in users if u["user_id"] == citizen_id), None)
    if not user:
        raise HTTPException(404, "Citizen not found")

    risk = next((r for r in results.get("all_results", []) if r["citizen_id"] == citizen_id), {})
    return {
        "user_id": citizen_id,
        "name": f"{user['first_name']} {user['last_name']}",
        "birth_year": user["birth_year"],
        "job": user["job"],
        "city": user["residence"]["city"],
        "lat": user["residence"]["lat"],
        "lng": user["residence"]["lng"],
        "persona": get_context(citizen_id),
        "location": load_locations(citizen_id),
        "classification": risk.get("classification"),
        "risk_score": risk.get("risk_score"),
        "signals": risk.get("signals", []),
        "persona_analysis": risk.get("persona_analysis", ""),
        "explanation": risk.get("explanation", ""),
    }


@app.get("/api/citizens/{citizen_id}/health")
def citizen_health(citizen_id: str):
    records = load_status().get(citizen_id, [])
    return {
        "citizen_id": citizen_id,
        "events": [
            {"timestamp": r["Timestamp"], "activity": int(r["PhysicalActivityIndex"]),
             "sleep": int(r["SleepQualityIndex"]), "exposure": int(r["EnvironmentalExposureLevel"]),
             "event_type": r["EventType"]}
            for r in records
        ],
    }


@app.post("/api/chat")
def chat(body: dict):
    message = body.get("message", "")
    if not message:
        raise HTTPException(400, "Message required")

    hits = search(message, k=3)
    context = "\n\n".join(f"Citizen {r['citizen_id']}:\n{r['text']}" for r in hits)

    if results.get("all_results"):
        context += "\n\nAnalysis:\n" + "\n".join(
            f"- {r['citizen_id']} ({r.get('name','?')}): {'AT-RISK' if r.get('classification')==1 else 'HEALTHY'} (score:{r.get('risk_score','?')})"
            for r in results["all_results"]
        )

    llm = ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4o-mini", temperature=0.3)
    resp = llm.invoke([
        SystemMessage(content=f"Answer about citizens using this context:\n{context}"),
        HumanMessage(content=message),
    ])
    return {"answer": resp.content, "sources": [r["citizen_id"] for r in hits]}
