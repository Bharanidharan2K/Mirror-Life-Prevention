import os, chromadb
from dotenv import load_dotenv

load_dotenv()

CHROMA_DIR = os.path.join(os.path.dirname(__file__), 'chroma_data')
_client = chromadb.PersistentClient(path=CHROMA_DIR)
_collection = None

def _get_collection():
    global _collection
    if _collection is None:
        from chromadb.utils import embedding_functions
        ef = embedding_functions.OpenAIEmbeddingFunction(
            api_key=os.getenv("OPENAI_API_KEY"),
            model_name="text-embedding-3-small",
        )
        _collection = _client.get_or_create_collection(name="citizen_personas", embedding_function=ef)
    return _collection

def store_personas(data_dir: str) -> int:
    """Parse personas.md and store each citizen's text in ChromaDB."""
    global _collection

    # Reset collection
    try:
        _client.delete_collection("citizen_personas")
    except Exception:
        pass
    _collection = None
    col = _get_collection()

    with open(os.path.join(data_dir, "personas.md"), "r", encoding="utf-8") as f:
        content = f.read()

    docs, ids, metas = [], [], []
    for section in content.split("## ")[1:]:
        first_line = section.strip().split("\n")[0].strip()
        cid = first_line.split(" ")[0].split("-")[0].strip()
        if len(cid) != 8:
            continue
        name = first_line.split("-", 1)[1].strip() if "-" in first_line else "Unknown"
        docs.append("## " + section.strip())
        ids.append(cid)
        metas.append({"citizen_id": cid, "name": name})

    if docs:
        col.add(documents=docs, ids=ids, metadatas=metas)
    return len(docs)


def search(query: str, k: int = 3) -> list[dict]:
    """Search personas by meaning. Returns [{citizen_id, text, distance}]."""
    col = _get_collection()
    if col.count() == 0:
        return []
    results = col.query(query_texts=[query], n_results=min(k, col.count()))
    return [
        {"citizen_id": results["ids"][0][i], "text": results["documents"][0][i][:500], "distance": results["distances"][0][i]}
        for i in range(len(results["ids"][0]))
    ]


def get_context(citizen_id: str) -> str:
    """Get stored persona text for one citizen."""
    try:
        result = _get_collection().get(ids=[citizen_id])
        if result["documents"]:
            return result["documents"][0]
    except Exception:
        pass
    return ""