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
    <div style={{ maxWidth: 960, display: "flex", flexDirection: "column", gap: 20 }}>
      {hasResults && <StatsBar />}

      <div style={{ display: "grid", gridTemplateColumns: "3fr 2fr", gap: 24 }}>
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
    <div style={{ display: "flex", height: "100vh", background: "var(--bg-0)" }}>
      <Sidebar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, overflow: "hidden" }}>
        <Header />
        <main style={{ flex: 1, overflowY: "auto", padding: "20px 24px 48px" }}>
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
