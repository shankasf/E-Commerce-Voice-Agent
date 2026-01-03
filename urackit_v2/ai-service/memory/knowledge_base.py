"""
Knowledge base module for URackIT AI Service.

Provides semantic search over the knowledge text file using ChromaDB.
"""

import os
import logging
from pathlib import Path
from typing import List, Optional

from agents import function_tool

logger = logging.getLogger(__name__)

# Try to import ChromaDB
try:
    import chromadb
    from chromadb.utils import embedding_functions
    CHROMADB_AVAILABLE = True
except ImportError:
    chromadb = None
    embedding_functions = None
    CHROMADB_AVAILABLE = False
    logger.warning("ChromaDB not installed. Knowledge base features disabled.")


_BASE_DIR = Path(__file__).resolve().parent.parent
_DATA_FILE = _BASE_DIR / "urackit_knowledge.txt"
_CHROMA_PATH = Path(__file__).resolve().parent / "chroma_store"
_COLLECTION_NAME = "urackit_docs"

_client = None
_collection = None


def _split_text(text: str, chunk_size: int = 600, overlap: int = 120) -> List[str]:
    """Split text into overlapping chunks for embedding."""
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
        start = end - overlap
        if start < 0:
            start = 0
    
    return chunks


def _ensure_collection():
    """Initialize ChromaDB collection with knowledge base content."""
    global _client, _collection
    
    if not CHROMADB_AVAILABLE:
        return None
    
    try:
        _CHROMA_PATH.mkdir(parents=True, exist_ok=True)
        
        if _client is None:
            _client = chromadb.PersistentClient(path=str(_CHROMA_PATH))
        
        if _collection is None:
            embedding_fn = embedding_functions.DefaultEmbeddingFunction()
            _collection = _client.get_or_create_collection(
                name=_COLLECTION_NAME,
                embedding_function=embedding_fn,
            )
        
        # Load knowledge base if exists and collection is empty
        if _DATA_FILE.exists() and _collection.count() == 0:
            with _DATA_FILE.open("r", encoding="utf-8") as f:
                raw_text = f.read()
            
            chunks = _split_text(raw_text)
            if chunks:
                ids = [f"{_COLLECTION_NAME}-{idx}" for idx in range(len(chunks))]
                _collection.upsert(ids=ids, documents=chunks)
                logger.info(f"Loaded {len(chunks)} chunks into knowledge base")
        
        return _collection
    except Exception as e:
        logger.error(f"Error initializing knowledge base: {e}")
        return None


def reload_knowledge_base() -> str:
    """Reload the knowledge base from the text file."""
    global _collection
    
    if not CHROMADB_AVAILABLE:
        return "ChromaDB not installed"
    
    try:
        if _client is None:
            _ensure_collection()
        
        if _collection is not None:
            # Clear existing data
            _collection.delete(where={})
        
        if not _DATA_FILE.exists():
            return f"Knowledge file not found: {_DATA_FILE}"
        
        with _DATA_FILE.open("r", encoding="utf-8") as f:
            raw_text = f.read()
        
        chunks = _split_text(raw_text)
        if chunks:
            ids = [f"{_COLLECTION_NAME}-{idx}" for idx in range(len(chunks))]
            _collection.upsert(ids=ids, documents=chunks)
        
        return f"Reloaded {len(chunks)} chunks into knowledge base"
    except Exception as e:
        return f"Error reloading: {e}"


@function_tool
def lookup_support_info(question: str, top_k: int = 4) -> str:
    """
    Retrieve IT support information using a local ChromaDB index.
    Use this to find troubleshooting steps, procedures, and support information.
    
    Args:
        question: The question or topic to search for
        top_k: Number of results to return (default 4)
    
    Returns:
        Relevant support information from the knowledge base
    """
    collection = _ensure_collection()
    
    if not CHROMADB_AVAILABLE or collection is None:
        return (
            "Knowledge base unavailable. Please install the 'chromadb' package and "
            "ensure urackit_knowledge.txt is present."
        )
    
    if collection.count() == 0:
        return "Knowledge base is empty. No documents have been loaded."
    
    try:
        result = collection.query(query_texts=[question], n_results=top_k)
        documents = result.get("documents") or []
        
        if not documents or not documents[0]:
            return "No relevant information found in the knowledge base."
        
        # Combine results
        combined = "\n\n---\n\n".join(documents[0])
        return f"Knowledge Base Results:\n\n{combined}"
    except Exception as e:
        logger.error(f"Knowledge base query error: {e}")
        return f"Error searching knowledge base: {e}"


def get_knowledge_base_stats() -> dict:
    """Get statistics about the knowledge base."""
    collection = _ensure_collection()
    
    if not CHROMADB_AVAILABLE or collection is None:
        return {"available": False, "count": 0}
    
    return {
        "available": True,
        "count": collection.count(),
        "file_exists": _DATA_FILE.exists(),
        "file_path": str(_DATA_FILE),
    }
