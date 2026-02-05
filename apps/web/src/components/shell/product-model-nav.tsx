"use client"

import { useMemo } from "react"
import { ChevronRight, Clock, File, Folder, Layers, FolderTree } from "lucide-react"

import type { NavTreeItem } from "@/components/shell/nav"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

type NavTreeNodeWithPath = {
  item: NavTreeItem
  path: string[]
}

function formatRelativeTime(isoString: string): string {
  const timestamp = new Date(isoString).getTime()
  if (!Number.isFinite(timestamp)) return isoString

  const deltaMs = Date.now() - timestamp
  const deltaSeconds = Math.round(deltaMs / 1000)
  const deltaMinutes = Math.round(deltaSeconds / 60)
  const deltaHours = Math.round(deltaMinutes / 60)
  const deltaDays = Math.round(deltaHours / 24)

  if (Math.abs(deltaSeconds) < 60) return "just now"
  if (Math.abs(deltaMinutes) < 60) return `${deltaMinutes}m ago`
  if (Math.abs(deltaHours) < 24) return `${deltaHours}h ago`
  if (Math.abs(deltaDays) < 7) return `${deltaDays}d ago`
  return new Date(isoString).toLocaleDateString()
}

function getTreeItemLabel(item: NavTreeItem): string {
  return item.name
}

function getTreeItemChildren(item: NavTreeItem): NavTreeItem[] {
  switch (item.type) {
    case "ProductModel":
      return [item.rootAssembly]
    case "Assembly":
    case "AssemblyVariant":
      return item.positions ?? item.children ?? []
    case "Position":
      if (item.occurrences?.length) {
        return item.occurrences.flatMap((occurrence) => occurrence.children ?? [])
      }
      return item.children ?? []
    case "ModuleVariant":
      return item.children ?? []
    default:
      return item.children ?? []
  }
}

function flattenNavTree(
  items: NavTreeItem[],
  path: string[] = [],
): NavTreeNodeWithPath[] {
  return items.flatMap((item) => {
    const nextPath = [...path, item.name]
    const children = getTreeItemChildren(item)
    return [{ item, path: nextPath }, ...flattenNavTree(children, nextPath)]
  })
}

function getNavTreeItemParentPath(node: NavTreeNodeWithPath): string {
  return node.path.slice(0, -1).join(" / ")
}

function getNavTreeNodeKey(node: NavTreeNodeWithPath): string {
  return `${node.item.id}:${node.path.join(">")}`
}

