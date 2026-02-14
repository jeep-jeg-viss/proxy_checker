"use client";

import { useAuth0 } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { Button } from "react-aria-components";

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

function AuthGate({ children }: { children: ReactNode }) {
  const { error, isAuthenticated, isLoading, loginWithRedirect } = useAuth0();

  if (isLoading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-0)",
          color: "var(--text-1)",
        }}
      >
        <span style={{ fontSize: 14, color: "var(--text-2)" }}>
          Checking authentication...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-0)",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 480,
            width: "100%",
            background: "var(--bg-1)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: 24,
            display: "flex",
            flexDirection: "column",
            gap: 12,
          }}
        >
          <h1 style={{ fontSize: 18, fontWeight: 600, color: "var(--text-1)" }}>
            Login required
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
            Sign in with Auth0 to access the proxy dashboard and API features.
          </p>
          {error && (
            <p style={{ fontSize: 12, color: "#b91c1c" }}>
              Authentication error: {error.message}
            </p>
          )}
          <Button
            onPress={() => loginWithRedirect()}
            style={{
              marginTop: 4,
              height: 34,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "var(--bg-hover)",
              color: "var(--text-1)",
              padding: "0 14px",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: 500,
            }}
          >
            Continue with Auth0
          </Button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function Home() {
  return (
    <AuthGate>
      <ProxyCheckerProvider>
        <AppContent />
      </ProxyCheckerProvider>
    </AuthGate>
  );
}
