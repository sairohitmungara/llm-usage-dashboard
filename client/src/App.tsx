import { useEffect, useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import "./App.css";

type UsageLog = {
  id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  cost: number;
  source: "text" | "pdf";
  created_at: string;
};

type ProcessResponse = {
  success: boolean;
  result: string;
  usage: {
    model: string;
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    request_count: number;
    cost: number;
  };
};

const API_URL = "https://llm-usage-dashboard.onrender.com";

function App() {
  const [inputMode, setInputMode] = useState<"text" | "pdf">("text");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [currentUsage, setCurrentUsage] =
    useState<ProcessResponse["usage"] | null>(null);

  const [usageLogs, setUsageLogs] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [error, setError] = useState("");

  const loadUsage = async () => {
    try {
      setLoadingUsage(true);

      const response = await fetch(`${API_URL}/api/usage`);

      if (!response.ok) {
        throw new Error("Failed to load usage data");
      }

      const data = await response.json();
      setUsageLogs(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const handleProcessText = async (event: FormEvent) => {
    event.preventDefault();

    if (!text.trim()) {
      setError("Please enter some text first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult("");
      setCurrentUsage(null);

      const response = await fetch(`${API_URL}/api/process`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Processing failed");
      }

      setResult(data.result);
      setCurrentUsage(data.usage);

      await loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPdf = async () => {
    if (!file) {
      setError("Please select a PDF first.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult("");
      setCurrentUsage(null);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${API_URL}/api/process-pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "PDF processing failed");
      }

      setResult(data.result);
      setCurrentUsage(data.usage);

      await loadUsage();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];

    if (!selectedFile) return;

    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      setFile(null);
      return;
    }

    setError("");
    setFile(selectedFile);
  };

  const totals = useMemo(() => {
    return usageLogs.reduce(
      (acc, log) => {
        acc.requests += log.request_count;
        acc.input += log.input_tokens;
        acc.output += log.output_tokens;
        acc.total += log.total_tokens;
        acc.cost += Number(log.cost);

        return acc;
      },
      {
        requests: 0,
        input: 0,
        output: 0,
        total: 0,
        cost: 0,
      },
    );
  }, [usageLogs]);

  const textRequests = usageLogs.filter(
    (log) => log.source === "text",
  ).length;

  const pdfRequests = usageLogs.filter(
    (log) => log.source === "pdf",
  ).length;

  const averageTokens =
    totals.requests > 0
      ? Math.round(totals.total / totals.requests)
      : 0;

  const formatNumber = (value: number) =>
    new Intl.NumberFormat("en-US").format(value);

  const formatCost = (value: number) =>
    `$${value.toFixed(value === 0 ? 2 : 4)}`;

  const formatDate = (date: string) =>
    new Date(date).toLocaleString([], {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark">
            <span />
            <span />
            <span />
          </div>

          <div>
            <div className="brand-name">LLM Console</div>
            <div className="brand-subtitle">Usage intelligence</div>
          </div>
        </div>

        <div className="topbar-right">
          <div className="status-pill">
            <span className="status-dot" />
            API Connected
          </div>

          <button
            className="icon-button"
            onClick={loadUsage}
            title="Refresh"
          >
            ↻
          </button>
        </div>
      </header>

      <main className="dashboard">
        <section className="hero">
          <div>
            <div className="eyebrow">
              <span className="eyebrow-line" />
              LLM ANALYTICS
            </div>

            <h1>
              Understand every
              <span> model request.</span>
            </h1>

            <p>
              Process text and documents, monitor token consumption,
              and track estimated LLM costs from one workspace.
            </p>
          </div>

          <div className="model-card">
            <div className="model-card-label">ACTIVE MODEL</div>

            <div className="model-card-main">
              <div className="model-icon">✦</div>

              <div>
                <strong>
                  {currentUsage?.model || "openai/gpt-oss-20b"}
                </strong>

                <span>Groq · OpenAI compatible</span>
              </div>
            </div>

            <div className="model-status">
              <span />
              Operational
            </div>
          </div>
        </section>

        <section className="metrics-grid">
          <div className="metric-card primary">
            <div className="metric-top">
              <span>Total Requests</span>
              <div className="metric-icon">↗</div>
            </div>

            <strong>{formatNumber(totals.requests)}</strong>

            <div className="metric-foot">
              <span className="metric-accent">Live</span>
              tracked requests
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Total Tokens</span>
              <div className="metric-icon">◇</div>
            </div>

            <strong>{formatNumber(totals.total)}</strong>

            <div className="metric-foot">
              Input {formatNumber(totals.input)} · Output{" "}
              {formatNumber(totals.output)}
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Estimated Cost</span>
              <div className="metric-icon">$</div>
            </div>

            <strong>{formatCost(totals.cost)}</strong>

            <div className="metric-foot">
              Based on model token pricing
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Avg. Tokens</span>
              <div className="metric-icon">⌁</div>
            </div>

            <strong>{formatNumber(averageTokens)}</strong>

            <div className="metric-foot">
              Per request
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-top">
              <span>Sources</span>
              <div className="metric-icon">◈</div>
            </div>

            <strong>{textRequests + pdfRequests}</strong>

            <div className="source-breakdown">
              <span>
                <i className="source-dot text-dot" />
                Text {textRequests}
              </span>

              <span>
                <i className="source-dot pdf-dot" />
                PDF {pdfRequests}
              </span>
            </div>
          </div>
        </section>

        <section className="workspace-grid">
          <div className="panel process-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  PROCESS REQUEST
                </div>

                <h2>Send data to your model</h2>
              </div>

              <div className="secure-label">
                <span>●</span>
                Secure request
              </div>
            </div>

            <div className="mode-switch">
              <button
                className={inputMode === "text" ? "active" : ""}
                onClick={() => {
                  setInputMode("text");
                  setError("");
                }}
              >
                <span>✎</span>
                Text input
              </button>

              <button
                className={inputMode === "pdf" ? "active" : ""}
                onClick={() => {
                  setInputMode("pdf");
                  setError("");
                }}
              >
                <span>▤</span>
                PDF document
              </button>
            </div>

            {inputMode === "text" ? (
              <form onSubmit={handleProcessText}>
                <div className="input-label-row">
                  <label>Prompt / Text</label>
                  <span>{text.length} characters</span>
                </div>

                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Enter text you want the LLM to analyze, summarize, classify, or extract information from..."
                />

                <button
                  className="process-button"
                  type="submit"
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Process with LLM
                      <span>→</span>
                    </>
                  )}
                </button>
              </form>
            ) : (
              <div className="pdf-section">
                <label className="input-label">
                  PDF document
                </label>

                <label className="upload-box">
                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={handleFileChange}
                  />

                  <div className="upload-icon">↑</div>

                  <strong>
                    {file ? file.name : "Drop your PDF here"}
                  </strong>

                  <span>
                    {file
                      ? `${(file.size / 1024 / 1024).toFixed(
                          2,
                        )} MB`
                      : "or click to browse · PDF only"}
                  </span>
                </label>

                <button
                  className="process-button"
                  onClick={handleProcessPdf}
                  disabled={loading || !file}
                >
                  {loading ? (
                    <>
                      <span className="spinner" />
                      Processing document...
                    </>
                  ) : (
                    <>
                      Process PDF
                      <span>→</span>
                    </>
                  )}
                </button>
              </div>
            )}

            {error && (
              <div className="error-message">
                {error}
              </div>
            )}
          </div>

          <div className="panel result-panel">
            <div className="panel-header">
              <div>
                <div className="panel-kicker">
                  MODEL OUTPUT
                </div>

                <h2>Processing result</h2>
              </div>

              {result && (
                <div className="result-ready">
                  <span />
                  Complete
                </div>
              )}
            </div>

            <div
              className={`result-area ${
                result ? "has-result" : ""
              }`}
            >
              {loading ? (
                <div className="empty-state">
                  <div className="loading-orb">
                    <span />
                    <span />
                    <span />
                  </div>

                  <strong>
                    Processing your request
                  </strong>

                  <p>
                    The model is analyzing your input and
                    calculating usage.
                  </p>
                </div>
              ) : result ? (
                <div className="result-content">
                  <div className="result-label">
                    GENERATED RESPONSE
                  </div>

                  <div className="result-text">
                    {result}
                  </div>
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">✦</div>

                  <strong>
                    Your result will appear here
                  </strong>

                  <p>
                    Submit text or upload a PDF to see the
                    model response and usage details.
                  </p>
                </div>
              )}
            </div>

            {currentUsage && (
              <div className="request-usage">
                <div>
                  <span>Input</span>
                  <strong>
                    {formatNumber(
                      currentUsage.input_tokens,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Output</span>
                  <strong>
                    {formatNumber(
                      currentUsage.output_tokens,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Total</span>
                  <strong>
                    {formatNumber(
                      currentUsage.total_tokens,
                    )}
                  </strong>
                </div>

                <div>
                  <span>Cost</span>
                  <strong>
                    {formatCost(currentUsage.cost)}
                  </strong>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="panel overview-panel">
          <div className="panel-header overview-header">
            <div>
              <div className="panel-kicker">
                ACTIVITY OVERVIEW
              </div>

              <h2>Usage history</h2>
            </div>

            <div className="history-meta">
              <span className="history-count">
                {usageLogs.length} records
              </span>

              <button
                onClick={loadUsage}
                disabled={loadingUsage}
              >
                {loadingUsage
                  ? "Refreshing..."
                  : "Refresh data"}
              </button>
            </div>
          </div>

          <div className="table-wrap">
            {usageLogs.length === 0 ? (
              <div className="table-empty">
                <div>◌</div>

                <strong>
                  No usage recorded yet
                </strong>

                <span>
                  Process a request and your usage history
                  will appear here.
                </span>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Model</th>
                    <th>Source</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Total</th>
                    <th>Requests</th>
                    <th>Cost</th>
                    <th>Time</th>
                  </tr>
                </thead>

                <tbody>
                  {usageLogs.map((log) => (
                    <tr key={log.id}>
                      <td>
                        <div className="model-cell">
                          <div className="mini-model-icon">
                            ✦
                          </div>

                          <div>
                            <strong>
                              {log.model}
                            </strong>

                            <span>Groq</span>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span
                          className={`source-badge ${log.source}`}
                        >
                          <i />

                          {log.source === "pdf"
                            ? "PDF"
                            : "Text"}
                        </span>
                      </td>

                      <td>
                        {formatNumber(
                          log.input_tokens,
                        )}
                      </td>

                      <td>
                        {formatNumber(
                          log.output_tokens,
                        )}
                      </td>

                      <td>
                        <strong>
                          {formatNumber(
                            log.total_tokens,
                          )}
                        </strong>
                      </td>

                      <td>{log.request_count}</td>

                      <td className="cost-cell">
                        {formatCost(log.cost)}
                      </td>

                      <td className="time-cell">
                        {formatDate(log.created_at)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <footer className="footer">
          <span>LLM Console</span>
          <span>·</span>
          <span>
            Token-aware AI processing
          </span>
          <span>·</span>
          <span>v1.0</span>
        </footer>
      </main>
    </div>
  );
}

export default App;