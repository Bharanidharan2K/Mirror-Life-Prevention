import os, json, csv

DATA_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_data')

def set_data_dir(data_dir):
    global DATA_DIR
    DATA_DIR = data_dir


def load_users() -> list:
    with open(os.path.join(DATA_DIR, 'users.json'), 'r') as f:
        return json.load(f)


def load_status() -> dict:
    records = {}
    with open(os.path.join(DATA_DIR, 'status.csv'), 'r') as f:
        for row in csv.DictReader(f):
            records.setdefault(row["CitizenID"], []).append(row)
    return records


def load_persona(citizen_id: str) -> str:
    with open(os.path.join(DATA_DIR, "personas.md"), "r", encoding="utf-8") as f:
        content = f.read()
    for section in content.split("## "):
        if citizen_id.upper() in section.upper():
            return "## " + section.strip()
    return ""


def load_locations(citizen_id: str) -> dict:
    with open(os.path.join(DATA_DIR, "locations.json"), "r", encoding="utf-8") as f:
        data = json.load(f)
    pings = [p for p in data if p["user_id"] == citizen_id]
    if not pings:
        return {"total_pings": 0, "unique_cities": [], "movement_shrinking": False}

    cities = list(set(p.get("city", "?") for p in pings))
    mid = len(pings) // 2
    first_half = set(p.get("city", "?") for p in pings[:mid])
    second_half = set(p.get("city", "?") for p in pings[mid:])

    return {
        "total_pings": len(pings),
        "unique_cities": cities,
        "first_half_cities": len(first_half),
        "second_half_cities": len(second_half),
        "movement_shrinking": len(second_half) < len(first_half),
    }
        
