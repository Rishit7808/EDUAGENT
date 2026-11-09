"""
EDUAGENT Lightweight Local Retrieval Service (SQLite Document Chunks)
"""
import re
from typing import List, Dict, Any, Optional
from database.db import get_connection

class LocalRetrievalService:
    @staticmethod
    def retrieve_relevant_context(course_id: str, query: str, unit_id: Optional[str] = None, top_k: int = 3) -> str:
        """
        Retrieves top relevant text segments from administrator uploaded materials
        for the specified course and unit.
        """
        conn = get_connection()
        cursor = conn.cursor()

        # Extract meaningful search terms
        query_terms = [w.lower() for w in re.findall(r'\b\w{3,}\b', query) if len(w) > 2]
        if not query_terms:
            conn.close()
            return ""

        sql = """
            SELECT c.content, c.chunk_index, d.filename, d.doc_type
            FROM document_chunks c
            JOIN academic_documents d ON c.document_id = d.id
            WHERE d.course_id = ?
        """
        params = [course_id]

        if unit_id:
            sql += " AND (c.unit_id = ? OR c.unit_id IS NULL)"
            params.append(unit_id)

        cursor.execute(sql, params)
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            return ""

        # Score chunks based on query term frequency and coverage
        scored = []
        for r in rows:
            content = r["content"]
            c_lower = content.lower()
            score = sum(c_lower.count(t) for t in query_terms)
            if score > 0:
                scored.append((score, r["filename"], r["doc_type"], content))

        scored.sort(key=lambda x: x[0], reverse=True)
        top_chunks = scored[:top_k]

        if not top_chunks:
            return ""

        formatted_context = "--- ADMINISTRATOR ACADEMIC MATERIALS ---\n"
        for _, filename, doc_type, content in top_chunks:
            formatted_context += f"Source: {filename} ({doc_type})\n{content}\n\n"

        return formatted_context.strip()
