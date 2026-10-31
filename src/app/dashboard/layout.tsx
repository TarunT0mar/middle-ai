import { DashboardShell } from "@/components/dashboard-shell";
import { DashboardDataProvider } from "@/components/dashboard-data-provider";

export default function DashboardLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <DashboardDataProvider><DashboardShell>{children}</DashboardShell></DashboardDataProvider>;
}
