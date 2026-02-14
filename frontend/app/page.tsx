"use client";

import { Sidebar } from "./components/sidebar";
import { Header } from "./components/header";
import { StatsBar } from "./components/stats-bar";
import { ProxyInput } from "./components/proxy-input";
import { ConfigPanel } from "./components/config-panel";
import { SessionInput } from "./components/session-input";
import { RunControls } from "./components/run-controls";
import { ResultsTable } from "./components/results-table";
import { History } from "./components/history";
import { SessionDetailView } from "./components/session-detail";
import { ProxyCheckerProvider, useProxyChecker } from "./components/proxy-checker-context";

function OverviewPage() {
  const { status } = useProxyChecker();
  const hasResults = status === "done" || status === "running";

    return (
        <div
            className="overview-container"
            style={{ maxWidth: 960, width: "100%", display: "flex", flexDirection: "column", gap: 20 }}
        >
            <h1 style={{ fontSize: 14, fontWeight: 500, color: "var(--text-1)", lineHeight: 1.3 }}>
                Overview
            </h1>

            {hasResults && <StatsBar />}

      <div
        className="overview-grid"
        style={{ display: "grid", gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)", gap: 24 }}
      >
        <ProxyInput />
        <ConfigPanel />
      </div>

      <SessionInput />
      <RunControls />

      {hasResults && <ResultsTable />}
    </div>
  );
}

function AppContent() {
  const { currentView } = useProxyChecker();

  return (
    <div className="app-shell" style={{ display: "flex", minHeight: "100dvh", background: "var(--bg-0)" }}>
      <Sidebar />
      <div className="app-main" style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Header />
        <main className="app-content" style={{ flex: 1, overflowY: "auto", padding: "20px 24px 48px" }}>
          {currentView === "overview" && <OverviewPage />}
          {currentView === "history" && <History />}
          {currentView === "session-detail" && <SessionDetailView />}
        </main>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <ProxyCheckerProvider>
      <AppContent />
    </ProxyCheckerProvider>
  );
}
