"use client"

import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { useArticleDetail } from "@/components/articles/detail-provider"
import { cn } from "@/lib/utils"

export default function ArticleDetailMain() {
  const {
    article,
    loading,
    error,
    formState,
    handleFieldChange,
    flushAutosave,
    saveError,
    saveStatus,
    statusLabel,
  } = useArticleDetail()

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-8 w-8" />
      </div>
    )
  }

  if (error || !article) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-3 text-center">
        <p className="text-lg font-semibold text-foreground">Unable to load article</p>
        <p className="text-sm text-muted-foreground">{error ?? "Article not found."}</p>
        <Button asChild variant="outline">
          <Link href="/">Back to articles</Link>
        </Button>
      </div>
    )
  }

  return (
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

        {saveError && <p className="text-sm text-destructive">{saveError}</p>}
      </div>
    </div>
  )
}
