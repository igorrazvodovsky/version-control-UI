"use client"

import { useState } from "react"
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
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
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  SidebarFooter
} from "@/components/ui/sidebar"
import {
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  GitBranch,
  GitCommit,
  Check,
  Search,
  Settings,
  Smile,
  User,
  Bell,
  HelpCircle,
  LogOut,
  Plus,
  Pencil,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navGroups, workspaceOptions } from "@/components/shell/nav"
import { toast } from "@/hooks/use-toast"

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
  const branches = detail?.branches ?? []
  const mainBranch = branches.find((branch) => branch.name === "main") ?? null
  const otherBranches = branches.filter((branch) => branch.name !== "main")
  const selectedBranch = detail?.selectedBranch
  const currentBranch = branches.find((branch) => branch.name === selectedBranch) ??
    branches.find((branch) => branch.isCurrent) ??
    null
  const currentBranchName = currentBranch?.name ?? selectedBranch ?? "Master"
  const currentBranchLabel = currentBranch?.label ?? currentBranchName
  const canRenameTicket = isTicketContext && typeof selectedBranch === "string" && selectedBranch !== "main"
  const versionValue = currentBranch?.name === "main" ? currentBranch?.version : currentBranch?.baseVersion
  const versionLabel = typeof versionValue === "number" ? `v${versionValue}` : "v—"
  const contextLabel = !isTicketContext
    ? "Free Plan"
    : (detail.branchesLoading ? "Loading tickets…" : `${currentBranchLabel} • ${versionLabel}`)

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
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
	                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
	                        <span className="truncate font-semibold">{contextLabel}</span>
	                        <span className="truncate text-xs text-muted-foreground">{activeWorkspace}</span>
	                      </div>
	                      <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
	                    </SidebarMenuButton>
	                  </DropdownMenuTrigger>
	                  <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
	                    <DropdownMenuSub>
	                      <DropdownMenuSubTrigger className="gap-2 p-2">
	                        <span>{activeWorkspace}</span>
	                      </DropdownMenuSubTrigger>
	                      <DropdownMenuSubContent className="min-w-56">
	                        {workspaceOptions.map((workspace) => (
	                          <DropdownMenuItem
	                            key={workspace}
                            onClick={() => setActiveWorkspace(workspace)}
                            className="gap-2 p-2"
                          >
                            <div className="flex size-6 items-center justify-center rounded-sm border">
                              <span className="text-xs font-semibold">{workspace.charAt(0)}</span>
                            </div>
                            <span className="flex-1 truncate">{workspace}</span>
                            {workspace === activeWorkspace ? <Check className="size-4" /> : null}
                          </DropdownMenuItem>
	                        ))}

		                      </DropdownMenuSubContent>
		                    </DropdownMenuSub>
                        	                    <DropdownMenuSeparator />
		                    {isTicketContext ? (
		                      <DropdownMenuSub>
		                        <DropdownMenuSubTrigger className="gap-2 p-2">
		                          {/* <GitBranch className="size-4" /> */}
		                          {currentBranchLabel}
		                        </DropdownMenuSubTrigger>
		                        <DropdownMenuSubContent className="min-w-56">
		                          {detail.branchesLoading && branches.length === 0 ? (
		                            <DropdownMenuItem disabled className="text-xs text-muted-foreground">
		                              Loading tickets…
		                            </DropdownMenuItem>
		                          ) : (
		                            <>
		                              <DropdownMenuLabel className="text-xs text-muted-foreground">Versions</DropdownMenuLabel>
		                              {mainBranch ? (
		                                <DropdownMenuItem
		                                  key={mainBranch.id}
		                                  onClick={() => detail?.handleBranchSelect(mainBranch.name)}
		                                  className="gap-2"
		                                >
		                                  <span className="flex-1 truncate">main</span>
		                                  <span className="text-xs text-muted-foreground">
		                                    {typeof mainBranch.version === "number" ? `v${mainBranch.version}` : "v—"}
		                                  </span>
		                                  {currentBranchName === mainBranch.name ? <Check className="size-4" /> : null}
		                                </DropdownMenuItem>
		                              ) : null}
		                              <DropdownMenuSeparator />
		                              <DropdownMenuLabel className="text-xs text-muted-foreground">Tickets</DropdownMenuLabel>
		                              {otherBranches.length ? (
		                                otherBranches.map((branch) => {
		                                  const version = typeof branch.baseVersion === "number" ? `v${branch.baseVersion}` : "v—"
		                                  return (
		                                  <DropdownMenuItem
		                                      key={branch.id}
		                                      onClick={() => detail?.handleBranchSelect(branch.name)}
		                                      className="gap-2"
		                                    >
		                                      <span className="flex-1 truncate">{branch.label}</span>
		                                      <span className="text-xs text-muted-foreground">{version}</span>
		                                      {currentBranchName === branch.name ? <Check className="size-4" /> : null}
		                                    </DropdownMenuItem>
		                                  )
		                                })
		                              ) : (
		                                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
		                                  No other tickets
		                                </DropdownMenuItem>
		                              )}
		                              <DropdownMenuSeparator />
		                              <DropdownMenuItem onClick={() => detail?.handleCreateBranch()} className="gap-2">
		                                <GitCommit className="size-4" />
		                                Create new ticket
		                              </DropdownMenuItem>
		                            </>
		                          )}
		                        </DropdownMenuSubContent>
		                      </DropdownMenuSub>
		                    ) : null}
                      <DropdownMenuItem className="gap-2 p-2">
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <span className="text-xs font-semibold">-</span>
                        </div>
                        Changes
                      </DropdownMenuItem>
                      <DropdownMenuItem className="gap-2 p-2">
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <span className="text-xs font-semibold">-</span>
                        </div>
                        Activity log
                      </DropdownMenuItem>
                    {/* <DropdownMenuSeparator /> */}
                    {/* <DropdownMenuItem className="gap-2 p-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                        <Plus className="size-4" />
                      </div>
                      <div className="font-medium text-muted-foreground">Add workspace</div>
                    </DropdownMenuItem> */}
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton isActive={item.isActive} tooltip={item.tooltip ?? item.label}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
	            ))}
	          </SidebarContent>
            <SidebarFooter>
              <SidebarMenu>
                <SidebarMenuItem>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <SidebarMenuButton
                        size="lg"
                        className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                      >
                        <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                          <Settings className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                          <span className="truncate font-semibold">Administration</span>
                          {/* <span className="truncate text-xs text-muted-foreground">john@example.com</span> */}
                        </div>
                        <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                      </SidebarMenuButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                      side="top"
                      align="start"
                    >
                      <DropdownMenuLabel className="p-0 font-normal">
                        <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                          <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                            <User className="size-4" />
                          </div>
                          <div className="grid flex-1 text-left text-sm leading-tight">
                            <span className="truncate font-semibold">John Doe</span>
                            <span className="truncate text-xs text-muted-foreground">john@example.com</span>
                          </div>
                        </div>
                      </DropdownMenuLabel>
                      {/* TODO: Move to submenu */}
                      {/* <DropdownMenuItem>
                        <LogOut className="mr-2 size-4" />
                        Log out
                      </DropdownMenuItem> */}
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <Bell className="mr-2 size-4" />
                        Notifications
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 size-4" />
                        Version and release management
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <User className="mr-2 size-4" />
                        Jobs
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Settings className="mr-2 size-4" />
                        Setup
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem>
                        <HelpCircle className="mr-2 size-4" />
                        Help
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                  {rightSidebarOpen ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
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
