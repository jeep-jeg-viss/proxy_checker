"use client";

import { Auth0Provider } from "@auth0/auth0-react";
import type { ReactNode } from "react";

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const domain = process.env.NEXT_PUBLIC_AUTH0_DOMAIN;
  const clientId = process.env.NEXT_PUBLIC_AUTH0_CLIENT_ID;
  const audience = process.env.NEXT_PUBLIC_AUTH0_AUDIENCE;
  const scope =
    process.env.NEXT_PUBLIC_AUTH0_SCOPE ?? "openid profile email";

  if (!domain || !clientId || !audience) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "grid",
          placeItems: "center",
          background: "var(--bg-0)",
          color: "var(--text-1)",
          padding: 24,
        }}
      >
        <div
          style={{
            maxWidth: 520,
            width: "100%",
            border: "1px solid var(--border)",
            borderRadius: 12,
            background: "var(--bg-1)",
            padding: 20,
          }}
        >
          <h1 style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>
            Auth0 is not configured
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-2)", lineHeight: 1.5 }}>
            Set <code>NEXT_PUBLIC_AUTH0_DOMAIN</code>,{" "}
            <code>NEXT_PUBLIC_AUTH0_CLIENT_ID</code>, and{" "}
            <code>NEXT_PUBLIC_AUTH0_AUDIENCE</code> in{" "}
            <code>frontend/.env.local</code>.
          </p>
        </div>
      </div>
    );
  }

  return (
    <Auth0Provider
      domain={domain}
      clientId={clientId}
      authorizationParams={{
        redirect_uri:
          typeof window !== "undefined"
            ? window.location.origin
            : "http://localhost:3000",
        audience,
        scope,
      }}
      useRefreshTokens
      cacheLocation="localstorage"
    >
      {children}
    </Auth0Provider>
  );
}
