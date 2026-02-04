"use client"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useArticleDetail } from "@/components/articles/detail-provider"
import { Clock, Info } from "lucide-react"

export default function ArticleDetailSidebar() {
  const {
    selectedBranch,
    branchChanges,
    branchChangesLoading,
    history,
    historyLoading,
    handleSaveCommit,
    handleDiscard,
    saveStatus,
  } = useArticleDetail()

  return (
    <>
      <Tabs defaultValue="branch">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="actions">Details</TabsTrigger>
          <TabsTrigger value="branch">History</TabsTrigger>
        </TabsList>
        <TabsContent value="branch" className="mt-4 space-y-5">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Button
                size="sm"
                className="flex-1"
                onClick={handleSaveCommit}
                disabled={selectedBranch === "main" || branchChanges.length === 0 || saveStatus === "saving"}
              >
                Save & Merge
              </Button>
              {/* <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleDiscard}
                disabled={selectedBranch === "main" || branchChanges.length > 0}
              >
                Discard
              </Button> */}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Changes</span>
              <Badge variant="secondary">{branchChanges.length}</Badge>
            </div>
            {branchChangesLoading ? (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Spinner className="h-4 w-4" /> Loading changes...
              </div>
            ) : branchChanges.length ? (
              branchChanges.map((change) => (
                <div key={change.slug} className="rounded-lg bg-sidebar-accent p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium text-sidebar-foreground">{change.title}</p>
                    </div>
                    <Badge variant="outline">
                      {change.changeType}
                    </Badge>
                  </div>
                  {change.fieldsChanged.length > 0 && (
                    <p className="mt-2 text-xs text-muted-foreground">{change.fieldsChanged.join(", ")}</p>
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
                <Spinner className="h-4 w-4" /> Loading history...
              </div>
            ) : history.length ? (
              history.map((entry) => (
                <div key={entry.commit} className="rounded-lg bg-sidebar-accent p-3">
                  <p className="text-sm font-medium text-sidebar-foreground">{entry.message}</p>
                  <p className="text-xs text-muted-foreground">{new Date(entry.createdAt).toLocaleString()}</p>
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
    </>
  )
}
