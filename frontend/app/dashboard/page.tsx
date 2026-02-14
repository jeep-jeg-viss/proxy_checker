"use client";

import { useAuth0 } from "@auth0/auth0-react";
import type { ReactNode } from "react";
import { Button } from "react-aria-components";

import { Sidebar } from "../components/sidebar";
import { Header } from "../components/header";
import { StatsBar } from "../components/stats-bar";
import { ProxyInput } from "../components/proxy-input";
import { ConfigPanel } from "../components/config-panel";
import { SessionInput } from "../components/session-input";
import { RunControls } from "../components/run-controls";
import { ResultsTable } from "../components/results-table";
import { History } from "../components/history";
import { SessionDetailView } from "../components/session-detail";
import landingStyles from "../landing.module.css";
import {
  ProxyCheckerProvider,
  useProxyChecker,
} from "../components/proxy-checker-context";

function OverviewPage() {
  const { status } = useProxyChecker();
  const hasResults = status === "done" || status === "running";

  return (
    <div
      className="overview-container"
      style={{
        maxWidth: 960,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: 20,
      }}
    >
      <h1
        style={{
          fontSize: 14,
          fontWeight: 500,
          color: "var(--text-1)",
          lineHeight: 1.3,
        }}
      >
        Overview
      </h1>

      {hasResults ? <StatsBar /> : null}

      <div
        className="overview-grid"
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)",
          gap: 24,
        }}
      >
        <ProxyInput />
        <ConfigPanel />
      </div>

      <SessionInput />
      <RunControls />
      {hasResults ? <ResultsTable /> : null}
    </div>
  );
}

function AppContent() {
  const { currentView } = useProxyChecker();

  return (
    <div
      className="app-shell"
      style={{ display: "flex", minHeight: "100dvh", background: "var(--bg-0)" }}
    >
      <Sidebar />
      <div
        className="app-main"
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          minWidth: 0,
          overflow: "hidden",
        }}
      >
        <Header />
        <main
          className="app-content"
          style={{ flex: 1, overflowY: "auto", padding: "20px 24px 48px" }}
        >
          {currentView === "overview" ? <OverviewPage /> : null}
          {currentView === "history" ? <History /> : null}
          {currentView === "session-detail" ? <SessionDetailView /> : null}
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
        className={landingStyles.page}
        style={{
          display: "grid",
          placeItems: "center",
          padding: 20,
        }}
      >
        <div className={landingStyles.backgroundAura} aria-hidden />

        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: 400,
            width: "100%",
            background: "color-mix(in srgb, var(--bg-0) 80%, transparent)",
            backdropFilter: "blur(12px)",
            border: "1px solid var(--border)",
            borderRadius: 24,
            padding: 40,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            boxShadow: "0 20px 40px -10px rgba(0,0,0,0.1)",
          }}
        >
          <div className={landingStyles.brand} style={{ marginBottom: 24 }}>
            <span className={landingStyles.brandMark}>PC</span>
            <span className={landingStyles.brandText} style={{ fontSize: 16 }}>
              Proxy Checker
            </span>
          </div>

          <div
            style={{
              textAlign: "center",
              marginBottom: 32,
              display: "flex",
              flexDirection: "column",
              gap: 8,
            }}
          >
            <h1
              style={{
                fontSize: 24,
                fontWeight: 600,
                letterSpacing: "-0.02em",
                color: "var(--text-1)",
              }}
            >
              Login required
            </h1>
            <p
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                lineHeight: 1.5,
              }}
            >
              Sign in with Auth0 to access the proxy dashboard and API features.
            </p>
          </div>

          {error ? (
            <div
              style={{
                marginBottom: 20,
                padding: 12,
                borderRadius: 8,
                background: "var(--red-muted)",
                color: "var(--red)",
                fontSize: 13,
                width: "100%",
                textAlign: "center",
              }}
            >
              Authentication error: {error.message}
            </div>
          ) : null}

          <Button
            onPress={() => loginWithRedirect()}
            className={landingStyles.primaryCta}
            style={{
              width: "100%",
              height: 44,
              fontSize: 14,
              display: "grid",
              placeItems: "center",
            }}
          >
            Sign in with Auth0
          </Button>

          <p
            style={{
              marginTop: 24,
              fontSize: 12,
              color: "var(--text-3)",
            }}
          >
            Secured by Auth0
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardPage() {
  return (
    <AuthGate>
      <ProxyCheckerProvider>
        <AppContent />
      </ProxyCheckerProvider>
    </AuthGate>
  );
}
