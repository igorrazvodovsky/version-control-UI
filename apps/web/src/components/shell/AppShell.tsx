"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { ArticleDetailProvider, useOptionalArticleDetail } from "@/components/articles/detail-provider"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { AdminMenu } from "@/components/shell/admin-menu"
import { WorkspaceBranchMenu } from "@/components/shell/workspace-branch-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter,
} from "@/components/ui/sidebar"
import {
  Calculator,
  Calendar,
  CreditCard,
  Search,
  Smile,
  Settings,
  User,
  PanelRightOpen,
  PanelRightClose,
} from "lucide-react"
import { DEFAULT_API_BASE_URL } from "@/lib/articles"
import { cn } from "@/lib/utils"
import { fetchBranches, fetchCurrentBranch, switchBranch, type VersionControlBranch } from "@/lib/version-control"
import { navGroups, navMockTree, workspaceOptions } from "@/components/shell/nav"
import { ProductModelNav } from "@/components/shell/product-model-nav"
import { toast } from "@/hooks/use-toast"
import { NavMain } from "../nav-main"

type AppShellProps = {
  children: React.ReactNode
  rightSidebar?: React.ReactNode
}

export default function AppShell({ children, rightSidebar }: AppShellProps) {
  const params = useParams()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] ?? "" : slugParam ?? ""
  const shouldProvideArticle = typeof slug === "string" && slug.length > 0

  if (!shouldProvideArticle) {
    return <AppShellInner rightSidebar={rightSidebar}>{children}</AppShellInner>
  }

  return (
    <ArticleDetailProvider slug={slug}>
      <AppShellInner rightSidebar={rightSidebar}>{children}</AppShellInner>
    </ArticleDetailProvider>
  )
}

