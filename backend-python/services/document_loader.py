"""
LangChain Document Loader Service
Handles loading and splitting various document types using LangChain
"""

from typing import List
from pathlib import Path
import os

from langchain_core.documents import Document
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.document_loaders import (
    PyPDFLoader,
    Docx2txtLoader,
    TextLoader,
    CSVLoader,
    UnstructuredExcelLoader,
    WebBaseLoader,
)

import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import settings


class DocumentLoaderService:
    """Service for loading and processing documents using LangChain"""
    
    def __init__(
        self,
        chunk_size: int = None,
        chunk_overlap: int = None
    ):
        self.chunk_size = chunk_size or settings.CHUNK_SIZE
        self.chunk_overlap = chunk_overlap or settings.CHUNK_OVERLAP
        
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=self.chunk_size,
            chunk_overlap=self.chunk_overlap,
            separators=["\n\n", "\n", ". ", " ", ""],
            length_function=len,
        )
        
        # File extension to loader mapping
        self.loaders = {
            ".pdf": self._load_pdf,
            ".docx": self._load_docx,
            ".doc": self._load_docx,
            ".txt": self._load_text,
            ".md": self._load_text,
            ".markdown": self._load_text,
            ".csv": self._load_csv,
            ".xlsx": self._load_excel,
            ".xls": self._load_excel,
        }
    
    async def load_file(
        self,
        file_path: str,
        original_name: str
    ) -> List[Document]:
        """Load and split a document file"""
        
        ext = Path(original_name).suffix.lower()
        
        if ext not in self.loaders:
            raise ValueError(f"Unsupported file type: {ext}")
        
        # Load documents
        loader_func = self.loaders[ext]
        docs = await loader_func(file_path)
        
        # Add metadata
        for doc in docs:
            doc.metadata.update({
                "filename": original_name,
                "source": file_path,
                "file_type": ext,
            })
        
        # Split into chunks
        split_docs = self.text_splitter.split_documents(docs)
        
        # Add chunk index to metadata
        for i, doc in enumerate(split_docs):
            doc.metadata["chunk_index"] = i
            doc.metadata["total_chunks"] = len(split_docs)
        
        return split_docs
    
    async def load_url(self, url: str) -> List[Document]:
        """Load and split content from a URL"""
        
        loader = WebBaseLoader(
            web_paths=[url],
        )
        
        docs = loader.load()
        
        # Add metadata
        for doc in docs:
            doc.metadata.update({
                "url": url,
                "source": url,
                "file_type": "web",
            })
        
        # Split into chunks
        split_docs = self.text_splitter.split_documents(docs)
        
        for i, doc in enumerate(split_docs):
            doc.metadata["chunk_index"] = i
            doc.metadata["total_chunks"] = len(split_docs)
        
        return split_docs
    
    async def load_text_content(
        self,
        content: str,
        source_name: str = "direct_input"
    ) -> List[Document]:
        """Load and split raw text content"""
        
        doc = Document(
            page_content=content,
            metadata={
                "source": source_name,
                "file_type": "text",
            }
        )
        
        split_docs = self.text_splitter.split_documents([doc])
        
        for i, doc in enumerate(split_docs):
            doc.metadata["chunk_index"] = i
            doc.metadata["total_chunks"] = len(split_docs)
        
        return split_docs
    
    # Private loader methods
    async def _load_pdf(self, file_path: str) -> List[Document]:
        loader = PyPDFLoader(file_path)
        return loader.load()
    
    async def _load_docx(self, file_path: str) -> List[Document]:
        loader = Docx2txtLoader(file_path)
        return loader.load()
    
    async def _load_text(self, file_path: str) -> List[Document]:
        loader = TextLoader(file_path, encoding="utf-8")
        return loader.load()
    
    async def _load_csv(self, file_path: str) -> List[Document]:
        loader = CSVLoader(file_path)
        return loader.load()
    
    async def _load_excel(self, file_path: str) -> List[Document]:
        loader = UnstructuredExcelLoader(file_path, mode="elements")
        return loader.load()


# Singleton instance
document_loader = DocumentLoaderService()
