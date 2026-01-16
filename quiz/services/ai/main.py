import os
import json
from typing import Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from supabase import create_client, Client
from dotenv import load_dotenv

from quiz_agents.processor import process_import

load_dotenv()

app = FastAPI(title="Quiz AI Service", version="1.0.0")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Supabase client
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("Missing Supabase environment variables")

supabase: Client = create_client(supabase_url, supabase_key)


class ProcessImportRequest(BaseModel):
    importId: str


class ProcessImportResponse(BaseModel):
    success: bool
    questionsCreated: int
    message: str


@app.get("/ai/health")
async def health_check():
    return {"status": "ok", "service": "quiz-ai"}


@app.post("/ai/imports/process", response_model=ProcessImportResponse)
async def process_import_endpoint(request: ProcessImportRequest):
    """Process an uploaded CSV/PDF file and convert it to quiz questions."""
    try:
        # Get import record
        result = supabase.table("imports").select("*").eq("id", request.importId).single().execute()

        if not result.data:
            raise HTTPException(status_code=404, detail="Import not found")

        import_record = result.data

        if import_record["status"] not in ["queued", "processing"]:
            raise HTTPException(status_code=400, detail="Import already processed")

        # Download file from storage
        file_path = import_record["file_path"]
        file_type = import_record["file_type"]

        file_data = supabase.storage.from_("quiz-imports").download(file_path)

        if not file_data:
            raise HTTPException(status_code=404, detail="File not found in storage")

        # Process with AI agents
        questions = await process_import(file_data, file_type)

        # Insert questions into database
        quiz_id = import_record.get("quiz_id")

        if not quiz_id:
            # Create a new quiz if not specified
            quiz_result = supabase.table("quizzes").insert({
                "title": f"Imported Quiz {request.importId[:8]}",
                "description": "Automatically generated from import",
                "is_active": False,
                "created_by": import_record["uploaded_by"]
            }).execute()
            quiz_id = quiz_result.data[0]["id"]

            # Update import with quiz_id
            supabase.table("imports").update({"quiz_id": quiz_id}).eq("id", request.importId).execute()

        # Insert questions
        questions_to_insert = [
            {
                "quiz_id": quiz_id,
                "qtype": q["qtype"],
                "prompt": q["prompt"],
                "options": q["options"],
                "correct": q["correct"],
                "explanation": q.get("explanation"),
                "tags": q.get("tags"),
                "created_by": import_record["uploaded_by"]
            }
            for q in questions
        ]

        if questions_to_insert:
            supabase.table("questions").insert(questions_to_insert).execute()

        # Update import status
        supabase.table("imports").update({
            "status": "done",
            "result_summary": {
                "questions_created": len(questions),
                "quiz_id": quiz_id
            }
        }).eq("id", request.importId).execute()

        return ProcessImportResponse(
            success=True,
            questionsCreated=len(questions),
            message=f"Successfully created {len(questions)} questions"
        )

    except HTTPException:
        raise
    except Exception as e:
        # Update import status to failed
        supabase.table("imports").update({
            "status": "failed",
            "result_summary": {"error": str(e)}
        }).eq("id", request.importId).execute()

        raise HTTPException(status_code=500, detail=str(e))


if __name__ == "__main__":
    import uvicorn
    port = int(os.getenv("AI_SERVICE_PORT", "8000"))
    uvicorn.run(app, host="0.0.0.0", port=port)
