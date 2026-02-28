import { useMemo, useState } from "react";

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
const API_PATH = API_BASE_URL ? `${API_BASE_URL}/analyze` : "/api/analyze";

function SkillChips({ items, emptyText, tone = "neutral" }) {
  if (!items?.length) {
    return <p className="empty">{emptyText}</p>;
  }

  return (
    <div className="chips">
      {items.map((item) => (
        <span key={item} className={`chip ${tone}`}>
          {item}
        </span>
      ))}
    </div>
  );
}

export default function App() {
  const [resumeFile, setResumeFile] = useState(null);
  const [jobDescription, setJobDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  const canAnalyze = useMemo(() => {
    return Boolean(resumeFile && jobDescription.trim());
  }, [resumeFile, jobDescription]);

  const analyzeResume = async (event) => {
    event.preventDefault();
    if (!canAnalyze) return;

    const formData = new FormData();
    formData.append("resume", resumeFile);
    formData.append("job_description", jobDescription);

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(API_PATH, {
        method: "POST",
        body: formData,
      });

      const rawBody = await response.text();
      let data = null;

      if (rawBody) {
        try {
          data = JSON.parse(rawBody);
        } catch {
          data = null;
        }
      }

      if (!response.ok) {
        let backendError = data?.error || "";

        if (!backendError && !rawBody && response.status === 500) {
          backendError =
            "Backend API is not reachable. Start Flask server on http://127.0.0.1:5000 and retry.";
        }

        if (!backendError) {
          backendError = rawBody
            ? `Backend returned non-JSON response (HTTP ${response.status}).`
            : `Backend returned empty response (HTTP ${response.status}).`;
        }
        throw new Error(backendError);
      }

      if (!data) {
        throw new Error(
          "Backend returned invalid JSON. Check Flask terminal for errors and restart backend."
        );
      }

      setResult(data);
    } catch (err) {
      const isNetworkError = err instanceof TypeError;
      if (isNetworkError) {
        setError(
          "Cannot reach backend API. Start Flask server on http://127.0.0.1:5000 and try again."
        );
      } else {
        setError(err.message || "Unable to analyze resume.");
      }
    } finally {
      setLoading(false);
    }
  };

  const scoreClass = (result?.match_percentage || 0) >= 70 ? "good" : "warn";

  return (
    <main className="page">
      <div className="bg-shape shape-1" />
      <div className="bg-shape shape-2" />

      <section className="app-shell">
        <header className="hero">
          <p className="eyebrow">AI Hiring Toolkit</p>
          <h1>Resume Analyzer</h1>
          <p className="subtitle">
            Upload a resume, paste a job description, and instantly detect skill gaps.
          </p>
        </header>

        <form className="analyzer-card" onSubmit={analyzeResume}>
          <div className="field">
            <label htmlFor="resume">Resume File (PDF / DOCX)</label>
            <div className="file-wrap">
              <input
                id="resume"
                type="file"
                accept=".pdf,.docx"
                onChange={(e) => setResumeFile(e.target.files?.[0] || null)}
              />
              <p className="file-name">
                {resumeFile ? resumeFile.name : "No file selected"}
              </p>
            </div>
          </div>

          <div className="field">
            <label htmlFor="jobDescription">Job Description</label>
            <textarea
              id="jobDescription"
              placeholder="Paste the full JD here..."
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
            />
          </div>

          <button className="analyze-btn" type="submit" disabled={!canAnalyze || loading}>
            {loading ? "Analyzing..." : "Analyze Resume"}
          </button>

          {error && <p className="error-box">{error}</p>}
        </form>

        {result && (
          <section className="result-wrap">
            <article className="score-card">
              <p className="score-label">Match Score</p>
              <p className={`score ${scoreClass}`}>{result.match_percentage}%</p>
            </article>

            <div className="result-grid">
              <article className="result-card">
                <h3>Matched Skills</h3>
                <SkillChips
                  items={result.skills.matched}
                  emptyText="No overlap detected yet."
                  tone="success"
                />
              </article>

              <article className="result-card">
                <h3>Missing Skills</h3>
                <SkillChips
                  items={result.skills.missing}
                  emptyText="No missing skills from detected JD skill set."
                  tone="danger"
                />
              </article>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}
