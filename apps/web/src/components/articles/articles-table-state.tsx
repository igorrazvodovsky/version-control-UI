"use client"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { DataTable } from "@/components/articles/data-table"
import { columns } from "@/components/articles/columns"
import { Spinner } from "@/components/ui/spinner"
import type { Article } from "@/lib/articles"

type ArticlesTableStateProps = {
  articles: Article[]
  error: string | null
  loading: boolean
  apiBaseUrl: string
}

export function ArticlesTableState({ articles, error, loading, apiBaseUrl }: ArticlesTableStateProps) {
  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-4">
      {loading ? (
        <div className="flex items-center gap-2 rounded-md border border-border bg-card p-4 text-sm text-muted-foreground">
          <Spinner className="size-4" />
          Loading articles...
        </div>
      ) : error ? (
        <Alert variant="destructive">
          <AlertTitle>Unable to load articles</AlertTitle>
          <AlertDescription>
            <p>{error}</p>
            <p>Make sure the backend is running at {apiBaseUrl}.</p>
          </AlertDescription>
        </Alert>
      ) : (
        <DataTable columns={columns} data={articles} />
      )}
    </div>
  )
}
