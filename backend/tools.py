import json
from langchain.tools import tool
from data_loader import load_persona, load_locations
from vector_store import search, get_context

@tool
def get_persona_and_location(citizen_id: str) -> str:
    """Get a citizen's persona backstory and location summary."""
    persona = get_context(citizen_id) or load_persona(citizen_id)
    loc = load_locations(citizen_id)
    loc_text = f"Location: {loc['total_pings']} pings, {len(loc['unique_cities'])} cities"
    if loc.get("movement_shrinking"):
        loc_text += " (movement shrinking)"
    return f"{persona}\n\n{loc_text}"

@tool
def search_similar_citizens(query: str) -> str:
    """Search for citizens matching a description by meaning (RAG)."""
    results = search(query, k=3)
    return json.dumps([{"citizen_id": r["citizen_id"], "text": r["text"][:300]} for r in results])


def analyze_citizen(citizen_id: str, health_records: list) -> dict:
    signals, risk_score = [], 0

    if health_records:
        act = [int(r["PhysicalActivityIndex"]) for r in health_records]
        slp = [int(r["SleepQualityIndex"]) for r in health_records]
        exp = [int(r["EnvironmentalExposureLevel"]) for r in health_records]
        events = [r["EventType"] for r in health_records]

        # Declining activity
        if len(act) >= 2 and act[0] - act[-1] >= 15:
            signals.append(f"Activity dropped: {act[0]} -> {act[-1]}")
            risk_score += 3
        elif len(act) >= 2 and act[0] - act[-1] >= 5:
            signals.append(f"Activity declining: {act[0]} -> {act[-1]}")
            risk_score += 1

        # Declining sleep
        if len(slp) >= 2 and slp[0] - slp[-1] >= 15:
            signals.append(f"Sleep dropped: {slp[0]} -> {slp[-1]}")
            risk_score += 3
        elif len(slp) >= 2 and slp[0] - slp[-1] >= 5:
            signals.append(f"Sleep declining: {slp[0]} -> {slp[-1]}")
            risk_score += 1

        # Rising exposure
        if len(exp) >= 2 and exp[-1] - exp[0] >= 20:
            signals.append(f"Exposure spiked: {exp[0]} -> {exp[-1]}")
            risk_score += 3
        elif len(exp) >= 2 and exp[-1] - exp[0] >= 10:
            signals.append(f"Exposure rising: {exp[0]} -> {exp[-1]}")
            risk_score += 1

        # Escalating visit types
        for label, keyword, weight in [
            ("Specialist visits", "specialist", 2),
            ("Follow-ups", "follow-up", 1),
            ("Emergency visits", "emergency", 3),
        ]:
            count = sum(1 for e in events if keyword in e.lower())
            if count:
                signals.append(f"{label}: {count}")
                risk_score += weight * count

    # Location: becoming homebound?
    loc = load_locations(citizen_id)
    if loc["total_pings"] > 0 and loc["movement_shrinking"]:
        signals.append(f"Movement shrinking: {loc['first_half_cities']} -> {loc['second_half_cities']} cities")
        risk_score += 1

    category = "HIGH_RISK" if risk_score >= 5 else "BORDERLINE" if risk_score >= 2 else "LOW_RISK"
    return {"citizen_id": citizen_id, "risk_score": risk_score, "category": category, "signals": signals, "location": loc}
