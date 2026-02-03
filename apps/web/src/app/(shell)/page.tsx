"use client"

import { useEffect, useState } from "react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/articles/data-table"
import { columns } from "@/components/articles/columns"
import { Spinner } from "@/components/ui/spinner"
import { DEFAULT_API_BASE_URL, fetchArticles, type Article } from "@/lib/articles"

export default function ArticlesPage() {
  const [articles, setArticles] = useState<Article[]>([])
  const [articlesError, setArticlesError] = useState<string | null>(null)
  const [articlesLoading, setArticlesLoading] = useState(true)

  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL

  useEffect(() => {
    let cancelled = false

    const loadArticles = async () => {
      setArticlesLoading(true)
      setArticlesError(null)

      try {
        const { articles: nextArticles } = await fetchArticles({
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
  )
}
