import os
import numpy as np
import faiss
from typing import List, Dict, Any
from datetime import datetime, timedelta
from langchain_openai import OpenAIEmbeddings, ChatOpenAI
from langchain.chains import RetrievalQA
from langchain_community.vectorstores import FAISS
from langchain.text_splitter import RecursiveCharacterTextSplitter
from langchain.schema import Document
from sqlalchemy.orm import Session
from app.models import Product, Sale, RiskAlert
from app.schemas import RoadmapTask
import json

class RAGSystem:
    def __init__(self):
        api_key = os.getenv("OPENAI_API_KEY")
        base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
        
        self.embeddings = OpenAIEmbeddings(
            openai_api_key=api_key,
            openai_api_base=base_url
        )
        self.llm = ChatOpenAI(
            temperature=0.7,
            openai_api_key=api_key,
            openai_api_base=base_url,
            model_name="gpt-3.5-turbo"
        )
        self.vector_store = None
        self.text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1000,
            chunk_overlap=200
        )
    
    def build_context_from_db(self, db: Session, user_id: int) -> str:
        """Build context string from database for RAG"""
        context_parts = []
        
        # Get products
        products = db.query(Product).filter(Product.owner_id == user_id).all()
        product_data = []
        for p in products:
            product_data.append({
                "name": p.name,
                "sku": p.sku,
                "category": p.category,
                "price": p.price,
                "cost": p.cost,
                "stock": p.current_stock,
                "threshold": p.min_stock_threshold
            })
        context_parts.append(f"Products: {json.dumps(product_data, indent=2)}")
        
        # Get recent sales (last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        sales = db.query(Sale).filter(
            Sale.owner_id == user_id,
            Sale.sale_date >= thirty_days_ago
        ).all()
        
        sales_summary = {}
        for s in sales:
            if s.product_id not in sales_summary:
                sales_summary[s.product_id] = {
                    "quantity": 0,
                    "revenue": 0,
                    "count": 0
                }
            sales_summary[s.product_id]["quantity"] += s.quantity
            sales_summary[s.product_id]["revenue"] += s.total_amount
            sales_summary[s.product_id]["count"] += 1
        
        context_parts.append(f"Sales Summary (last 30 days): {json.dumps(sales_summary, indent=2)}")
        
        # Get risk alerts
        alerts = db.query(RiskAlert).filter(
            RiskAlert.owner_id == user_id,
            RiskAlert.is_resolved == False
        ).all()
        alert_data = [{
            "type": a.alert_type,
            "severity": a.severity,
            "message": a.message,
            "product_id": a.product_id
        } for a in alerts]
        context_parts.append(f"Active Risk Alerts: {json.dumps(alert_data, indent=2)}")
        
        return "\n\n".join(context_parts)
    
    def initialize_vector_store(self, db: Session, user_id: int):
        """Initialize FAISS vector store with database context"""
        context = self.build_context_from_db(db, user_id)
        documents = [Document(page_content=context, metadata={"user_id": user_id})]
        texts = self.text_splitter.split_documents(documents)
        
        if texts:
            self.vector_store = FAISS.from_documents(texts, self.embeddings)
        else:
            # Create empty vector store
            self.vector_store = FAISS.from_texts([""], self.embeddings)
    
    def generate_roadmap(self, query: str, db: Session, user_id: int) -> Dict[str, Any]:
        """Generate actionable roadmap using RAG"""
        # Rebuild context to ensure it's up to date
        self.initialize_vector_store(db, user_id)
        
        # Create prompt for roadmap generation
        prompt_template = f"""You are an AI business advisor for an e-commerce seller. Based on the following business data, generate an actionable roadmap.

Business Context:
{{context}}

User Query: {query}

Generate a comprehensive roadmap with:
1. A summary of the current situation
2. Prioritized tasks with:
   - Title
   - Description
   - Priority (low, medium, high, critical)
   - Category (inventory, sales, pricing, marketing, operations)
   - Estimated impact
   - Specific action items
3. Key insights

Format your response as JSON with this structure:
{{
  "summary": "...",
  "tasks": [
    {{
      "title": "...",
      "description": "...",
      "priority": "high",
      "category": "inventory",
      "estimated_impact": "...",
      "action_items": ["...", "..."]
    }}
  ],
  "insights": ["...", "..."]
}}
"""
        
        if self.vector_store:
            # Get relevant context from vector store
            retriever = self.vector_store.as_retriever(search_kwargs={"k": 3})
            docs = retriever.get_relevant_documents(query)
            context = "\n\n".join([doc.page_content for doc in docs])
            
            # Use LLM directly with context
            full_prompt = prompt_template.replace("{context}", context)
            result = self.llm.invoke(full_prompt).content
        else:
            result = self.llm.invoke(prompt_template.replace("{context}", "No data available")).content
        
        # Try to parse JSON from result
        try:
            # Extract JSON from markdown code blocks if present
            if "```json" in result:
                result = result.split("```json")[1].split("```")[0].strip()
            elif "```" in result:
                result = result.split("```")[1].split("```")[0].strip()
            
            roadmap_data = json.loads(result)
        except:
            # Fallback if JSON parsing fails
            roadmap_data = {
                "summary": result[:500],
                "tasks": [{
                    "title": "Review AI Recommendations",
                    "description": result,
                    "priority": "medium",
                    "category": "general",
                    "estimated_impact": "Moderate",
                    "action_items": ["Review the AI-generated insights above"]
                }],
                "insights": [result[:200]]
            }
        
        # Convert to response format
        tasks = [
            RoadmapTask(**task) for task in roadmap_data.get("tasks", [])
        ]
        
        return {
            "summary": roadmap_data.get("summary", ""),
            "tasks": tasks,
            "insights": roadmap_data.get("insights", []),
            "generated_at": datetime.utcnow()
        }

# Global RAG system instance
rag_system = RAGSystem()