function AppShellInner(
  { children, rightSidebar }: AppShellProps,
) {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceOptions[0] ?? "Workspace")
  const [commandOpen, setCommandOpen] = useState(false)
  const [renameDialogOpen, setRenameDialogOpen] = useState(false)
  const [renameValue, setRenameValue] = useState("")
  const [renameSaving, setRenameSaving] = useState(false)
  const hasRightSidebar = rightSidebar !== null && rightSidebar !== undefined

  const detail = useOptionalArticleDetail()
  const isTicketContext = detail !== null
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
  const [shellBranches, setShellBranches] = useState<VersionControlBranch[]>([])
  const [shellBranchesLoading, setShellBranchesLoading] = useState(false)
  const [shellSelectedBranch, setShellSelectedBranch] = useState<string | null>(null)
  const [shellCurrentBranch, setShellCurrentBranch] = useState<VersionControlBranch | null>(null)

  useEffect(() => {
    if (isTicketContext) return
    let cancelled = false

    const loadBranches = async () => {
      setShellBranchesLoading(true)
      try {
        const [branchList, current] = await Promise.all([
          fetchBranches({ baseUrl: apiBaseUrl, requestInit: { cache: "no-store" } }),
          fetchCurrentBranch({ baseUrl: apiBaseUrl, requestInit: { cache: "no-store" } }),
        ])

        if (cancelled) return
        setShellBranches(branchList.branches)
        setShellCurrentBranch(current.branch)
        setShellSelectedBranch(current.branch.name)
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Unable to load branches."
        toast({ title: "Branches unavailable", description: message, variant: "destructive" })
      } finally {
        if (!cancelled) {
          setShellBranchesLoading(false)
        }
      }
    }

    loadBranches()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl, isTicketContext])

  const branches = isTicketContext ? detail?.branches ?? [] : shellBranches
  const branchesLoading = isTicketContext ? detail?.branchesLoading ?? false : shellBranchesLoading
  const selectedBranch = isTicketContext ? detail?.selectedBranch ?? null : shellSelectedBranch
  const currentBranch = isTicketContext
    ? branches.find((branch) => branch.name === selectedBranch) ??
      branches.find((branch) => branch.isCurrent) ??
      null
    : shellCurrentBranch ?? branches.find((branch) => branch.name === selectedBranch) ?? null
  const mainBranch = branches.find((branch) => branch.name === "main") ?? null
  const otherBranches = branches.filter((branch) => branch.name !== "main")
  const currentBranchName = currentBranch?.name ?? selectedBranch ?? "Master"
  const currentBranchLabel = currentBranch?.label ?? currentBranchName
  const canRenameTicket = isTicketContext && typeof selectedBranch === "string" && selectedBranch !== "main"
  const contextLabel = !isTicketContext
    ? (branchesLoading ? "Loading branches…" : `${currentBranchLabel}`)
    : (detail.branchesLoading ? "Loading tickets…" : `${currentBranchLabel}`)
  const showBranchMenu = isTicketContext || branches.length > 0 || branchesLoading

  const handleBranchSelect = (name: string) => {
    if (isTicketContext) {
      detail?.handleBranchSelect(name)
      return
    }
    void handleShellBranchSelect(name)
  }

  const handleCreateBranch = () => {
    detail?.handleCreateBranch()
  }

  const handleShellBranchSelect = async (name: string) => {
    if (shellSelectedBranch === name) return
    setShellSelectedBranch(name)
    try {
      await switchBranch({ baseUrl: apiBaseUrl, name })
      const current = await fetchCurrentBranch({ baseUrl: apiBaseUrl, requestInit: { cache: "no-store" } })
      setShellCurrentBranch(current.branch)
      setShellSelectedBranch(current.branch.name)
      toast({ title: "Branch switched", description: `Now on ${current.branch.label ?? current.branch.name}.` })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to switch branches."
      toast({ title: "Switch failed", description: message, variant: "destructive" })
    }
  }

  const openRenameDialog = () => {
    if (!canRenameTicket) return
    setRenameValue(currentBranch?.label ?? currentBranch?.name ?? selectedBranch ?? "")
    setRenameDialogOpen(true)
  }

  const submitRename = async () => {
    if (!detail || !canRenameTicket || !selectedBranch) return
    const label = renameValue.trim()
    if (!label) {
      toast({
        title: "Invalid name",
        description: "Ticket name cannot be empty.",
        variant: "destructive",
      })
      return
    }

    setRenameSaving(true)
    try {
      await detail.handleRenameBranchLabel(label)
      setRenameDialogOpen(false)
    } catch {
      // Error toast handled upstream; keep dialog open.
    } finally {
      setRenameSaving(false)
    }
  }

  const shell = (
    <div className="flex h-screen bg-background">
      <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
        <Sidebar side="left" collapsible="offcanvas">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <WorkspaceBranchMenu
                  contextLabel={contextLabel}
                  activeWorkspace={activeWorkspace}
                  workspaceOptions={workspaceOptions}
                  onWorkspaceSelect={setActiveWorkspace}
                  showBranchMenu={showBranchMenu}
                  branchesLoading={branchesLoading}
                  branches={branches}
                  currentBranchLabel={currentBranchLabel}
                  currentBranchName={currentBranchName}
                  mainBranch={mainBranch}
                  otherBranches={otherBranches}
                  onBranchSelect={handleBranchSelect}
                  onCreateBranch={isTicketContext ? handleCreateBranch : undefined}
                />
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

            <SidebarContent>
            <NavMain items={navGroups} />
	          <SidebarGroup>
              <SidebarGroupLabel>Product model</SidebarGroupLabel>
              <SidebarGroupContent>
                <ProductModelNav items={navMockTree} />
              </SidebarGroupContent>
            </SidebarGroup>
            </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <AdminMenu />
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarFooter>

	        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex flex-1 justify-center px-4">
              <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={commandOpen}
                    className="w-full max-w-md justify-start gap-2 text-muted-foreground bg-transparent"
                  >
                    <Search className="size-4" />
                    <span>Type a command or search...</span>
                    <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="center">
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        <CommandItem>
                          <Calendar className="mr-2 size-4" />
                          <span>Calendar</span>
                        </CommandItem>
                        <CommandItem>
                          <Smile className="mr-2 size-4" />
                          <span>Search Emoji</span>
                        </CommandItem>
                        <CommandItem disabled>
                          <Calculator className="mr-2 size-4" />
                          <span>Calculator</span>
                        </CommandItem>
                      </CommandGroup>
                      <CommandGroup heading="Settings">
                        <CommandItem>
                          <User className="mr-2 size-4" />
                          <span>Profile</span>
                          <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <CreditCard className="mr-2 size-4" />
                          <span>Billing</span>
                          <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <Settings className="mr-2 size-4" />
                          <span>Settings</span>
                          <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              {hasRightSidebar && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setRightSidebarOpen((open) => !open)}
                  className="h-8 w-8"
                >
                  {rightSidebarOpen ? <PanelRightClose className="h-4 w-4" /> : <PanelRightOpen className="h-4 w-4" />}
                  <span className="sr-only">{rightSidebarOpen ? "Collapse details" : "Expand details"}</span>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </SidebarProvider>

      {hasRightSidebar && (
        <aside
          className={cn(
            "border-l border-border bg-sidebar transition-all duration-300 ease-in-out",
            rightSidebarOpen ? "w-80" : "w-0",
          )}
        >
          <div className={cn("flex h-full flex-col", !rightSidebarOpen && "hidden")}>
            <div className="flex-1 space-y-6 overflow-auto p-4">{rightSidebar}</div>
          </div>
        </aside>
      )}
    </div>
  )

  return shell
}
