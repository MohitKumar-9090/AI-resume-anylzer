# AI Resume Analyzer

A complete full-stack web app that analyzes resume-job fit using NLP skill extraction and cosine similarity.

## Project Structure

```
ai-resume-analyzer/
  backend/
    app.py
    requirements.txt
    skill_catalog.py
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      App.css
      App.jsx
      main.jsx
```

## Features

- Upload resume in PDF or DOCX
- Paste job description
- Flask API endpoint: `POST /analyze`
- Resume text extraction using `pdfplumber` (PDF) and `python-docx` (DOCX)
- Skill extraction using spaCy `PhraseMatcher`
- Similarity score with TF-IDF + cosine similarity (`scikit-learn`)
- Returns match percentage + matched/missing skills
- React frontend displays results

## Backend Setup (Flask)

1. Open terminal and move into backend:

```bash
cd backend
```

2. Create and activate virtual environment:

```bash
python -m venv .venv
# Windows PowerShell
.\.venv\Scripts\Activate.ps1
# macOS/Linux
source .venv/bin/activate
```

3. Install dependencies:

```bash
pip install -r requirements.txt
```

4. Run API:

```bash
python app.py
```

Backend runs on `http://127.0.0.1:5000`.

Important: `VITE_API_BASE_URL` must be the backend base URL (for example `https://your-backend.onrender.com`), not the full `/analyze` path.

## Frontend Setup (React + Vite)

1. Open another terminal and move into frontend:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start dev server:

```bash
npm run dev
```

Frontend runs on `http://127.0.0.1:5173`.

## API Contract

### `POST /analyze`

- Content-Type: `multipart/form-data`
- Fields:
  - `resume`: file (`.pdf` or `.docx`)
  - `job_description`: text

Example success response:

```json
{
  "match_percentage": 67.45,
  "skills": {
    "resume_skills": ["python", "flask", "sql"],
    "job_skills": ["python", "docker", "sql"],
    "matched": ["python", "sql"],
    "missing": ["docker"]
  }
}
```

## Notes

- Skill extraction is keyword-based against `backend/skill_catalog.py`.
- You can extend `SKILL_KEYWORDS` to match your domain.
- For production, add auth, file size checks, and persistent logging.
