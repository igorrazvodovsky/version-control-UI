import { Button } from "@/components/ui/button"
import { Clock, Info, Tag } from "lucide-react"

export default function HomeRightSidebar() {
  return (
    <>
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

      <div>
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-sidebar-foreground">
          <Tag className="h-4 w-4" />
          Actions
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
    </>
  )
}
