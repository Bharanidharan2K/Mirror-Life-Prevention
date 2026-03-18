# 3 agents: Data Analyst (free) → Persona Analyst (LLM) → Risk Classifier (LLM)

import os, json
from dotenv import load_dotenv
from langchain.agents import create_agent
from langchain_openai import ChatOpenAI
from langchain_core.messages import HumanMessage

from data_loader import load_users, load_status
from tools import get_persona_and_location, search_similar_citizens, analyze_citizen

load_dotenv()

model = ChatOpenAI(api_key=os.getenv("OPENAI_API_KEY"), model="gpt-4o-mini", temperature=0.1, max_tokens=1000)


# --- Agent 1: Data Analyst (Python math — FREE) ---

def run_data_analyst() -> dict:
    users = load_users()
    health = load_status()
    buckets = {"high_risk": [], "borderline": [], "low_risk": []}

    for user in users:
        cid = user["user_id"]
        result = analyze_citizen(cid, health.get(cid, []))
        result["name"] = f"{user['first_name']} {user['last_name']}"
        key = result["category"].lower()
        buckets.get(key, buckets["low_risk"]).append(result)

    return buckets


# --- Agent 2: Persona Analyst (create_agent + tools) ---

persona_agent = create_agent(
    model=model,
    system_prompt=(
        "You are a behavioral health analyst. "
        "Use get_persona_and_location to read the citizen's backstory. "
        "Identify warning signs: withdrawal, sleep issues, appetite loss, pain, isolation. "
        "Be brief — 2-3 sentences."
    ),
    tools=[get_persona_and_location, search_similar_citizens],
)


def run_persona_analyst(citizen_id: str, signals: list) -> str:
    resp = persona_agent.invoke({"messages": [HumanMessage(
        f"Analyze citizen {citizen_id}. Health signals: {', '.join(signals) or 'None'}. "
        f"Use get_persona_and_location to read their backstory, then identify warning signs."
    )]})
    return resp["messages"][-1].content


# --- Agent 3: Risk Classifier (create_agent + tools) ---

classifier_agent = create_agent(
    model=model,
    system_prompt=(
        "You are a risk classifier. Classify as 0 (healthy) or 1 (needs support). "
        "Use get_persona_and_location if you need more context. "
        'Respond with JSON only: {"classification": 0 or 1, "explanation": "reason"}'
    ),
    tools=[get_persona_and_location],
)


def run_classifier(citizen_id: str, signals: list, persona_analysis: str) -> dict:
    resp = classifier_agent.invoke({"messages": [HumanMessage(
        f"Classify citizen {citizen_id}.\n"
        f"Health signals: {', '.join(signals)}\n"
        f"Behavioral analysis: {persona_analysis}\n"
        f'Respond JSON only: {{"classification": 0 or 1, "explanation": "why"}}'
    )]})
    text = resp["messages"][-1].content
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        at_risk = '"classification": 1' in text or '"classification":1' in text
        return {"classification": 1 if at_risk else 0, "explanation": text}


# --- Pipeline: runs all 3 agents ---

def run_analysis() -> dict:
    data = run_data_analyst()
    all_results, flagged = [], []

    for c in data["high_risk"]:
        pa = run_persona_analyst(c["citizen_id"], c["signals"])
        all_results.append({**c, "classification": 1, "persona_analysis": pa})
        flagged.append(c["citizen_id"])

    for c in data["borderline"]:
        pa = run_persona_analyst(c["citizen_id"], c["signals"])
        decision = run_classifier(c["citizen_id"], c["signals"], pa)
        is_flagged = decision.get("classification") == 1
        all_results.append({**c, "classification": 1 if is_flagged else 0, "persona_analysis": pa, "explanation": decision.get("explanation", "")})
        if is_flagged:
            flagged.append(c["citizen_id"])

    for c in data["low_risk"]:
        all_results.append({**c, "classification": 0})

    total = len(all_results)
    return {"flagged": flagged, "all_results": all_results, "summary": {"total": total, "flagged": len(flagged), "healthy": total - len(flagged)}}
