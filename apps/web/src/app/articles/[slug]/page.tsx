"use client"

import Link from "next/link"
import { useParams } from "next/navigation"
import { useCallback, useEffect, useMemo, useRef, useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "@/hooks/use-toast"
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

type SaveStatus = "idle" | "saving" | "saved" | "error"

type ArticleForm = {
  title: string
  description: string
  body: string
}

export default function ArticleDetailPage() {
  const params = useParams()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] ?? "" : slugParam ?? ""
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

  const [article, setArticle] = useState<Article | null>(null)
  const [formState, setFormState] = useState<ArticleForm>({
    title: "",
    description: "",
    body: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editMode, setEditMode] = useState(false)

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

  useEffect(() => {
    formStateRef.current = formState
  }, [formState])

  const currentUser = article?.author.username ?? MOCK_USER

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
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to load branches."
      toast({
        title: "Branch data unavailable",
        description: message,
        variant: "destructive",
      })
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
    const token = Math.floor(Math.random() * 1e8)
      .toString()
      .padStart(8, "0")
    return `T-${token}`
  }

  const ensureEditBranch = useCallback(async () => {
    if (currentBranchName && currentBranchName !== "main") return currentBranchName
    if (branchCreationRef.current) return branchCreationRef.current

    branchCreationRef.current = (async () => {
      let createdName = ""
      for (let attempt = 0; attempt < 5; attempt += 1) {
        const candidate = generateBranchName()
        try {
          await createBranch({ baseUrl: apiBaseUrl, name: candidate })
          createdName = candidate
          break
        } catch (err) {
          const message = err instanceof Error ? err.message : "Unable to create branch."
          if (!message.toLowerCase().includes("exists") && !message.toLowerCase().includes("already")) {
            throw err
          }
        }
      }
      if (!createdName) {
        throw new Error("Unable to create a unique branch name.")
      }

      await switchBranch({ baseUrl: apiBaseUrl, name: createdName })
      await loadBranches()
      setSelectedBranch(createdName)
      return createdName
    })()

    try {
      return await branchCreationRef.current
    } finally {
      branchCreationRef.current = null
    }
  }, [apiBaseUrl, currentBranchName, loadBranches])

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
    if (!editMode || !isDirty) return
    if (autosaveTimerRef.current) {
      window.clearTimeout(autosaveTimerRef.current)
    }
    autosaveTimerRef.current = window.setTimeout(() => {
      persistWorkingCopy()
    }, AUTOSAVE_DELAY_MS)
  }, [editMode, isDirty, persistWorkingCopy])

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
    if (!editMode) return
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
    <div className="flex min-h-screen bg-background">
      <main className="flex flex-1 flex-col border-r border-border">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <Button asChild variant="ghost" size="sm">
              <Link href="/">Back</Link>
            </Button>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground">Article</p>
              <h1 className="text-xl font-semibold text-foreground">{article.title}</h1>
              <p className="text-sm text-muted-foreground">/{article.slug}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {statusLabel && (
              <span className={cn("text-xs", saveStatus === "error" ? "text-destructive" : "text-muted-foreground")}>
                {statusLabel}
              </span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (editMode) {
                  void flushAutosave()
                }
                setEditMode((prev) => !prev)
              }}
            >
              {editMode ? "View" : "Edit"}
            </Button>
            <Button
              size="sm"
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
              variant="ghost"
              size="sm"
              onClick={handleDiscard}
              disabled={selectedBranch === "main" || branchChanges.length > 0}
            >
              Discard
            </Button>
          </div>
        </div>

        <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-6">
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
              {editMode ? (
                <Input
                  value={formState.title}
                  onChange={(event) => handleFieldChange("title", event.target.value)}
                  onBlur={() => {
                    void flushAutosave()
                  }}
                />
              ) : (
                <p className="text-base text-foreground">{article.title}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Description</label>
              {editMode ? (
                <Input
                  value={formState.description}
                  onChange={(event) => handleFieldChange("description", event.target.value)}
                  onBlur={() => {
                    void flushAutosave()
                  }}
                />
              ) : (
                <p className="text-sm text-muted-foreground">{article.description}</p>
              )}
            </div>

            <div className="grid gap-2">
              <label className="text-sm font-medium text-foreground">Body</label>
              {editMode ? (
                <Textarea
                  value={formState.body}
                  onChange={(event) => handleFieldChange("body", event.target.value)}
                  rows={12}
                  onBlur={() => {
                    void flushAutosave()
                  }}
                />
              ) : (
                <div className="whitespace-pre-wrap rounded-md border border-border bg-muted/20 p-4 text-sm text-foreground">
                  {article.body}
                </div>
              )}
            </div>

            {saveError && (
              <p className="text-sm text-destructive">{saveError}</p>
            )}
          </div>
        </div>
      </main>

      <aside className="w-full max-w-sm border-l border-border bg-sidebar text-sidebar-foreground">
        <div className="flex h-full flex-col">
          <div className="border-b border-border px-4 py-3">
            <h2 className="text-sm font-semibold">Details</h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <Tabs defaultValue="history">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="history">History</TabsTrigger>
                <TabsTrigger value="branch">Branch</TabsTrigger>
              </TabsList>
              <TabsContent value="history" className="mt-4 space-y-3">
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
              </TabsContent>
              <TabsContent value="branch" className="mt-4 space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Current branch</span>
                    <span>{currentBranchName || "-"}</span>
                  </div>
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
                    {currentBranch?.status && (
                      <Badge variant="secondary" className="uppercase">
                        {currentBranch.status === "IN_PROGRESS" ? "In progress" : currentBranch.status.toLowerCase()}
                      </Badge>
                    )}
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
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </aside>
    </div>
  )
}
