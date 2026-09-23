import { useEffect, useMemo, useState } from "react";
import "./App.css";

type UsageLog = {
  id: string;
  model: string;
  input_tokens: number;
  output_tokens: number;
  total_tokens: number;
  request_count: number;
  cost: number;
  source: string;
  created_at: string;
};

type ProcessResponse = {
  result: string;
  usage: {
    model: string;
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
    requestCount: number;
    cost: number;
  };
};

const API_URL = "https://llm-usage-dashboard.onrender.com";

function App() {
  const [text, setText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [result, setResult] = useState("");
  const [usage, setUsage] = useState<UsageLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingUsage, setLoadingUsage] = useState(false);
  const [error, setError] = useState("");

  const [currentUsage, setCurrentUsage] =
    useState<ProcessResponse["usage"] | null>(null);

  const loadUsage = async () => {
    try {
      setLoadingUsage(true);

      const response = await fetch(`${API_URL}/api/usage`);

      if (!response.ok) {
        throw new Error("Failed to load usage history");
      }

      const data = await response.json();

      const logs = Array.isArray(data) ? data : data.usage;

      setUsage(Array.isArray(logs) ? logs : []);
    } catch (err) {
      console.error("Usage history error:", err);
      setUsage([]);
    } finally {
      setLoadingUsage(false);
    }
  };

  useEffect(() => {
    loadUsage();
  }, []);

  const handleProcessText = async () => {
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
        body: JSON.stringify({
          text,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process text");
      }

      setResult(data.result);
      setCurrentUsage(data.usage);

      await loadUsage();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to process text",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleProcessPdf = async () => {
    if (!selectedFile) {
      setError("Please select a PDF file first.");
      return;
    }

    if (selectedFile.type !== "application/pdf") {
      setError("Only PDF files are supported.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      setResult("");
      setCurrentUsage(null);

      const formData = new FormData();
      formData.append("file", selectedFile);

      const response = await fetch(`${API_URL}/api/process-pdf`, {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to process PDF");
      }

      setResult(data.result);
      setCurrentUsage(data.usage);

      await loadUsage();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error ? err.message : "Failed to process PDF",
      );
    } finally {
      setLoading(false);
    }
  };

  const totalRequests = useMemo(() => {
    return usage.reduce(
      (total, item) => total + Number(item.request_count || 0),
      0,
    );
  }, [usage]);

  const totalInputTokens = useMemo(() => {
    return usage.reduce(
      (total, item) => total + Number(item.input_tokens || 0),
      0,
    );
  }, [usage]);

  const totalOutputTokens = useMemo(() => {
    return usage.reduce(
      (total, item) => total + Number(item.output_tokens || 0),
      0,
    );
  }, [usage]);

  const totalTokens = useMemo(() => {
    return usage.reduce(
      (total, item) => total + Number(item.total_tokens || 0),
      0,
    );
  }, [usage]);

  const totalCost = useMemo(() => {
    return usage.reduce(
      (total, item) => total + Number(item.cost || 0),
      0,
    );
  }, [usage]);

  const formatCost = (cost: number) => {
    return `$${Number(cost || 0).toFixed(6)}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleString();
  };

  return (
    <div className="app">
      <div className="container">
        <header className="header">
          <div>
            <p className="eyebrow">LLM ANALYTICS</p>

            <h1>LLM Insight Hub</h1>

            <p className="subtitle">
              Process text and PDF documents while tracking model usage,
              tokens and estimated cost.
            </p>
          </div>

          <button
            className="refresh-button"
            onClick={loadUsage}
            disabled={loadingUsage}
          >
            {loadingUsage ? "Refreshing..." : "Refresh"}
          </button>
        </header>

        <section className="stats-grid">
          <div className="stat-card">
            <span>Total Requests</span>
            <strong>{totalRequests}</strong>
          </div>

          <div className="stat-card">
            <span>Input Tokens</span>
            <strong>{totalInputTokens.toLocaleString()}</strong>
          </div>

          <div className="stat-card">
            <span>Output Tokens</span>
            <strong>{totalOutputTokens.toLocaleString()}</strong>
          </div>

          <div className="stat-card">
            <span>Total Tokens</span>
            <strong>{totalTokens.toLocaleString()}</strong>
          </div>

          <div className="stat-card">
            <span>Estimated Cost</span>
            <strong>{formatCost(totalCost)}</strong>
          </div>
        </section>

        <section className="workspace">
          <div className="panel">
            <div className="panel-header">
              <div>
                <h2>Process Content</h2>
                <p>Send text or upload a PDF for LLM processing.</p>
              </div>
            </div>

            <label className="input-label">Text Input</label>

            <textarea
              value={text}
              onChange={(event) => setText(event.target.value)}
              placeholder="Enter text you want the LLM to analyze..."
              className="text-input"
            />

            <button
              className="primary-button"
              onClick={handleProcessText}
              disabled={loading}
            >
              {loading ? "Processing..." : "Process Text"}
            </button>

            <div className="divider">
              <span>OR</span>
            </div>

            <label className="input-label">PDF Document</label>

            <div className="file-box">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(event) => {
                  const file = event.target.files?.[0] || null;
                  setSelectedFile(file);
                  setError("");
                }}
              />

              {selectedFile && (
                <p className="file-name">
                  Selected: <strong>{selectedFile.name}</strong>
                </p>
              )}
            </div>

            <button
              className="secondary-button"
              onClick={handleProcessPdf}
              disabled={loading || !selectedFile}
            >
              {loading ? "Processing..." : "Process PDF"}
            </button>

            {error && <div className="error-box">{error}</div>}
          </div>

          <div className="panel result-panel">
            <div className="panel-header">
              <div>
                <h2>LLM Result</h2>
                <p>Extracted information from your request.</p>
              </div>
            </div>

            {result ? (
              <div className="result-box">
                <div className="result-content">{result}</div>
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-icon">✦</div>

                <h3>No result yet</h3>

                <p>
                  Enter text or upload a PDF and process it to see the
                  extracted information here.
                </p>
              </div>
            )}

            {currentUsage && (
              <div className="current-usage">
                <h3>Request Usage</h3>

                <div className="usage-mini-grid">
                  <div>
                    <span>Model</span>
                    <strong>{currentUsage.model}</strong>
                  </div>

                  <div>
                    <span>Input</span>
                    <strong>{currentUsage.inputTokens}</strong>
                  </div>

                  <div>
                    <span>Output</span>
                    <strong>{currentUsage.outputTokens}</strong>
                  </div>

                  <div>
                    <span>Total</span>
                    <strong>{currentUsage.totalTokens}</strong>
                  </div>

                  <div>
                    <span>Requests</span>
                    <strong>{currentUsage.requestCount}</strong>
                  </div>

                  <div>
                    <span>Cost</span>
                    <strong>{formatCost(currentUsage.cost)}</strong>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        <section className="history-section">
          <div className="section-heading">
            <div>
              <p className="eyebrow">MONITORING</p>

              <h2>Usage History</h2>

              <p>
                Every processed request is recorded with token usage and
                estimated cost.
              </p>
            </div>
          </div>

          <div className="table-wrapper">
            {usage.length === 0 ? (
              <div className="empty-history">
                No usage history available yet.
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Source</th>
                    <th>Model</th>
                    <th>Input</th>
                    <th>Output</th>
                    <th>Total</th>
                    <th>Requests</th>
                    <th>Cost</th>
                  </tr>
                </thead>

                <tbody>
                  {usage.map((item) => (
                    <tr key={item.id}>
                      <td>{formatDate(item.created_at)}</td>

                      <td>
                        <span className="source-badge">
                          {item.source}
                        </span>
                      </td>

                      <td className="model-cell">{item.model}</td>

                      <td>
                        {Number(item.input_tokens).toLocaleString()}
                      </td>

                      <td>
                        {Number(item.output_tokens).toLocaleString()}
                      </td>

                      <td>
                        {Number(item.total_tokens).toLocaleString()}
                      </td>

                      <td>{item.request_count}</td>

                      <td>{formatCost(Number(item.cost))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        <footer className="footer">
          <span>LLM Insight Hub</span>
          <span>Usage tracking enabled</span>
        </footer>
      </div>
    </div>
  );
}

export default App;