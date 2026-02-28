from __future__ import annotations

import os
import re
import math
from collections import Counter
from typing import Iterable

import pdfplumber
from docx import Document
from flask import Flask, jsonify, request
from flask_cors import CORS

from skill_catalog import SKILL_KEYWORDS


app = Flask(__name__)
CORS(app)

ALLOWED_EXTENSIONS = {"pdf", "docx"}


def allowed_file(filename: str) -> bool:
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


def extract_text_from_pdf(file_obj) -> str:
    text_chunks: list[str] = []
    with pdfplumber.open(file_obj) as pdf:
        for page in pdf.pages:
            text = page.extract_text() or ""
            if text:
                text_chunks.append(text)
    return "\n".join(text_chunks)


def extract_text_from_docx(file_obj) -> str:
    document = Document(file_obj)
    paragraphs = [paragraph.text for paragraph in document.paragraphs if paragraph.text.strip()]
    return "\n".join(paragraphs)


def extract_skills(text: str) -> set[str]:
    normalized_text = text.lower()
    found: set[str] = set()
    for skill in SKILL_KEYWORDS:
        # Regex boundary matching avoids partial hits like "sql" in "nosqlite".
        pattern = rf"(?<!\w){re.escape(skill.lower())}(?!\w)"
        if re.search(pattern, normalized_text):
            found.add(skill.lower())
    return found


def similarity_percentage(resume_text: str, job_text: str) -> float:
    stop_words = {
        "a", "an", "and", "are", "as", "at", "be", "by", "for", "from", "has",
        "he", "in", "is", "it", "its", "of", "on", "that", "the", "to", "was",
        "were", "will", "with", "or", "this", "these", "those", "you", "your",
    }

    def tokenize(text: str) -> list[str]:
        tokens = re.findall(r"\b[a-zA-Z][a-zA-Z0-9.+#/:-]*\b", text.lower())
        return [t for t in tokens if t not in stop_words]

    resume_counts = Counter(tokenize(resume_text))
    job_counts = Counter(tokenize(job_text))
    terms = set(resume_counts) | set(job_counts)
    if not terms:
        return 0.0

    dot = sum(resume_counts[t] * job_counts[t] for t in terms)
    resume_norm = math.sqrt(sum(v * v for v in resume_counts.values()))
    job_norm = math.sqrt(sum(v * v for v in job_counts.values()))
    if resume_norm == 0 or job_norm == 0:
        return 0.0

    score = dot / (resume_norm * job_norm)
    return round(score * 100, 2)


def sorted_unique(items: Iterable[str]) -> list[str]:
    return sorted(set(items), key=str.lower)


@app.route("/health", methods=["GET"])
def health() -> tuple[dict, int]:
    return {"status": "ok"}, 200


@app.route("/analyze", methods=["POST"])
def analyze() -> tuple[dict, int]:
    if "resume" not in request.files:
        return jsonify({"error": "Missing resume file in form-data key 'resume'."}), 400

    resume_file = request.files["resume"]
    job_description = request.form.get("job_description", "").strip()

    if resume_file.filename == "":
        return jsonify({"error": "No file selected."}), 400

    if not allowed_file(resume_file.filename):
        return jsonify({"error": "Unsupported file type. Upload PDF or DOCX."}), 400

    if not job_description:
        return jsonify({"error": "Job description is required."}), 400

    try:
        extension = resume_file.filename.rsplit(".", 1)[1].lower()
        if extension == "pdf":
            resume_text = extract_text_from_pdf(resume_file)
        else:
            resume_text = extract_text_from_docx(resume_file)

        if not resume_text.strip():
            return jsonify({"error": "Could not extract text from the uploaded resume."}), 400

        resume_skills = extract_skills(resume_text)
        jd_skills = extract_skills(job_description)

        matched_skills = sorted_unique(resume_skills.intersection(jd_skills))
        missing_skills = sorted_unique(jd_skills - resume_skills)

        similarity = similarity_percentage(resume_text, job_description)

        return (
            jsonify(
                {
                    "match_percentage": similarity,
                    "skills": {
                        "resume_skills": sorted_unique(resume_skills),
                        "job_skills": sorted_unique(jd_skills),
                        "matched": matched_skills,
                        "missing": missing_skills,
                    },
                }
            ),
            200,
        )
    except Exception as exc:
        return jsonify({"error": f"Analysis failed: {str(exc)}"}), 500


if __name__ == "__main__":
    port = int(os.getenv("PORT", "5000"))
    app.run(host="0.0.0.0", port=port, debug=True)
