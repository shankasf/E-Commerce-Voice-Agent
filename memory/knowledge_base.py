import os
from pathlib import Path
from typing import List

from agents import function_tool

try:
    import chromadb
    from chromadb.utils import embedding_functions
except ImportError:  # pragma: no cover - handled at runtime
    chromadb = None  # type: ignore
    embedding_functions = None  # type: ignore


_BASE_DIR = Path(__file__).resolve().parent.parent
_DATA_FILE = _BASE_DIR / "kidz4fun.txt"
_CHROMA_PATH = Path(__file__).resolve().parent / "chroma_store"
_COLLECTION_NAME = "kidz4fun_docs"

_client = None
_collection = None


def _split_text(text: str, chunk_size: int = 600, overlap: int = 120) -> List[str]:
    chunks: List[str] = []
    start = 0
    length = len(text)
    while start < length:
        end = min(start + chunk_size, length)
        chunk = text[start:end].strip()
        if chunk:
            chunks.append(chunk)
        if end == length:
            break
        start = max(end - overlap, 0)
    return chunks


def _ensure_collection():
    global _client, _collection

    if chromadb is None:
        return None

    _CHROMA_PATH.mkdir(parents=True, exist_ok=True)

    if _client is None:
        _client = chromadb.PersistentClient(path=str(_CHROMA_PATH))

    if _collection is None:
        embedding_fn = embedding_functions.DefaultEmbeddingFunction()
        _collection = _client.get_or_create_collection(
            name=_COLLECTION_NAME,
            embedding_function=embedding_fn,
        )

    if not _DATA_FILE.exists():
        return _collection

    with _DATA_FILE.open("r", encoding="utf-8") as f:
        raw_text = f.read()

    chunks = _split_text(raw_text)
    if chunks:
        ids = [f"{_COLLECTION_NAME}-{idx}" for idx in range(len(chunks))]
        _collection.upsert(ids=ids, documents=chunks)

    return _collection


@function_tool
def lookup_store_info(question: str, top_k: int = 4) -> str:
    """
    Retrieve store FAQ or general information using a local ChromaDB index backed by kidz4fun.txt.
    """
    collection = _ensure_collection()
    if chromadb is None or collection is None:
        return (
            "Knowledge base unavailable. Please install the 'chromadb' package and "
            "ensure kidz4fun.txt is present."
        )

    if collection.count() == 0:
        return "Knowledge base is empty."

    result = collection.query(query_texts=[question], n_results=top_k)
    documents = result.get("documents") or []
    if not documents or not documents[0]:
        return "No matching knowledge found."

    distances = (result.get("distances") or [[]])[0]
    snippets: List[str] = []
    for idx, doc in enumerate(documents[0]):
        if not doc:
            continue
        distance = distances[idx] if distances and idx < len(distances) else None
        if distance is not None and distance > 1.5:
            continue
        snippets.append(doc.strip())

    if not snippets:
        return "No matching knowledge found."

    return "Knowledge results:\n" + "\n---\n".join(snippets[:top_k])
