import type { ReactNode } from "react";

import { AuthProvider } from "../components/auth-provider";

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  return <AuthProvider>{children}</AuthProvider>;
}
