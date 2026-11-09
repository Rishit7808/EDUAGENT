"""
EDUAGENT Academic Material & Document Indexing Service
"""
import uuid
import os
from pathlib import Path
from typing import List, Dict, Any, Optional
from database.db import get_connection
from config.settings import UPLOADS_DIR

class DocumentService:
    @staticmethod
    def save_and_index_document(course_id: str, filename: str, doc_type: str, file_bytes: bytes, unit_id: Optional[str] = None) -> str:
        doc_id = f"doc-{uuid.uuid4().hex[:8]}"
        saved_path = UPLOADS_DIR / f"{doc_id}_{filename}"
        
        with open(saved_path, "wb") as f:
            f.write(file_bytes)

        # Extract text from PDF or text file
        extracted_text = ""
        try:
            import fitz  # PyMuPDF
            doc = fitz.open(str(saved_path))
            for page in doc:
                extracted_text += page.get_text() + "\n"
        except Exception:
            # Fallback to UTF-8 decoding if text or raw format
            try:
                extracted_text = file_bytes.decode('utf-8', errors='ignore')
            except Exception:
                extracted_text = f"Academic document {filename} uploaded for course {course_id}."

        conn = get_connection()
        with conn:
            conn.execute(
                "INSERT INTO academic_documents (id, course_id, filename, doc_type, file_path, file_size) VALUES (?, ?, ?, ?, ?, ?)",
                (doc_id, course_id, filename, doc_type, str(saved_path), len(file_bytes))
            )

            # Chunk into ~500 character segments for local retrieval
            chunk_size = 500
            overlap = 50
            chunks = []
            start = 0
            idx = 0
            while start < len(extracted_text):
                chunk = extracted_text[start:start + chunk_size].strip()
                if chunk:
                    chunks.append((f"chunk-{doc_id}-{idx}", doc_id, idx, chunk, unit_id))
                    idx += 1
                start += (chunk_size - overlap)

            if chunks:
                conn.executemany(
                    "INSERT INTO document_chunks (id, document_id, chunk_index, content, unit_id) VALUES (?, ?, ?, ?, ?)",
                    chunks
                )

        conn.close()
        return doc_id

    @staticmethod
    def get_documents_by_course(course_id: str) -> List[Dict[str, Any]]:
        conn = get_connection()
        cursor = conn.cursor()
        cursor.execute("SELECT * FROM academic_documents WHERE course_id = ? ORDER BY uploaded_at DESC", (course_id,))
        docs = [dict(r) for r in cursor.fetchall()]
        conn.close()
        return docs
