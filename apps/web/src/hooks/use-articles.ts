"use client"

import { useEffect, useState } from "react"
import { DEFAULT_API_BASE_URL, fetchArticles, type Article } from "@/lib/articles"

type UseArticlesResult = {
  articles: Article[]
  error: string | null
  loading: boolean
  apiBaseUrl: string
}

export function useArticles(): UseArticlesResult {
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? DEFAULT_API_BASE_URL
  const [articles, setArticles] = useState<Article[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    const loadArticles = async () => {
      setLoading(true)
      setError(null)

      try {
        const { articles: nextArticles } = await fetchArticles({
          baseUrl: apiBaseUrl,
          requestInit: { cache: "no-store" },
        })

        if (cancelled) {
          return
        }

        setArticles(nextArticles)
      } catch (err) {
        if (cancelled) {
          return
        }

        const message = err instanceof Error ? err.message : "Unable to load articles."
        setError(message)
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadArticles()

    return () => {
      cancelled = true
    }
  }, [apiBaseUrl])

  return { articles, error, loading, apiBaseUrl }
}
