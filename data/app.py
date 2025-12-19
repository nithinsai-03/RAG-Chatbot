import os
import streamlit as st
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_huggingface import HuggingFaceEmbeddings
from langchain_community.vectorstores import FAISS

# Page configuration
st.set_page_config(
    page_title="RAG Chatbot",
    page_icon="🤖",
    layout="wide"
)

# Custom CSS for better UI
st.markdown("""
<style>
    .stChat message {
        padding: 1rem;
        border-radius: 0.5rem;
        margin-bottom: 1rem;
    }
    .main-header {
        text-align: center;
        padding: 1rem;
    }
</style>
""", unsafe_allow_html=True)

# Initialize session state
if "chat_history" not in st.session_state:
    st.session_state.chat_history = []
if "vectorstore" not in st.session_state:
    st.session_state.vectorstore = None
if "embeddings" not in st.session_state:
    st.session_state.embeddings = None


def load_and_process_pdf(pdf_path):
    """Load PDF and split into chunks"""
    loader = PyPDFLoader(pdf_path)
    documents = loader.load()
    
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len
    )
    chunks = text_splitter.split_documents(documents)
    return chunks


def create_vectorstore(chunks):
    """Create FAISS vectorstore from document chunks"""
    if st.session_state.embeddings is None:
        st.session_state.embeddings = HuggingFaceEmbeddings(
            model_name="sentence-transformers/all-MiniLM-L6-v2"
        )
    vectorstore = FAISS.from_documents(chunks, st.session_state.embeddings)
    return vectorstore


def get_relevant_context(query, vectorstore, k=3):
    """Retrieve relevant context from vectorstore"""
    docs = vectorstore.similarity_search(query, k=k)
    context = "\n\n".join([doc.page_content for doc in docs])
    return context, docs


def generate_response_simple(query, context):
    """Generate a simple response based on context (no LLM required)"""
    # This is a simple response that shows the relevant context
    # For a full LLM response, you would integrate with Ollama, OpenAI, etc.
    response = f"Based on the document, here's relevant information:\n\n{context[:1500]}..."
    return response


def main():
    st.markdown("<h1 class='main-header'>🤖 RAG Chatbot</h1>", unsafe_allow_html=True)
    st.markdown("<p style='text-align: center;'>Chat with your PDF documents using AI</p>", unsafe_allow_html=True)
    
    # Sidebar for PDF upload and settings
    with st.sidebar:
        st.header("📄 Document Upload")
        
        uploaded_file = st.file_uploader(
            "Upload a PDF file",
            type=["pdf"],
            help="Upload a PDF document to chat with"
        )
        
        if uploaded_file is not None:
            # Save uploaded file temporarily
            temp_path = f"temp_{uploaded_file.name}"
            with open(temp_path, "wb") as f:
                f.write(uploaded_file.getvalue())
            
            if st.button("🔄 Process Document", type="primary"):
                with st.spinner("Processing document..."):
                    try:
                        # Load and process the PDF
                        chunks = load_and_process_pdf(temp_path)
                        st.success(f"✅ Loaded {len(chunks)} chunks from the document")
                        
                        # Create vectorstore
                        st.session_state.vectorstore = create_vectorstore(chunks)
                        st.success("✅ Created vector embeddings")
                        st.success("✅ Ready to chat!")
                        
                    except Exception as e:
                        st.error(f"Error processing document: {str(e)}")
                    finally:
                        # Clean up temp file
                        if os.path.exists(temp_path):
                            os.remove(temp_path)
        
        st.divider()
        
        # Option to use existing PDF in the directory
        st.header("📂 Or Use Existing PDF")
        parent_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        pdf_files = [f for f in os.listdir(parent_dir) if f.endswith('.pdf')]
        
        if pdf_files:
            selected_pdf = st.selectbox("Select a PDF file:", pdf_files)
            if st.button("📖 Load Selected PDF"):
                pdf_path = os.path.join(parent_dir, selected_pdf)
                with st.spinner("Processing document..."):
                    try:
                        chunks = load_and_process_pdf(pdf_path)
                        st.success(f"✅ Loaded {len(chunks)} chunks")
                        
                        st.session_state.vectorstore = create_vectorstore(chunks)
                        st.success("✅ Created embeddings")
                        st.success("✅ Ready to chat!")
                    except Exception as e:
                        st.error(f"Error: {str(e)}")
        
        st.divider()
        
        if st.button("🗑️ Clear Chat History"):
            st.session_state.chat_history = []
            st.rerun()
    
    # Main chat interface
    st.divider()
    
    # Display chat history
    for message in st.session_state.chat_history:
        with st.chat_message(message["role"]):
            st.markdown(message["content"])
    
    # Chat input
    if prompt := st.chat_input("Ask a question about your document..."):
        # Add user message to chat history
        st.session_state.chat_history.append({"role": "user", "content": prompt})
        
        with st.chat_message("user"):
            st.markdown(prompt)
        
        # Generate response
        with st.chat_message("assistant"):
            if st.session_state.vectorstore is None:
                response = "⚠️ Please upload and process a PDF document first!"
                st.markdown(response)
            else:
                with st.spinner("Searching document..."):
                    try:
                        # Get relevant context
                        context, source_docs = get_relevant_context(
                            prompt, 
                            st.session_state.vectorstore
                        )
                        
                        # Generate response
                        response = generate_response_simple(prompt, context)
                        
                        # Display response
                        st.markdown(response)
                        
                        # Show source documents
                        with st.expander("📚 View Sources"):
                            for i, doc in enumerate(source_docs):
                                st.markdown(f"**Source {i+1}:**")
                                st.markdown(doc.page_content[:500] + "...")
                                st.divider()
                                
                    except Exception as e:
                        response = f"❌ Error generating response: {str(e)}"
                        st.markdown(response)
            
            # Add assistant message to chat history
            st.session_state.chat_history.append({"role": "assistant", "content": response})


if __name__ == "__main__":
    main()
