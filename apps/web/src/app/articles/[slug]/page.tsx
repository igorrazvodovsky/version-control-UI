"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
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
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
import {
  BarChart,
  Bell,
  Calendar,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Clock,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  Inbox,
  Info,
  LogOut,
  Plus,
  Search,
  Settings,
  Smile,
  User,
  Users,
} from "lucide-react"
import {
  DEFAULT_API_BASE_URL,
  fetchArticle,
  fetchArticleHistory,
  updateArticle,
  type Article,
  type ArticleHistoryEntry,
} from "@/lib/articles"
import {
  commitBranch,
  createBranch,
  fetchBranchChanges,
  fetchBranches,
  fetchCurrentBranch,
  switchBranch,
  type BranchChange,
  type GitlessBranch,
} from "@/lib/gitless"
import { cn } from "@/lib/utils"

const AUTOSAVE_DELAY_MS = 1200
const DEFAULT_HISTORY_LIMIT = 20
const MOCK_USER = "demo"
const MAX_BRANCH_CREATION_ATTEMPTS = 8

type SaveStatus = "idle" | "saving" | "saved" | "error"

type ArticleForm = {
  title: string
  description: string
  body: string
}

const findReusableBranch = (branches: GitlessBranch[]) => {
  return branches.find((branch) => branch.name !== "main" && branch.status === "IN_PROGRESS") ?? null
}

