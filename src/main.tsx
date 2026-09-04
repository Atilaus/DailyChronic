import React from "react";
import ReactDOM from "react-dom/client";
import "./index.css";
import App from "./App.tsx";

/**
 * Если что-то пойдёт не так, показываем читаемую диагностику вместо чёрного экрана.
 */
function fatalPanel(title: string, detail: string) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0b110e",
        color: "#eae3cf",
        fontFamily: "Georgia, 'Times New Roman', serif",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div style={{ maxWidth: 560, border: "1px solid rgba(201,162,75,0.4)", padding: "32px 28px" }}>
        <p
          style={{
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.22em",
            textTransform: "uppercase",
            fontSize: 11,
            color: "#c9a24b",
            margin: 0,
          }}
        >
          Летопись дня · сбой переплёта
        </p>
        <h1 style={{ fontSize: 28, lineHeight: 1.15, margin: "14px 0 10px" }}>{title}</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, opacity: 0.8, margin: 0 }}>{detail}</p>
        <button
          onClick={() => window.location.reload()}
          style={{
            marginTop: 20,
            background: "rgba(201,162,75,0.12)",
            color: "#e0c276",
            border: "1px solid rgba(201,162,75,0.5)",
            padding: "10px 18px",
            fontFamily: "'Courier New', monospace",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            fontSize: 12,
            cursor: "pointer",
          }}
        >
          Перезагрузить страницу
        </button>
      </div>
    </div>
  );
}

class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null }
> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  render() {
    if (this.state.error) {
      return fatalPanel(
        "Страница не смогла раскрыться",
        `Внутри приложения произошла ошибка: ${String(this.state.error)}. Перезагрузите страницу — летопись попробует раскрыться заново.`
      );
    }
    return this.props.children;
  }
}

const rootEl = document.getElementById("root");

// Ошибки ДО монтирования React тоже не должны уходить в чёрный экран
window.addEventListener("error", (e) => {
  if (rootEl && rootEl.childElementCount <= 1 && !rootEl.dataset.mounted) {
    ReactDOM.createRoot(rootEl).render(
      fatalPanel("Летопись не загрузилась", `Скрипт оборвался: ${e.message}. Перезагрузите страницу.`)
    );
  }
});

if (rootEl) {
  ReactDOM.createRoot(rootEl).render(
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
  rootEl.dataset.mounted = "1";
}
