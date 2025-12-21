"""
LangChain Vector Store Service
Handles document embeddings and similarity search using FAISS
"""

from typing import List, Optional, Dict, Any, Tuple
import os

from langchain_core.documents import Document
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings


class VectorStoreService:
    """Service for managing vector embeddings and similarity search"""
    
    def __init__(self):
        self.embeddings = None
        self.vector_store: Optional[FAISS] = None
        self.documents_metadata: Dict[str, Dict] = {}  # doc_id -> metadata
        self._initialized = False
    
    def initialize(self):
        """Initialize the embedding model"""
        if self._initialized:
            return
            
        print("🔧 Initializing embedding model...")
        self.embeddings = HuggingFaceEmbeddings(
            model_name=settings.EMBEDDING_MODEL,
            model_kwargs={"device": "cpu"},
            encode_kwargs={"normalize_embeddings": True},
        )
        self._initialized = True
        print("✅ Embedding model loaded!")
    
    async def add_documents(
        self, 
        doc_id: str,
        doc_name: str,
        documents: List[Document]
    ) -> int:
        """Add documents to the vector store"""
        
        if not self._initialized:
            self.initialize()
        
        if not documents:
            return 0
        
        # Add doc_id to metadata of each document
        for doc in documents:
            doc.metadata["doc_id"] = doc_id
            doc.metadata["doc_name"] = doc_name
        
        if self.vector_store is None:
            # Create new vector store
            self.vector_store = FAISS.from_documents(
                documents=documents,
                embedding=self.embeddings,
            )
        else:
            # Add to existing store
            self.vector_store.add_documents(documents)
        
        # Store document metadata
        self.documents_metadata[doc_id] = {
            "id": doc_id,
            "name": doc_name,
            "chunk_count": len(documents),
            "chunks": [doc.metadata for doc in documents]
        }
        
        print(f"📄 Added {len(documents)} chunks for document: {doc_name}")
        return len(documents)
    
    async def similarity_search(
        self,
        query: str,
        k: int = None,
    ) -> List[Document]:
        """Search for similar documents"""
        
        if self.vector_store is None:
            return []
        
        k = k or settings.TOP_K_RESULTS
        
        return self.vector_store.similarity_search(query, k=k)
    
    async def similarity_search_with_scores(
        self,
        query: str,
        k: int = None
    ) -> List[Tuple[Document, float]]:
        """Search with relevance scores"""
        
        if self.vector_store is None:
            return []
        
        k = k or settings.TOP_K_RESULTS
        
        return self.vector_store.similarity_search_with_score(query, k=k)
    
    def get_retriever(self, search_kwargs: Optional[Dict] = None):
        """Get a retriever for use with LangChain chains"""
        
        if self.vector_store is None:
            return None
        
        search_kwargs = search_kwargs or {"k": settings.TOP_K_RESULTS}
        
        return self.vector_store.as_retriever(search_kwargs=search_kwargs)
    
    def get_documents(self) -> List[Dict]:
        """Get all document metadata (without full chunk details)"""
        # Return only essential info, not all chunk details
        # Match what the frontend expects (filename, chunks)
        result = []
        for doc_id, doc_data in self.documents_metadata.items():
            result.append({
                "id": doc_data.get("id", doc_id),
                "name": doc_data.get("name", "Unknown"),
                "filename": doc_data.get("name", "Unknown"),  # frontend uses 'filename'
                "chunk_count": doc_data.get("chunk_count", 0),
                "chunks": doc_data.get("chunk_count", 0),  # frontend also uses 'chunks'
            })
        return result
    
    def get_document_count(self) -> int:
        """Get total number of documents"""
        return len(self.documents_metadata)
    
    def has_documents(self) -> bool:
        """Check if any documents exist"""
        return len(self.documents_metadata) > 0
    
    def remove_document(self, doc_id: str) -> bool:
        """Remove a document by ID"""
        if doc_id in self.documents_metadata:
            del self.documents_metadata[doc_id]
            # Note: FAISS doesn't support deletion, would need to rebuild
            return True
        return False
    
    async def clear(self):
        """Clear all documents from vector store"""
        self.vector_store = None
        self.documents_metadata = {}
        print("🗑️ Cleared all documents")
    
    async def save(self, path: str = "./data/faiss_index"):
        """Save FAISS index to disk"""
        if self.vector_store:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            self.vector_store.save_local(path)
            print(f"💾 Saved index to {path}")
    
    async def load(self, path: str = "./data/faiss_index"):
        """Load FAISS index from disk"""
        if os.path.exists(path):
            if not self._initialized:
                self.initialize()
            self.vector_store = FAISS.load_local(
                path,
                self.embeddings,
                allow_dangerous_deserialization=True
            )
            print(f"📂 Loaded index from {path}")


# Singleton instance
vector_store = VectorStoreService()
