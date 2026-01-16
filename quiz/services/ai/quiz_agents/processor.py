import os
import csv
import io
from typing import List, Literal, Optional
from pydantic import BaseModel, Field
from agents import Agent, Runner

# Try to import PyPDF2
try:
    from PyPDF2 import PdfReader
    HAS_PDF = True
except ImportError:
    HAS_PDF = False


class Question(BaseModel):
    """A single quiz question."""
    prompt: str = Field(description="The question text")
    qtype: Literal["single", "multi"] = Field(description="Question type: single or multi select")
    options: List[str] = Field(description="List of answer options (minimum 2, maximum 6)")
    correct: List[int] = Field(description="Indices of correct answers (0-based)")
    explanation: Optional[str] = Field(default=None, description="Optional explanation of the answer")
    tags: Optional[List[str]] = Field(default=None, description="Optional tags for categorization")


class QuizImport(BaseModel):
    """Collection of quiz questions."""
    questions: List[Question] = Field(description="List of quiz questions")


def extract_text_from_pdf(file_data: bytes) -> str:
    """Extract text content from PDF."""
    if not HAS_PDF:
        raise ImportError("PyPDF2 is required for PDF processing")

    pdf_reader = PdfReader(io.BytesIO(file_data))
    text_parts = []

    for page in pdf_reader.pages:
        text = page.extract_text()
        if text:
            text_parts.append(text)

    return "\n\n".join(text_parts)


def parse_csv(file_data: bytes) -> str:
    """Parse CSV and return as structured text."""
    content = file_data.decode("utf-8")
    reader = csv.DictReader(io.StringIO(content))

    rows = list(reader)
    if not rows:
        return ""

    # Convert to text format for the AI to process
    text_parts = []
    for i, row in enumerate(rows, 1):
        text_parts.append(f"Question {i}:")
        for key, value in row.items():
            if value:
                text_parts.append(f"  {key}: {value}")
        text_parts.append("")

    return "\n".join(text_parts)


# Create the quiz extraction agent
extractor_agent = Agent(
    name="QuizExtractor",
    instructions="""You are an expert at extracting quiz questions from text content.

Your task is to:
1. Read the provided text content (from PDF or CSV)
2. Identify all quiz questions, their options, and correct answers
3. Determine if each question is single-select or multi-select
4. Extract or generate explanations where available
5. Add relevant tags for categorization

Guidelines:
- Each question must have at least 2 options and at most 6 options
- Correct answer indices are 0-based
- For single-select questions, the correct array should have exactly 1 index
- For multi-select questions, the correct array can have multiple indices
- If the question text indicates "select all that apply" or similar, mark it as "multi"
- Clean up any formatting issues in the text
- If options are labeled A, B, C, D etc., convert them to a clean list
- Ensure no duplicate options within a question
- Validate that correct answer indices are within the options range

If the content doesn't contain valid quiz questions, return an empty questions array.""",
    output_type=QuizImport
)


async def process_import(file_data: bytes, file_type: str) -> List[dict]:
    """Process imported file and return quiz questions."""

    # Extract text based on file type
    if file_type == "pdf":
        text_content = extract_text_from_pdf(file_data)
    elif file_type == "csv":
        text_content = parse_csv(file_data)
    else:
        raise ValueError(f"Unsupported file type: {file_type}")

    if not text_content.strip():
        raise ValueError("No content found in file")

    # Run the extraction agent
    result = await Runner.run(
        extractor_agent,
        f"Extract quiz questions from the following content:\n\n{text_content}"
    )

    # Validate and clean the output
    quiz_import: QuizImport = result.final_output
    validated_questions = []

    for q in quiz_import.questions:
        # Validate options
        if len(q.options) < 2:
            continue

        # Validate correct answers
        valid_correct = [c for c in q.correct if 0 <= c < len(q.options)]
        if not valid_correct:
            continue

        # Ensure qtype matches correct answer count
        if len(valid_correct) == 1:
            qtype = "single"
        else:
            qtype = "multi"

        validated_questions.append({
            "prompt": q.prompt.strip(),
            "qtype": qtype,
            "options": [opt.strip() for opt in q.options],
            "correct": valid_correct,
            "explanation": q.explanation.strip() if q.explanation else None,
            "tags": q.tags
        })

    return validated_questions
