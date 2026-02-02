"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/articles/data-table"
import { columns } from "@/components/articles/columns"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  ChevronLeft,
  ChevronRight,
  Home,
  FileText,
  Settings,
  Users,
  BarChart,
  Clock,
  Tag,
  Info,
  ChevronsUpDown,
  Plus,
  Inbox,
  Calendar,
  Search,
  Bell,
  HelpCircle,
  LogOut,
  User,
  Calculator,
  CreditCard,
  Smile,
} from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { DEFAULT_API_BASE_URL, fetchArticles, type Article } from "@/lib/articles"
import { cn } from "@/lib/utils"

export default function DualSidebarPage() {
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState("Acme Corp")
  const [commandOpen, setCommandOpen] = useState(false)
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [articlesLoading, setArticlesLoading] = useState(true)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

  const workspaces = ["Acme Corp", "Personal", "Team Project"]

  useEffect(() => {
    let cancelled = false

    const loadArticles = async () => {
      setArticlesLoading(true)
      setArticlesError(null)

      try {
        const { articles: nextArticles, articlesCount: nextCount } = await fetchArticles({
          baseUrl: apiBaseUrl,
          requestInit: { cache: "no-store" },
        })

        if (cancelled) {
          return
        }

        setArticles(nextArticles)
      } catch (error) {
        if (cancelled) {
          return
        }

        const message = error instanceof Error ? error.message : "Unable to load articles."
        setArticlesError(message)
      } finally {
        if (!cancelled) {
          setArticlesLoading(false)
        }
      }
    }

    loadArticles()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  return (
    <div className="flex h-screen bg-background">
      <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
        <Sidebar side="left" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <span className="text-sm font-semibold">{activeWorkspace.charAt(0)}</span>
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">{activeWorkspace}</span>
                        <span className="truncate text-xs text-muted-foreground">Free Plan</span>
                      </div>
                      <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                    {workspaces.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace}
                        onClick={() => setActiveWorkspace(workspace)}
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <span className="text-xs font-semibold">{workspace.charAt(0)}</span>
                        </div>
                        {workspace}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 p-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                        <Plus className="size-4" />
                      </div>
                      <div className="font-medium text-muted-foreground">Add workspace</div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Platform</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton isActive tooltip="Dashboard">
                      <Home />
                      <span>Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Inbox">
                      <Inbox />
                      <span>Inbox</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Calendar">
                      <Calendar />
                      <span>Calendar</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Search">
                      <Search />
                      <span>Search</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Documents">
                      <FileText />
                      <span>Documents</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Analytics">
                      <BarChart />
                      <span>Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Team">
                      <Users />
                      <span>Team</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton tooltip="Settings">
                      <Settings />
                      <span>Settings</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
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
                        <User className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">John Doe</span>
                        <span className="truncate text-xs text-muted-foreground">john@example.com</span>
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
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Bell className="mr-2 size-4" />
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <User className="mr-2 size-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 size-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <HelpCircle className="mr-2 size-4" />
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <LogOut className="mr-2 size-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        {/* Main Content Area */}
        <div className="flex flex-1 flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-background px-4 py-3">
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
              {!rightSidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(true)} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Expand sidebar</span>
                </Button>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">

              {articlesLoading ? (
                <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
                  <Spinner className="size-4" />
                  Loading articles...
                </div>
              ) : articlesError ? (
                <Alert variant="destructive">
                  <AlertTitle>Unable to load articles</AlertTitle>
                  <AlertDescription>
                    <p>{articlesError}</p>
                    <p>Make sure the backend is running at {apiBaseUrl}.</p>
                  </AlertDescription>
                </Alert>
              ) : (
                <DataTable columns={columns} data={articles} />
              )}
            </div>
          </main>
        </div>
      </SidebarProvider>

      {/* Right Sidebar - Metadata & Actions */}
      <aside
        className={cn(
          "border-l border-border bg-sidebar transition-all duration-300 ease-in-out",
          rightSidebarOpen ? "w-80" : "w-0",
        )}
      >
        <div className={cn("flex h-full flex-col", !rightSidebarOpen && "hidden")}>
          <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
            <h2 className="font-semibold text-sidebar-foreground">Details</h2>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setRightSidebarOpen(false)}
              className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
            >
              <ChevronRight className="h-4 w-4" />
              <span className="sr-only">Collapse details</span>
            </Button>
          </div>

          <div className="flex-1 space-y-6 overflow-auto p-4">
            {/* Metadata Section */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <Info className="h-4 w-4" />
                Metadata
              </h3>
              <div className="space-y-2 rounded-lg bg-sidebar-accent p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Status</span>
                  <span className="font-medium text-sidebar-foreground">Active</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Created</span>
                  <span className="font-medium text-sidebar-foreground">Oct 28, 2025</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Modified</span>
                  <span className="font-medium text-sidebar-foreground">2 hours ago</span>
                </div>
              </div>
            </div>

            {/* Actions Section */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <Tag className="h-4 w-4" />
                Quick Actions
              </h3>
              <div className="space-y-2">
                <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                  Export Data
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                  Share Link
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent" size="sm">
                  Duplicate
                </Button>
                <Button variant="outline" className="w-full justify-start bg-transparent text-destructive" size="sm">
                  Delete
                </Button>
              </div>
            </div>

            {/* History Section */}
            <div>
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                <Clock className="h-4 w-4" />
                Recent History
              </h3>
              <div className="space-y-3">
                <div className="rounded-lg bg-sidebar-accent p-3">
                  <p className="text-sm font-medium text-sidebar-foreground">Page updated</p>
                  <p className="text-xs text-muted-foreground">2 hours ago</p>
                </div>
                <div className="rounded-lg bg-sidebar-accent p-3">
                  <p className="text-sm font-medium text-sidebar-foreground">Settings changed</p>
                  <p className="text-xs text-muted-foreground">5 hours ago</p>
                </div>
                <div className="rounded-lg bg-sidebar-accent p-3">
                  <p className="text-sm font-medium text-sidebar-foreground">New user added</p>
                  <p className="text-xs text-muted-foreground">Yesterday</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
