"use client"

import { Check, ChevronsUpDown, GitCommit } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"
import type { VersionControlBranch } from "@/lib/version-control"

type WorkspaceBranchMenuProps = {
  contextLabel: string
  activeWorkspace: string
  workspaceOptions: string[]
  onWorkspaceSelect: (workspace: string) => void
  showBranchMenu: boolean
  branchesLoading: boolean
  branches: VersionControlBranch[]
  currentBranchLabel: string
  currentBranchName: string
  mainBranch: VersionControlBranch | null
  otherBranches: VersionControlBranch[]
  onBranchSelect: (name: string) => void
  onCreateBranch?: () => void
}

export function WorkspaceBranchMenu({
  contextLabel,
  activeWorkspace,
  workspaceOptions,
  onWorkspaceSelect,
  showBranchMenu,
  branchesLoading,
  branches,
  currentBranchLabel,
  currentBranchName,
  mainBranch,
  otherBranches,
  onBranchSelect,
  onCreateBranch,
}: WorkspaceBranchMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">{contextLabel}</span>
            <span className="truncate text-xs text-muted-foreground">{activeWorkspace}</span>
          </div>
          <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
        </SidebarMenuButton>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
        <DropdownMenuSub>
          <DropdownMenuSubTrigger className="gap-2 p-2">
            <span>{activeWorkspace}</span>
          </DropdownMenuSubTrigger>
          <DropdownMenuSubContent className="min-w-56">
            {workspaceOptions.map((workspace) => (
              <DropdownMenuItem
                key={workspace}
                onClick={() => onWorkspaceSelect(workspace)}
                className="gap-2 p-2"
              >
                <div className="flex size-6 items-center justify-center rounded-sm border">
                  <span className="text-xs font-semibold">{workspace.charAt(0)}</span>
                </div>
                <span className="flex-1 truncate">{workspace}</span>
                {workspace === activeWorkspace ? <Check className="size-4" /> : null}
              </DropdownMenuItem>
            ))}
          </DropdownMenuSubContent>
        </DropdownMenuSub>
        <DropdownMenuSeparator />
        {showBranchMenu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger className="gap-2 p-2">
              {currentBranchLabel}
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className="min-w-56">
              {branchesLoading && branches.length === 0 ? (
                <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                  Loading branches…
                </DropdownMenuItem>
              ) : (
                <>
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Versions</DropdownMenuLabel>
                  {mainBranch ? (
                    <DropdownMenuItem
                      key={mainBranch.id}
                      onClick={() => onBranchSelect(mainBranch.name)}
                      className="gap-2"
                    >
                      <span className="flex-1 truncate">main</span>
                      <span className="text-xs text-muted-foreground">
                        {typeof mainBranch.version === "number" ? `v${mainBranch.version}` : "v—"}
                      </span>
                      {currentBranchName === mainBranch.name ? <Check className="size-4" /> : null}
                    </DropdownMenuItem>
                  ) : null}
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel className="text-xs text-muted-foreground">Tickets</DropdownMenuLabel>
                  {otherBranches.length ? (
                    otherBranches.map((branch) => {
                      const version = typeof branch.baseVersion === "number" ? `v${branch.baseVersion}` : "v—"
                      return (
                        <DropdownMenuItem
                          key={branch.id}
                          onClick={() => onBranchSelect(branch.name)}
                          className="gap-2"
                        >
                          <span className="flex-1 truncate">{branch.label}</span>
                          <span className="text-xs text-muted-foreground">{version}</span>
                          {currentBranchName === branch.name ? <Check className="size-4" /> : null}
                        </DropdownMenuItem>
                      )
                    })
                  ) : (
                    <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                      No other tickets
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onCreateBranch ? (
                    <DropdownMenuItem onClick={onCreateBranch} className="gap-2">
                      <GitCommit className="size-4" />
                      Create new ticket
                    </DropdownMenuItem>
                  ) : null}
                </>
              )}
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
        <DropdownMenuItem className="gap-2 p-2">
          <div className="flex size-6 items-center justify-center rounded-sm border">
            <span className="text-xs font-semibold">-</span>
          </div>
          Changes
        </DropdownMenuItem>
        <DropdownMenuItem className="gap-2 p-2">
          <div className="flex size-6 items-center justify-center rounded-sm border">
            <span className="text-xs font-semibold">-</span>
          </div>
          Activity log
        </DropdownMenuItem>
        {/* <DropdownMenuSeparator /> */}
        {/* <DropdownMenuItem className="gap-2 p-2">
          <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
            <Plus className="size-4" />
          </div>
          <div className="font-medium text-muted-foreground">Add workspace</div>
        </DropdownMenuItem> */}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
