"use client"

import { ArticlesTableState } from "@/components/articles/articles-table-state"
import { useArticles } from "@/hooks/use-articles"

export default function DualSidebarPage() {
  const { articles, error, loading, apiBaseUrl } = useArticles()

  return (
    <ArticlesTableState articles={articles} error={error} loading={loading} apiBaseUrl={apiBaseUrl} />
  )
}
