"""
LangChain LLM Service
Unified interface for multiple LLM providers (Ollama, OpenAI, DeepSeek)
"""

from typing import Optional, List, AsyncIterator, Dict, Any
import os

from langchain_core.messages import HumanMessage, AIMessage, SystemMessage, BaseMessage
from langchain_core.language_models.chat_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings


class LLMService:
    """Service for interacting with various LLM providers via LangChain"""
    
    def __init__(self):
        self.llm: Optional[BaseChatModel] = None
        self.provider = settings.LLM_PROVIDER
        self.model_name = ""
        self._initialized = False
    
    def initialize(self):
        """Initialize the LLM based on configured provider"""
        if self._initialized:
            return
            
        print(f"🤖 Initializing LLM provider: {self.provider}")
        
        if self.provider == "ollama":
            from langchain_ollama import ChatOllama
            self.llm = ChatOllama(
                base_url=settings.OLLAMA_BASE_URL,
                model=settings.OLLAMA_MODEL,
                temperature=0.7,
            )
            self.model_name = settings.OLLAMA_MODEL
            print(f"✅ Using Ollama with model: {settings.OLLAMA_MODEL}")
        
        elif self.provider == "openai":
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                api_key=settings.OPENAI_API_KEY,
                model=settings.OPENAI_MODEL,
                temperature=0.7,
            )
            self.model_name = settings.OPENAI_MODEL
            print(f"✅ Using OpenAI with model: {settings.OPENAI_MODEL}")
        
        elif self.provider == "deepseek":
            from langchain_openai import ChatOpenAI
            self.llm = ChatOpenAI(
                api_key=settings.DEEPSEEK_API_KEY,
                base_url="https://api.deepseek.com/v1",
                model=settings.DEEPSEEK_MODEL,
                temperature=0.7,
            )
            self.model_name = settings.DEEPSEEK_MODEL
            print(f"✅ Using DeepSeek with model: {settings.DEEPSEEK_MODEL}")
        
        else:
            raise ValueError(f"Unknown LLM provider: {self.provider}")
        
        self._initialized = True
    
    def _convert_history_to_messages(self, chat_history: List[Dict]) -> List[BaseMessage]:
        """Convert chat history dicts to LangChain messages"""
        messages = []
        for msg in chat_history:
            if msg["role"] == "user":
                messages.append(HumanMessage(content=msg["content"]))
            elif msg["role"] == "assistant":
                messages.append(AIMessage(content=msg["content"]))
            else:
                messages.append(SystemMessage(content=msg["content"]))
        return messages
    
    async def generate(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> str:
        """Generate a response from the LLM"""
        if not self._initialized:
            self.initialize()
        
        messages = []
        
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        
        messages.append(HumanMessage(content=prompt))
        
        response = await self.llm.ainvoke(messages)
        return response.content
    
    async def generate_with_context(
        self,
        query: str,
        context: str,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """Generate a response using RAG context"""
        if not self._initialized:
            self.initialize()
        
        system_prompt = """You are a helpful AI assistant. Use the following context to answer the user's question.
If the context contains relevant information, use it to provide an accurate answer.
If the context doesn't contain relevant information, say so clearly.
Always be helpful and provide thorough answers based on the available information.

CONTEXT:
{context}"""
        
        # Build message list
        messages = [SystemMessage(content=system_prompt.format(context=context))]
        
        # Add chat history
        if chat_history:
            messages.extend(self._convert_history_to_messages(chat_history[-10:]))
        
        messages.append(HumanMessage(content=query))
        
        response = await self.llm.ainvoke(messages)
        return response.content
    
    async def generate_general(
        self,
        query: str,
        chat_history: Optional[List[Dict]] = None
    ) -> str:
        """Generate a general response without RAG context"""
        if not self._initialized:
            self.initialize()
        
        system_prompt = "You are a helpful AI assistant. Provide accurate, helpful, and well-structured responses."
        
        messages = [SystemMessage(content=system_prompt)]
        
        if chat_history:
            messages.extend(self._convert_history_to_messages(chat_history[-10:]))
        
        messages.append(HumanMessage(content=query))
        
        response = await self.llm.ainvoke(messages)
        return response.content
    
    async def stream(
        self,
        prompt: str,
        system_prompt: Optional[str] = None
    ) -> AsyncIterator[str]:
        """Stream response from the LLM"""
        if not self._initialized:
            self.initialize()
        
        messages = []
        
        if system_prompt:
            messages.append(SystemMessage(content=system_prompt))
        
        messages.append(HumanMessage(content=prompt))
        
        async for chunk in self.llm.astream(messages):
            if chunk.content:
                yield chunk.content
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get information about the current model"""
        return {
            "provider": self.provider,
            "model": self.model_name,
            "initialized": self._initialized,
        }
    
    def get_available_models(self) -> List[Dict[str, str]]:
        """Get list of available models"""
        models = []
        
        # Ollama models (always available if Ollama is running)
        models.append({
            "id": "ollama-llama3.2",
            "name": "Llama 3.2 (Ollama)",
            "provider": "ollama"
        })
        models.append({
            "id": "ollama-mistral",
            "name": "Mistral (Ollama)",
            "provider": "ollama"
        })
        
        # OpenAI models
        if settings.OPENAI_API_KEY:
            models.append({
                "id": "gpt-4o-mini",
                "name": "GPT-4o Mini",
                "provider": "openai"
            })
            models.append({
                "id": "gpt-4o",
                "name": "GPT-4o",
                "provider": "openai"
            })
        
        # DeepSeek models
        if settings.DEEPSEEK_API_KEY:
            models.append({
                "id": "deepseek-chat",
                "name": "DeepSeek Chat",
                "provider": "deepseek"
            })
        
        return models


# Singleton instance
llm_service = LLMService()