export default function ArticleDetailPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] ?? "" : slugParam ?? ""
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState("Acme Corp")
  const [commandOpen, setCommandOpen] = useState(false)
  const [article, setArticle] = useState<Article | null>(null)
  const [formState, setFormState] = useState<ArticleForm>({
    title: "",
    description: "",
    body: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [branches, setBranches] = useState<GitlessBranch[]>([])
  const [currentBranch, setCurrentBranch] = useState<GitlessBranch | null>(null)
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [branchChanges, setBranchChanges] = useState<BranchChange[]>([])
  const [branchBaseCommit, setBranchBaseCommit] = useState<string | null>(null)
  const [branchesLoading, setBranchesLoading] = useState(false)
  const [branchChangesLoading, setBranchChangesLoading] = useState(false)

  const [history, setHistory] = useState<ArticleHistoryEntry[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle")
  const [saveError, setSaveError] = useState<string | null>(null)

  const autosaveTimerRef = useRef<number | null>(null)
  const formStateRef = useRef(formState)
  const branchCreationRef = useRef<Promise<string> | null>(null)
  const activeEditBranchRef = useRef<string | null>(null)

  useEffect(() => {
    formStateRef.current = formState
  }, [formState])

  const currentUser = article?.author.username ?? MOCK_USER
  const workspaces = ["Acme Corp", "Personal", "Team Project"]

  const isDirty = useMemo(() => {
    if (!article) return false
    return (
      formState.title !== article.title ||
      formState.description !== article.description ||
      formState.body !== article.body
    )
  }, [article, formState])

  const currentBranchName = currentBranch?.name ?? ""
  const mainBranch = branches.find((branch) => branch.name === "main")

  const loadArticle = useCallback(async () => {
    if (!slug) {
      setError("Missing article slug.")
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)

    try {
      const response = await fetchArticle({
        slug,
        baseUrl: apiBaseUrl,
        requestInit: { cache: "no-store" },
      })
      setArticle(response.article)
      setFormState({
        title: response.article.title,
        description: response.article.description,
        body: response.article.body,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load article."
      setError(message)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, slug])

  const loadBranches = useCallback(async () => {
    setBranchesLoading(true)
    try {
      const [branchList, current] = await Promise.all([
        fetchBranches({ baseUrl: apiBaseUrl, requestInit: { cache: "no-store" } }),
        fetchCurrentBranch({ baseUrl: apiBaseUrl, requestInit: { cache: "no-store" } }),
      ])
      setBranches(branchList.branches)
      setCurrentBranch(current.branch)
      setSelectedBranch((prev) => {
        if (!prev) return current.branch.name
        const exists = branchList.branches.some((branch) => branch.name === prev)
        return exists ? prev : current.branch.name
      })
      return { branches: branchList.branches, current: current.branch }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load branches."
      toast({
        title: "Branch data unavailable",
        description: message,
        variant: "destructive",
      })
      return null
    } finally {
      setBranchesLoading(false)
    }
  }, [apiBaseUrl])

  const loadHistory = useCallback(async () => {
    if (!slug) {
      return
    }
    setHistoryLoading(true)
    try {
      const response = await fetchArticleHistory({
        slug,
        limit: DEFAULT_HISTORY_LIMIT,
        baseUrl: apiBaseUrl,
        requestInit: { cache: "no-store" },
      })
      setHistory(response.history)
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load history."
      toast({
        title: "History unavailable",
        description: message,
        variant: "destructive",
      })
    } finally {
      setHistoryLoading(false)
    }
  }, [apiBaseUrl, slug])

  const loadBranchChanges = useCallback(
    async (branchName: string) => {
      setBranchChangesLoading(true)
      try {
        const response = await fetchBranchChanges({
          baseUrl: apiBaseUrl,
          name: branchName,
          requestInit: { cache: "no-store" },
        })
        setBranchChanges(response.changes)
        setBranchBaseCommit(response.baseCommit)
      } catch (err) {
        const message = err instanceof Error ? err.message : "Unable to load branch changes."
        toast({
          title: "Change list unavailable",
          description: message,
          variant: "destructive",
        })
      } finally {
        setBranchChangesLoading(false)
      }
    },
    [apiBaseUrl],
  )

  useEffect(() => {
    loadArticle()
    loadBranches()
    loadHistory()
  }, [loadArticle, loadBranches, loadHistory])

  useEffect(() => {
    if (!selectedBranch) return
    loadBranchChanges(selectedBranch)
  }, [loadBranchChanges, selectedBranch])

  const generateBranchName = () => {
    const timestamp = Date.now().toString()
    const token = Math.floor(Math.random() * 1e6)
      .toString()
      .padStart(6, "0")
    return `T-${timestamp}-${token}`
  }

  const ensureEditBranch = useCallback(async () => {
    if (activeEditBranchRef.current && activeEditBranchRef.current !== "main") {
      return activeEditBranchRef.current
    }
    if (selectedBranch && selectedBranch !== "main") {
      activeEditBranchRef.current = selectedBranch
      return selectedBranch
    }
    if (currentBranchName && currentBranchName !== "main") return currentBranchName
    if (branchCreationRef.current) return branchCreationRef.current

    branchCreationRef.current = (async () => {
      const snapshot = await loadBranches()
      const reusableBranch = snapshot ? findReusableBranch(snapshot.branches) : null
      if (reusableBranch) {
        await switchBranch({ baseUrl: apiBaseUrl, name: reusableBranch.name })
        await loadBranches()
        setSelectedBranch(reusableBranch.name)
        activeEditBranchRef.current = reusableBranch.name
        return reusableBranch.name
      }

      let createdName = ""
      for (let attempt = 0; attempt < MAX_BRANCH_CREATION_ATTEMPTS; attempt += 1) {
        const candidate = generateBranchName()
        try {
          await createBranch({ baseUrl: apiBaseUrl, name: candidate })
          createdName = candidate
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to create branch."
          const lowered = message.toLowerCase()
          if (!lowered.includes("exists") && !lowered.includes("already") && !lowered.includes("conflict")) {
            throw err
          }
          const refreshed = await loadBranches()
          const fallback = refreshed ? findReusableBranch(refreshed.branches) : null
          if (fallback) {
            await switchBranch({ baseUrl: apiBaseUrl, name: fallback.name })
            await loadBranches()
            setSelectedBranch(fallback.name)
            activeEditBranchRef.current = fallback.name
            return fallback.name
          }
        }
      }
      if (!createdName) {
        const refreshed = await loadBranches()
        const fallback = refreshed ? findReusableBranch(refreshed.branches) : null
        if (fallback) {
          await switchBranch({ baseUrl: apiBaseUrl, name: fallback.name })
          await loadBranches()
          setSelectedBranch(fallback.name)
          activeEditBranchRef.current = fallback.name
          return fallback.name
        }
        throw new Error("Unable to create a unique branch name.")
      }

      await switchBranch({ baseUrl: apiBaseUrl, name: createdName })
      await loadBranches()
      setSelectedBranch(createdName)
      activeEditBranchRef.current = createdName
      return createdName
    })()

    try {
      return await branchCreationRef.current
    } finally {
      branchCreationRef.current = null
    }
  }, [apiBaseUrl, currentBranchName, loadBranches, selectedBranch])

  const persistWorkingCopy = useCallback(async () => {
    if (!article) return
    if (!isDirty) {
      setSaveStatus("saved")
      return
    }

    setSaveStatus("saving")
    setSaveError(null)

    try {
      await ensureEditBranch()
      const response = await updateArticle({
        slug,
        author: currentUser,
        title: formStateRef.current.title,
        description: formStateRef.current.description,
        body: formStateRef.current.body,
        baseUrl: apiBaseUrl,
      })
      setArticle(response.article)
      setSaveStatus("saved")
      if (selectedBranch) {
        await loadBranchChanges(selectedBranch)
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to save changes."
      setSaveStatus("error")
      setSaveError(message)
    }
  }, [
    apiBaseUrl,
    article,
    currentUser,
    ensureEditBranch,
    isDirty,
    loadBranchChanges,
    selectedBranch,
    slug,
  ])

  const queueAutosave = useCallback(() => {
    if (!isDirty) return
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      persistWorkingCopy()
    }, AUTOSAVE_DELAY_MS)
  }, [isDirty, persistWorkingCopy])

  const flushAutosave = useCallback(async () => {
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
      autosaveTimerRef.current = null
    }
    await persistWorkingCopy()
  }, [persistWorkingCopy])

  useEffect(() => {
    queueAutosave()
  }, [formState, queueAutosave])

  const handleFieldChange = (field: keyof ArticleForm, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveCommit = async () => {
    if (!selectedBranch || selectedBranch === "main") return
    await flushAutosave()

    const changeCount = branchChanges.length
    if (changeCount === 0) {
      toast({
        title: "No changes to commit",
        description: "There are no updates on this branch to merge.",
      })
      return
    }

    try {
      const message = `Update articles (${changeCount})`
      await commitBranch({ baseUrl: apiBaseUrl, message })
      await switchBranch({ baseUrl: apiBaseUrl, name: "main" })
      await loadBranches()
      setSelectedBranch("main")
      activeEditBranchRef.current = "main"
      await loadArticle()
      await loadHistory()
      toast({
        title: "Changes merged",
        description: "Your edits were merged into main.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to commit changes."
      toast({
        title: "Commit failed",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleDiscard = async () => {
    if (selectedBranch === "main" || branchChanges.length > 0) return
    const baseCommit = branchBaseCommit
    try {
      await switchBranch({ baseUrl: apiBaseUrl, name: "main" })
      await loadBranches()
      setSelectedBranch("main")
      activeEditBranchRef.current = "main"
      await loadArticle()
      if (baseCommit && mainBranch?.head && baseCommit !== mainBranch.head) {
        toast({
          title: "Main updated",
          description: "Main advanced while you were editing. The view was refreshed.",
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to discard changes."
      toast({
        title: "Discard failed",
        description: message,
        variant: "destructive",
      })
    }
  }

  const handleBranchSelect = async (nextBranch: string) => {
    if (nextBranch === selectedBranch) return
    try {
      await flushAutosave()
      await switchBranch({ baseUrl: apiBaseUrl, name: nextBranch })
      setSelectedBranch(nextBranch)
      activeEditBranchRef.current = nextBranch
      await loadBranches()
      await loadArticle()
      await loadHistory()
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to switch branches."
      toast({
        title: "Branch switch failed",
        description: message,
        variant: "destructive",
      })
    }
  }

  const statusLabel = (() => {
    if (saveStatus === "saving") return "Saving…"
    if (saveStatus === "error") return "Not saved"
    if (isDirty) return "Unsaved"
    if (saveStatus === "saved") return "Saved"
    return ""
  })()

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background p-6 text-center">
        <p className="text-lg font-semibold text-foreground">Unable to load article</p>
        <p className="text-sm text-muted-foreground">{error ?? "Article not found."}</p>
        <Button asChild variant="outline">
          <Link href="/">Back to articles</Link>
        </Button>
      </div>
    )
  }

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
                    <SidebarMenuButton tooltip="Dashboard">
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
              {!rightSidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(true)} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Expand sidebar</span>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-1">
                  <p className="text-xs uppercase tracking-widest text-muted-foreground">Article</p>
                  <h1 className="text-xl font-semibold text-foreground">{article.title}</h1>
                  <p className="text-sm text-muted-foreground">/{article.slug}</p>
                </div>
                {statusLabel && (
                  <span className={cn("text-xs", saveStatus === "error" ? "text-destructive" : "text-muted-foreground")}>
                    {statusLabel}
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {article.tagList.length ? (
                  article.tagList.map((tag) => (
                    <Badge key={tag} variant="secondary">
                      {tag}
                    </Badge>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">No tags</span>
                )}
              </div>

              <div className="grid gap-6">
                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Title</label>
                  <Input
                    value={formState.title}
                    onChange={(event) => handleFieldChange("title", event.target.value)}
                    onBlur={() => {
                      void flushAutosave()
                    }}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Description</label>
                  <Input
                    value={formState.description}
                    onChange={(event) => handleFieldChange("description", event.target.value)}
                    onBlur={() => {
                      void flushAutosave()
                    }}
                  />
                </div>

                <div className="grid gap-2">
                  <label className="text-sm font-medium text-foreground">Body</label>
                  <Textarea
                    value={formState.body}
                    onChange={(event) => handleFieldChange("body", event.target.value)}
                    rows={12}
                    onBlur={() => {
                      void flushAutosave()
                    }}
                  />
                </div>

                {saveError && (
                  <p className="text-sm text-destructive">{saveError}</p>
                )}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>

      <aside
        className={cn(
          "border-l border-border bg-sidebar transition-all duration-300 ease-in-out",
          rightSidebarOpen ? "w-80" : "w-0",
        )}
      >
        <div className={cn("flex h-full flex-col", !rightSidebarOpen && "hidden")}>
          <div className="flex items-center justify-between border-sidebar-border px-4 py-3">
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

            <Tabs defaultValue="branch">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="branch">Branch & History</TabsTrigger>
                <TabsTrigger value="actions">Quick Actions</TabsTrigger>
              </TabsList>
              <TabsContent value="branch" className="mt-4 space-y-5">
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <Select
                      value={selectedBranch ?? undefined}
                      onValueChange={handleBranchSelect}
                      disabled={branchesLoading}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select branch" />
                      </SelectTrigger>
                      <SelectContent>
                        {branches.map((branch) => (
                          <SelectItem key={branch.id} value={branch.name}>
                            {branch.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={handleSaveCommit}
                      disabled={
                        selectedBranch === "main" ||
                        branchChanges.length === 0 ||
                        saveStatus === "saving"
                      }
                    >
                      Save & Merge
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={handleDiscard}
                      disabled={selectedBranch === "main" || branchChanges.length > 0}
                    >
                      Discard
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Change list</span>
                    <span>{branchChanges.length} items</span>
                  </div>
                  {branchChangesLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" /> Loading changes…
                    </div>
                  ) : branchChanges.length ? (
                    branchChanges.map((change) => (
                      <div key={change.slug} className="rounded-lg bg-sidebar-accent p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <p className="text-sm font-medium text-sidebar-foreground">{change.title}</p>
                            <p className="text-xs text-muted-foreground">/{change.slug}</p>
                          </div>
                          <Badge variant="outline" className="uppercase">
                            {change.changeType}
                          </Badge>
                        </div>
                        {change.fieldsChanged.length > 0 && (
                          <p className="mt-2 text-xs text-muted-foreground">
                            {change.fieldsChanged.join(", ")}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">No changes on this branch.</p>
                  )}
                </div>

                <div className="space-y-3">
                  <h3 className="flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
                    <Clock className="h-4 w-4" />
                    History
                  </h3>
                  {historyLoading ? (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Spinner className="h-4 w-4" /> Loading history…
                    </div>
                  ) : history.length ? (
                    history.map((entry) => (
                      <div key={entry.commit} className="rounded-lg bg-sidebar-accent p-3">
                        <p className="text-sm font-medium text-sidebar-foreground">{entry.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.createdAt).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      {selectedBranch !== "main" ? "Unmerged changes are pending." : "No commits yet."}
                    </p>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="actions" className="mt-4 space-y-2">
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </aside>
    </div>
  )
}
