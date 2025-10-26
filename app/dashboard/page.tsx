"use client"

import { AppSidebar } from "@/components/app-sidebar"
// import { ChartAreaInteractive } from "@/components/chart-area-interactive"
// import { DataTable } from "@/components/data-table"
// import { SectionCards } from "@/components/section-cards"
import { SiteHeader } from "@/components/site-header"
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar"
import ProtectedRoute from "@/components/auth/ProtectedRoute"
import { useAuth } from "@/lib/contexts/AuthContext"
import { CreateIssueDialog } from "@/components/dashboard/CreateIssueDialog"
import { StatsCards } from "@/components/dashboard/StatsCards"
import { AdminIssuesTable } from "@/components/dashboard/AdminIssuesTable"
import { IssuesTrend } from "@/components/dashboard/IssuesTrend"

export default function Page() {
  const { user } = useAuth()
  return (
    <ProtectedRoute>
      <SidebarProvider
        style={{
          "--sidebar-width": "calc(var(--spacing) * 72)",
          "--header-height": "calc(var(--spacing) * 12)",
        } as React.CSSProperties}
      >
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 flex-col">
            <div className="@container/main flex flex-1 flex-col gap-2">
              <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
                {user?.role === 'ADMIN' ? (
                  <>
                    <StatsCards mode="admin" />
                    <IssuesTrend mode="admin" />
                    <AdminIssuesTable />
                  </>
                ) : (
                  <>
                    {user?.role === 'CITIZEN' && (
                      <div className="px-4 lg:px-6">
                        <CreateIssueDialog />
                      </div>
                    )}
                    <StatsCards mode="public" />
                    <IssuesTrend mode="public" />
                  </>
                )}
              </div>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </ProtectedRoute>
  )
}
