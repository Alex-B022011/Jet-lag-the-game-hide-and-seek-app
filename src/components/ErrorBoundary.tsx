import { Component, type ReactNode } from "react";

type State = { error: Error | null };

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: unknown) {
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.error) {
      return (
        <div
          style={{
            padding: 20,
            color: "#ffd9b3",
            background: "#1a232b",
            minHeight: "100vh",
            fontFamily: "monospace",
            fontSize: 13,
            overflow: "auto",
            wordBreak: "break-word",
          }}
        >
          <h2 style={{ marginTop: 0, color: "#ff7a59" }}>App crashed</h2>
          <p style={{ color: "#e8edf1" }}>{this.state.error.message}</p>
          <pre style={{ whiteSpace: "pre-wrap", color: "#9aa9b3" }}>
            {this.state.error.stack}
          </pre>
          <button
            onClick={() => {
              try {
                localStorage.removeItem("jetlag-nyc-seeker-v1");
              } catch {
                /* empty */
              }
              location.reload();
            }}
            style={{
              marginTop: 16,
              padding: "12px 18px",
              background: "#3fb96a",
              border: 0,
              borderRadius: 8,
              color: "#0b1115",
              fontWeight: 700,
              fontSize: 15,
            }}
          >
            Clear state & reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