function NavTypeGroup({
  label,
  items,
  defaultOpen = false,
}: {
  label: string
  items: NavTreeNodeWithPath[]
  defaultOpen?: boolean
}) {
  if (!items.length) return null

  const sortedItems = [...items].sort((a, b) => a.item.name.localeCompare(b.item.name))

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
        defaultOpen={defaultOpen}
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="h-auto items-start py-2">
            <ChevronRight className="transition-transform" />
            <Folder />
            <span className="min-w-0 flex-1 whitespace-normal break-words">
              {label}
            </span>
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {items.length}
            </span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {sortedItems.map((node) => {
              const parentPath = getNavTreeItemParentPath(node)
              return (
                <SidebarMenuItem key={getNavTreeNodeKey(node)}>
                  <SidebarMenuButton className="h-auto items-start py-2">
                    <File />
                    <div className="min-w-0 flex-1">
                      <div className="whitespace-normal break-words">
                        {node.item.name}
                      </div>
                      {parentPath ? (
                        <div className="mt-0.5 text-xs text-muted-foreground truncate">
                          {parentPath}
                        </div>
                      ) : null}
                    </div>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

function Tree({ item }: { item: NavTreeItem }) {
  const name = getTreeItemLabel(item)
  const items = getTreeItemChildren(item)

  if (!items.length) {
    return (
      <SidebarMenuButton className="h-auto items-start py-2 data-[active=true]:bg-transparent">
        <File />
        <span className="min-w-0 flex-1 whitespace-normal break-words">
          {name}
        </span>
      </SidebarMenuButton>
    )
  }

  return (
    <SidebarMenuItem>
      <Collapsible
        className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90"
      >
        <CollapsibleTrigger asChild>
          <SidebarMenuButton className="h-auto items-start py-2">
            <ChevronRight className="transition-transform" />
            <Folder />
            <span className="min-w-0 flex-1 whitespace-normal break-words">
              {name}
            </span>
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {items.map((subItem, index) => (
              <Tree key={`${subItem.id}-${index}`} item={subItem} />
            ))}
          </SidebarMenuSub>
        </CollapsibleContent>
      </Collapsible>
    </SidebarMenuItem>
  )
}

export function ProductModelNav({ items }: { items: NavTreeItem[] }) {
  const nav = useMemo(() => {
    const flatTree = flattenNavTree(items)

    const byType = flatTree.reduce((acc, node) => {
      const type = node.item.type
      acc[type] = [...(acc[type] ?? []), node]
      return acc
    }, {} as Record<NavTreeItem["type"], NavTreeNodeWithPath[]>)

    const recent = flatTree
      .filter((node) => typeof node.item.updatedAt === "string")
      .sort((a, b) => {
        const aTime = a.item.updatedAt ? new Date(a.item.updatedAt).getTime() : 0
        const bTime = b.item.updatedAt ? new Date(b.item.updatedAt).getTime() : 0
        return bTime - aTime
      })
      .slice(0, 12)

    return { byType, recent }
  }, [items])

  return (
    <Tabs defaultValue="tree">
      <TabsList>
        <TabsTrigger value="tree" className="text-xs" aria-label="Tree" title="Tree">
          <FolderTree />
          <span className="sr-only">Tree</span>
        </TabsTrigger>
        <TabsTrigger value="type" className="text-xs" aria-label="By type" title="By type">
          <Layers />
          <span className="sr-only">By type</span>
        </TabsTrigger>
        <TabsTrigger value="recent" className="text-xs" aria-label="Recently edited" title="Recently edited">
          <Clock />
          <span className="sr-only">Recently edited</span>
        </TabsTrigger>
      </TabsList>

      <TabsContent value="tree">
        <SidebarMenu>
          {items.map((item) => (
            <Tree key={item.id} item={item} />
          ))}
        </SidebarMenu>
      </TabsContent>

      <TabsContent value="type">
        <SidebarMenu>
          <NavTypeGroup
            label="Product models"
            items={nav.byType["ProductModel"] ?? []}
            defaultOpen
          />
          <NavTypeGroup
            label="Assemblies"
            items={nav.byType["Assembly"] ?? []}
          />
          <NavTypeGroup
            label="Positions"
            items={nav.byType["Position"] ?? []}
          />
          <NavTypeGroup
            label="Variants"
            items={[
              ...(nav.byType["ModuleVariant"] ?? []),
              ...(nav.byType["AssemblyVariant"] ?? []),
            ]}
          />
        </SidebarMenu>
      </TabsContent>

      <TabsContent value="recent">
        <SidebarMenu>
          {nav.recent.length ? (
            nav.recent.map((node) => (
              <SidebarMenuItem key={getNavTreeNodeKey(node)}>
                <SidebarMenuButton className="items-center">
                  <File />
                  <span className="min-w-0 flex-1 truncate">
                    {node.item.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {node.item.updatedAt ? formatRelativeTime(node.item.updatedAt) : ""}
                  </span>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))
          ) : (
            <SidebarMenuItem>
              <SidebarMenuButton
                className="h-auto items-start py-2"
                disabled
              >
                <File />
                <span className="min-w-0 flex-1 whitespace-normal break-words text-muted-foreground">
                  No recent edits
                </span>
              </SidebarMenuButton>
            </SidebarMenuItem>
          )}
        </SidebarMenu>
      </TabsContent>
    </Tabs>
  )
}
