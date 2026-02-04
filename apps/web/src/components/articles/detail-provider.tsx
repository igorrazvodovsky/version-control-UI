"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
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
  type VersionControlBranch,
} from "@/lib/version-control"

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

type ArticleDetailContextValue = {
  article: Article | null
  loading: boolean
  error: string | null
  formState: ArticleForm
  handleFieldChange: (field: keyof ArticleForm, value: string) => void
  flushAutosave: () => Promise<void>
  isDirty: boolean
  saveStatus: SaveStatus
  saveError: string | null
  statusLabel: string
  branches: VersionControlBranch[]
  branchesLoading: boolean
  selectedBranch: string | null
  branchChanges: BranchChange[]
  branchChangesLoading: boolean
  history: ArticleHistoryEntry[]
  historyLoading: boolean
  handleBranchSelect: (nextBranch: string) => Promise<void>
  handleSaveCommit: () => Promise<void>
  handleDiscard: () => Promise<void>
  handleCreateBranch: () => Promise<void>
}

type ArticleDetailProviderProps = {
  slug: string
  children: React.ReactNode
}

const ArticleDetailContext = createContext<ArticleDetailContextValue | null>(null)

const findReusableBranch = (branches: VersionControlBranch[]) => {
  return branches.find((branch) => branch.name !== "main" && branch.status === "IN_PROGRESS") ?? null
}

export function ArticleDetailProvider({ slug, children }: ArticleDetailProviderProps) {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

  const [article, setArticle] = useState<Article | null>(null)
  const [formState, setFormState] = useState<ArticleForm>({
    title: "",
    description: "",
    body: "",
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [branches, setBranches] = useState<VersionControlBranch[]>([])
  const [currentBranch, setCurrentBranch] = useState<VersionControlBranch | null>(null)
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
      void persistWorkingCopy()
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

  const handleCreateBranch = async () => {
    try {
      await ensureEditBranch()
      await loadBranches()
      toast({
        title: "Branch ready",
        description: "Switched to the active edit branch.",
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unable to create a branch."
      toast({
        title: "Branch creation failed",
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

  const value: ArticleDetailContextValue = {
    article,
    loading,
    error,
    formState,
    handleFieldChange,
    flushAutosave,
    isDirty,
    saveStatus,
    saveError,
    statusLabel,
    branches,
    branchesLoading,
    selectedBranch,
    branchChanges,
    branchChangesLoading,
    history,
    historyLoading,
    handleBranchSelect,
    handleSaveCommit,
    handleDiscard,
    handleCreateBranch,
  }

  return <ArticleDetailContext.Provider value={value}>{children}</ArticleDetailContext.Provider>
}

export function useArticleDetail() {
  const context = useContext(ArticleDetailContext)
  if (!context) {
    throw new Error("useArticleDetail must be used within ArticleDetailProvider.")
  }
  return context
}

export function useOptionalArticleDetail() {
  return useContext(ArticleDetailContext)
}
