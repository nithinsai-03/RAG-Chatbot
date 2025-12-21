"""
LangGraph RAG Agent
Implements a stateful, multi-step workflow for RAG operations
"""

from typing import List, Dict, Any, TypedDict, Annotated, Optional
import os

from langgraph.graph import StateGraph, END, START
from langchain_core.documents import Document

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from services.vector_store import vector_store
from services.llm_service import llm_service


class RAGState(TypedDict):
    """State for the RAG agent workflow"""
    # Input
    query: str
    mode: str  # 'auto', 'rag', 'general'
    chat_history: List[Dict]
    
    # Processing state
    retrieved_docs: List[Document]
    relevant_docs: List[Document]
    detected_mode: str
    needs_rewrite: bool
    rewritten_query: str
    rewrite_count: int  # Track number of rewrites
    
    # Output
    answer: str
    sources: List[Dict]
    final_mode: str


class RAGAgent:
    """LangGraph-based RAG Agent with multi-step workflow"""
    
    def __init__(self):
        self.graph = None
        self.relevance_threshold = settings.RELEVANCE_THRESHOLD
    
    def build_graph(self):
        """Build the RAG agent workflow graph"""
        
        workflow = StateGraph(RAGState)
        
        # Add nodes
        workflow.add_node("route_query", self.route_query_node)
        workflow.add_node("retrieve_documents", self.retrieve_documents_node)
        workflow.add_node("grade_documents", self.grade_documents_node)
        workflow.add_node("rewrite_query", self.rewrite_query_node)
        workflow.add_node("generate_rag_response", self.generate_rag_response_node)
        workflow.add_node("generate_general_response", self.generate_general_response_node)
        
        # Add edges
        workflow.add_edge(START, "route_query")
        workflow.add_conditional_edges(
            "route_query",
            self.route_query_decision,
            {
                "rag": "retrieve_documents",
                "general": "generate_general_response",
            }
        )
        workflow.add_edge("retrieve_documents", "grade_documents")
        workflow.add_conditional_edges(
            "grade_documents",
            self.grade_documents_decision,
            {
                "relevant": "generate_rag_response",
                "rewrite": "rewrite_query",
                "fallback": "generate_general_response",
            }
        )
        workflow.add_edge("rewrite_query", "retrieve_documents")
        workflow.add_edge("generate_rag_response", END)
        workflow.add_edge("generate_general_response", END)
        
        self.graph = workflow.compile()
        return self.graph
    
    async def route_query_node(self, state: RAGState) -> Dict:
        """Determine whether to use RAG or general mode"""
        print("🔀 Routing query...")
        
        query = state["query"]
        mode = state["mode"]
        detected_mode = mode
        
        if mode == "auto":
            has_documents = vector_store.has_documents()
            
            if not has_documents:
                detected_mode = "general"
            else:
                # Check for document-related keywords
                doc_keywords = [
                    "document", "file", "uploaded", "says", "mentioned",
                    "according to", "in the", "from the", "based on",
                    "what does", "find", "search", "summarize"
                ]
                
                query_lower = query.lower()
                is_doc_query = any(kw in query_lower for kw in doc_keywords)
                
                if is_doc_query:
                    detected_mode = "rag"
                else:
                    # Quick relevance check
                    results = await vector_store.similarity_search_with_scores(query, k=1)
                    if results and results[0][1] < 1.0:  # FAISS returns distance, lower is better
                        detected_mode = "rag"
                    else:
                        detected_mode = "general"
        
        print(f"📍 Detected mode: {detected_mode}")
        return {"detected_mode": detected_mode}
    
    def route_query_decision(self, state: RAGState) -> str:
        """Decision function for query routing"""
        return "rag" if state["detected_mode"] == "rag" else "general"
    
    async def retrieve_documents_node(self, state: RAGState) -> Dict:
        """Retrieve documents from vector store"""
        print("📚 Retrieving documents...")
        
        query = state.get("rewritten_query") or state["query"]
        results = await vector_store.similarity_search_with_scores(query, k=8)
        
        # Convert to documents with scores in metadata
        # FAISS returns L2 distance (lower is better)
        # Convert to similarity using exponential decay
        import math
        retrieved_docs = []
        for doc, score in results:
            # e^(-distance) gives 0-1 similarity (higher is better)
            similarity = math.exp(-score) if score >= 0 else 0
            doc.metadata["relevance_score"] = similarity
            doc.metadata["raw_distance"] = score
            retrieved_docs.append(doc)
        
        print(f"📄 Retrieved {len(retrieved_docs)} documents")
        return {"retrieved_docs": retrieved_docs}
    
    async def grade_documents_node(self, state: RAGState) -> Dict:
        """Grade document relevance"""
        print("⭐ Grading document relevance...")
        
        retrieved_docs = state["retrieved_docs"]
        rewrite_count = state.get("rewrite_count", 0)
        
        # With exponential decay scoring, most relevant docs have scores > 0.01
        # L2 distance of ~5 gives similarity of ~0.007, distance of ~3 gives ~0.05
        # For normalized embeddings, distances are typically 0-2, so scores are ~0.13-1.0
        relevant_docs = [
            doc for doc in retrieved_docs
            if doc.metadata.get("relevance_score", 0) >= 0.001  # Very low threshold
        ]
        
        # If no docs pass threshold, just use top retrieved docs
        if len(relevant_docs) == 0 and len(retrieved_docs) > 0:
            # Use top 5 retrieved docs regardless of score
            relevant_docs = retrieved_docs[:5]
            print(f"✅ Using top {len(relevant_docs)} retrieved documents (low relevance)")
        else:
            # Limit to top 5 most relevant
            relevant_docs = relevant_docs[:5]
            print(f"✅ Found {len(relevant_docs)} relevant documents")
        
        # Only allow ONE rewrite attempt
        if len(relevant_docs) == 0 and rewrite_count < 1:
            return {"relevant_docs": [], "needs_rewrite": True, "rewrite_count": rewrite_count + 1}
        
        return {"relevant_docs": relevant_docs, "needs_rewrite": False}
    
    def grade_documents_decision(self, state: RAGState) -> str:
        """Decision function for document grading"""
        relevant_docs = state.get("relevant_docs", [])
        needs_rewrite = state.get("needs_rewrite", False)
        
        if len(relevant_docs) > 0:
            return "relevant"
        elif needs_rewrite:
            return "rewrite"
        else:
            return "fallback"
    
    async def rewrite_query_node(self, state: RAGState) -> Dict:
        """Rewrite query for better retrieval"""
        print("✍️ Rewriting query...")
        
        query = state["query"]
        rewrite_count = state.get("rewrite_count", 1)
        
        rewrite_prompt = f"""Rewrite the following question to be more specific and better suited for document retrieval.
Keep it concise but more searchable.
Only output the rewritten query, nothing else.

Original question: {query}"""
        
        rewritten = await llm_service.generate(rewrite_prompt)
        
        print(f"📝 Rewritten query: {rewritten}")
        return {"rewritten_query": rewritten.strip(), "needs_rewrite": False, "rewrite_count": rewrite_count}
    
    async def generate_rag_response_node(self, state: RAGState) -> Dict:
        """Generate response using retrieved documents"""
        print("🤖 Generating RAG response...")
        
        query = state["query"]
        relevant_docs = state["relevant_docs"]
        chat_history = state.get("chat_history", [])
        
        # Build context from documents
        context_parts = []
        for i, doc in enumerate(relevant_docs):
            source = doc.metadata.get("filename") or doc.metadata.get("url") or "Document"
            context_parts.append(f"[SOURCE {i+1}: {source}]\n{doc.page_content}")
        
        context = "\n\n---\n\n".join(context_parts)
        
        # Generate response
        answer = await llm_service.generate_with_context(query, context, chat_history)
        
        # Format sources
        seen_sources = set()
        sources = []
        for i, doc in enumerate(relevant_docs):
            source_name = doc.metadata.get("filename") or doc.metadata.get("url") or "Unknown"
            if source_name not in seen_sources:
                seen_sources.add(source_name)
                sources.append({
                    "id": len(sources) + 1,
                    "content": doc.page_content[:200] + "...",
                    "source": source_name,
                    "score": f"{doc.metadata.get('relevance_score', 0) * 100:.1f}%"
                })
        
        return {
            "answer": answer,
            "sources": sources,
            "final_mode": "rag"
        }
    
    async def generate_general_response_node(self, state: RAGState) -> Dict:
        """Generate general response without RAG"""
        print("💬 Generating general response...")
        
        query = state["query"]
        chat_history = state.get("chat_history", [])
        
        answer = await llm_service.generate_general(query, chat_history)
        
        return {
            "answer": answer,
            "sources": [],
            "final_mode": "general"
        }
    
    async def run(
        self,
        query: str,
        mode: str = "auto",
        chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Run the RAG agent"""
        
        if self.graph is None:
            self.build_graph()
        
        print(f"\n🚀 Running RAG Agent: \"{query[:50]}...\"")
        
        initial_state: RAGState = {
            "query": query,
            "mode": mode,
            "chat_history": chat_history or [],
            "retrieved_docs": [],
            "relevant_docs": [],
            "detected_mode": "general",
            "needs_rewrite": False,
            "rewritten_query": "",
            "rewrite_count": 0,
            "answer": "",
            "sources": [],
            "final_mode": "general",
        }
        
        try:
            result = await self.graph.ainvoke(initial_state)
            
            return {
                "answer": result["answer"],
                "mode": result["final_mode"],
                "sources": result["sources"],
                "retrieved_count": len(result.get("relevant_docs", [])),
            }
        except Exception as e:
            print(f"❌ RAG Agent error: {e}")
            raise


# Singleton instance
rag_agent = RAGAgent()
