import AppShell from "@/components/shell/AppShell"

export default function ShellLayout({
  children,
  rightSidebar,
}: {
  children: React.ReactNode
  rightSidebar: React.ReactNode
}) {
  return <AppShell rightSidebar={rightSidebar}>{children}</AppShell>
}
