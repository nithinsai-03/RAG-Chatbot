"""
LangGraph Conversation Agent
Implements a context-aware conversation agent with memory
"""

from typing import List, Dict, Any, TypedDict, Optional
import os

from langgraph.graph import StateGraph, END, START

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings
from services.vector_store import vector_store
from services.llm_service import llm_service


class ConversationState(TypedDict):
    """State for the conversation agent"""
    # Input
    query: str
    conversation_id: str
    chat_history: List[Dict]
    
    # Analysis
    intent: str
    requires_context: bool
    
    # Retrieved context
    context: str
    sources: List[Dict]
    
    # Output
    response: str
    final_mode: str


class ConversationAgent:
    """LangGraph-based Conversation Agent with intent detection"""
    
    def __init__(self):
        self.graph = None
    
    def build_graph(self):
        """Build the conversation agent workflow"""
        
        workflow = StateGraph(ConversationState)
        
        # Add nodes
        workflow.add_node("analyze_intent", self.analyze_intent_node)
        workflow.add_node("retrieve_context", self.retrieve_context_node)
        workflow.add_node("generate_response", self.generate_response_node)
        
        # Add edges
        workflow.add_edge(START, "analyze_intent")
        workflow.add_conditional_edges(
            "analyze_intent",
            self.needs_context_decision,
            {
                "needs_context": "retrieve_context",
                "no_context": "generate_response",
            }
        )
        workflow.add_edge("retrieve_context", "generate_response")
        workflow.add_edge("generate_response", END)
        
        self.graph = workflow.compile()
        return self.graph
    
    async def analyze_intent_node(self, state: ConversationState) -> Dict:
        """Analyze user intent"""
        print("🔍 Analyzing intent...")
        
        query = state["query"]
        has_documents = vector_store.has_documents()
        
        query_lower = query.lower()
        
        # Greeting detection
        greeting_keywords = ["hello", "hi", "hey", "good morning", "good evening", "howdy"]
        # Help detection  
        help_keywords = ["help", "how do", "how can", "what can you", "capabilities"]
        # Document query detection
        doc_keywords = [
            "document", "file", "uploaded", "says", "mentioned",
            "according to", "in the", "from the", "based on",
            "find", "search", "summarize", "explain from"
        ]
        
        intent = "general_query"
        requires_context = False
        
        if any(kw in query_lower for kw in greeting_keywords):
            intent = "greeting"
        elif any(kw in query_lower for kw in help_keywords):
            intent = "help"
        elif any(kw in query_lower for kw in doc_keywords) and has_documents:
            intent = "document_query"
            requires_context = True
        elif has_documents:
            # Check if there might be relevant documents
            results = await vector_store.similarity_search(query, k=1)
            if results:
                intent = "document_query"
                requires_context = True
        
        print(f"📍 Intent: {intent}, Requires context: {requires_context}")
        return {"intent": intent, "requires_context": requires_context}
    
    def needs_context_decision(self, state: ConversationState) -> str:
        """Decision function for context retrieval"""
        return "needs_context" if state["requires_context"] else "no_context"
    
    async def retrieve_context_node(self, state: ConversationState) -> Dict:
        """Retrieve relevant context from documents"""
        print("📚 Retrieving context...")
        
        query = state["query"]
        results = await vector_store.similarity_search_with_scores(query, k=5)
        
        if not results:
            return {"context": "", "sources": []}
        
        # Build context
        context_parts = []
        sources = []
        
        for i, (doc, score) in enumerate(results):
            source_name = doc.metadata.get("filename") or doc.metadata.get("url") or "Document"
            context_parts.append(f"[SOURCE {i+1}: {source_name}]\n{doc.page_content}")
            sources.append({
                "id": i + 1,
                "content": doc.page_content[:150] + "...",
                "source": source_name,
                "score": f"{(1 - score) * 100:.1f}%"
            })
        
        context = "\n\n---\n\n".join(context_parts)
        
        print(f"✅ Retrieved {len(results)} context chunks")
        return {"context": context, "sources": sources}
    
    async def generate_response_node(self, state: ConversationState) -> Dict:
        """Generate response based on intent and context"""
        print("🤖 Generating response...")
        
        query = state["query"]
        intent = state["intent"]
        context = state.get("context", "")
        chat_history = state.get("chat_history", [])
        
        if intent == "greeting":
            system_prompt = """You are a friendly AI assistant for a RAG chatbot.
Greet the user warmly and briefly explain that you can:
1. Answer questions about uploaded documents
2. Have general conversations
3. Help with various tasks

Keep it friendly and concise."""
            response = await llm_service.generate(query, system_prompt)
            final_mode = "general"
        
        elif intent == "help":
            system_prompt = """You are a helpful AI assistant. Explain your capabilities:
1. Document Upload: Users can upload PDF, DOCX, TXT, and other documents
2. Document Q&A: Answer questions based on uploaded documents
3. General Chat: Have conversations on any topic
4. Source Citations: Provide references from documents

Be friendly and encouraging."""
            response = await llm_service.generate(query, system_prompt)
            final_mode = "general"
        
        elif intent == "document_query" and context:
            response = await llm_service.generate_with_context(query, context, chat_history)
            final_mode = "rag"
        
        else:
            response = await llm_service.generate_general(query, chat_history)
            final_mode = "general"
        
        return {
            "response": response,
            "final_mode": final_mode
        }
    
    async def run(
        self,
        query: str,
        conversation_id: str = "default",
        chat_history: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Run the conversation agent"""
        
        if self.graph is None:
            self.build_graph()
        
        print(f"\n💬 Conversation Agent: \"{query[:50]}...\"")
        
        initial_state: ConversationState = {
            "query": query,
            "conversation_id": conversation_id,
            "chat_history": chat_history or [],
            "intent": "unknown",
            "requires_context": False,
            "context": "",
            "sources": [],
            "response": "",
            "final_mode": "general",
        }
        
        try:
            result = await self.graph.ainvoke(initial_state)
            
            return {
                "answer": result["response"],
                "mode": result["final_mode"],
                "sources": result.get("sources", []),
                "intent": result["intent"],
            }
        except Exception as e:
            print(f"❌ Conversation Agent error: {e}")
            raise


# Singleton instance
conversation_agent = ConversationAgent()
