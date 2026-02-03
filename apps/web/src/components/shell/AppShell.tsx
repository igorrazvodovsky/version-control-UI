"use client"

import { useState } from "react"
import { useParams } from "next/navigation"
import { ArticleDetailProvider } from "@/components/articles/detail-provider"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandShortcut,
} from "@/components/ui/command"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarRail,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import {
  Bell,
  Calculator,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  CreditCard,
  HelpCircle,
  LogOut,
  Plus,
  Search,
  Settings,
  Smile,
  User,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { navGroups, workspaceOptions } from "@/components/shell/nav"

type AppShellProps = {
  children: React.ReactNode
  rightSidebar?: React.ReactNode
}

export default function AppShell({ children, rightSidebar }: AppShellProps) {
  const params = useParams()
  const slugParam = params?.slug
  const slug = Array.isArray(slugParam) ? slugParam[0] ?? "" : slugParam ?? ""
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(true)
  const [rightSidebarOpen, setRightSidebarOpen] = useState(true)
  const [activeWorkspace, setActiveWorkspace] = useState(workspaceOptions[0] ?? "Workspace")
  const [commandOpen, setCommandOpen] = useState(false)
  const hasRightSidebar = rightSidebar !== null && rightSidebar !== undefined
  const shouldProvideArticle = typeof slug === "string" && slug.length > 0

  const shell = (
    <div className="flex h-screen bg-background">
      <SidebarProvider open={leftSidebarOpen} onOpenChange={setLeftSidebarOpen}>
        <Sidebar side="left" collapsible="icon">
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                        <span className="text-sm font-semibold">{activeWorkspace.charAt(0)}</span>
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">{activeWorkspace}</span>
                        <span className="truncate text-xs text-muted-foreground">Free Plan</span>
                      </div>
                      <ChevronsUpDown className="ml-auto group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-(--radix-dropdown-menu-trigger-width) min-w-56" align="start">
                    <DropdownMenuLabel className="text-xs text-muted-foreground">Workspaces</DropdownMenuLabel>
                    {workspaceOptions.map((workspace) => (
                      <DropdownMenuItem
                        key={workspace}
                        onClick={() => setActiveWorkspace(workspace)}
                        className="gap-2 p-2"
                      >
                        <div className="flex size-6 items-center justify-center rounded-sm border">
                          <span className="text-xs font-semibold">{workspace.charAt(0)}</span>
                        </div>
                        {workspace}
                      </DropdownMenuItem>
                    ))}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="gap-2 p-2">
                      <div className="flex size-6 items-center justify-center rounded-md border border-dashed">
                        <Plus className="size-4" />
                      </div>
                      <div className="font-medium text-muted-foreground">Add workspace</div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          <SidebarContent>
            {navGroups.map((group) => (
              <SidebarGroup key={group.label}>
                <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {group.items.map((item) => (
                      <SidebarMenuItem key={item.label}>
                        <SidebarMenuButton isActive={item.isActive} tooltip={item.tooltip ?? item.label}>
                          <item.icon />
                          <span>{item.label}</span>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>
            ))}
          </SidebarContent>

          <SidebarFooter>
            <SidebarMenu>
              <SidebarMenuItem>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <SidebarMenuButton
                      size="lg"
                      className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
                    >
                      <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-muted">
                        <User className="size-4" />
                      </div>
                      <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                        <span className="truncate font-semibold">John Doe</span>
                        <span className="truncate text-xs text-muted-foreground">john@example.com</span>
                      </div>
                      <ChevronsUpDown className="ml-auto size-4 group-data-[collapsible=icon]:hidden" />
                    </SidebarMenuButton>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    className="w-(--radix-dropdown-menu-trigger-width) min-w-56"
                    side="top"
                    align="start"
                  >
                    <DropdownMenuLabel className="p-0 font-normal">
                      <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                        <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-muted">
                          <User className="size-4" />
                        </div>
                        <div className="grid flex-1 text-left text-sm leading-tight">
                          <span className="truncate font-semibold">John Doe</span>
                          <span className="truncate text-xs text-muted-foreground">john@example.com</span>
                        </div>
                      </div>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <Bell className="mr-2 size-4" />
                      Notifications
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <User className="mr-2 size-4" />
                      Account
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <Settings className="mr-2 size-4" />
                      Settings
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem>
                      <HelpCircle className="mr-2 size-4" />
                      Help
                    </DropdownMenuItem>
                    <DropdownMenuItem>
                      <LogOut className="mr-2 size-4" />
                      Log out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>

          <SidebarRail />
        </Sidebar>

        <div className="flex flex-1 flex-col overflow-hidden">
          <header className="flex items-center justify-between border-border bg-background px-4 py-3">
            <div className="flex items-center gap-2">
              <SidebarTrigger />
            </div>

            <div className="flex flex-1 justify-center px-4">
              <Popover open={commandOpen} onOpenChange={setCommandOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={commandOpen}
                    className="w-full max-w-md justify-start gap-2 text-muted-foreground bg-transparent"
                  >
                    <Search className="size-4" />
                    <span>Type a command or search...</span>
                    <kbd className="pointer-events-none ml-auto hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                      <span className="text-xs">⌘</span>K
                    </kbd>
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[400px] p-0" align="center">
                  <Command className="rounded-lg border shadow-md">
                    <CommandInput placeholder="Type a command or search..." />
                    <CommandList>
                      <CommandEmpty>No results found.</CommandEmpty>
                      <CommandGroup heading="Suggestions">
                        <CommandItem>
                          <Calendar className="mr-2 size-4" />
                          <span>Calendar</span>
                        </CommandItem>
                        <CommandItem>
                          <Smile className="mr-2 size-4" />
                          <span>Search Emoji</span>
                        </CommandItem>
                        <CommandItem disabled>
                          <Calculator className="mr-2 size-4" />
                          <span>Calculator</span>
                        </CommandItem>
                      </CommandGroup>
                      <CommandGroup heading="Settings">
                        <CommandItem>
                          <User className="mr-2 size-4" />
                          <span>Profile</span>
                          <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <CreditCard className="mr-2 size-4" />
                          <span>Billing</span>
                          <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem>
                          <Settings className="mr-2 size-4" />
                          <span>Settings</span>
                          <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            </div>

            <div className="flex items-center gap-2">
              {hasRightSidebar && !rightSidebarOpen && (
                <Button variant="ghost" size="icon" onClick={() => setRightSidebarOpen(true)} className="h-8 w-8">
                  <ChevronLeft className="h-4 w-4" />
                  <span className="sr-only">Expand sidebar</span>
                </Button>
              )}
            </div>
          </header>

          <main className="flex-1 overflow-auto p-6">{children}</main>
        </div>
      </SidebarProvider>

      {hasRightSidebar && (
        <aside
          className={cn(
            "border-l border-border bg-sidebar transition-all duration-300 ease-in-out",
            rightSidebarOpen ? "w-80" : "w-0",
          )}
        >
          <div className={cn("flex h-full flex-col", !rightSidebarOpen && "hidden")}>
            <div className="flex items-center justify-between border-sidebar-border px-4 py-3">
              <h2 className="font-semibold text-sidebar-foreground">Details</h2>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setRightSidebarOpen(false)}
                className="h-8 w-8 text-sidebar-foreground hover:bg-sidebar-accent"
              >
                <ChevronRight className="h-4 w-4" />
                <span className="sr-only">Collapse details</span>
              </Button>
            </div>

            <div className="flex-1 space-y-6 overflow-auto p-4">{rightSidebar}</div>
          </div>
        </aside>
      )}
    </div>
  )

  if (!shouldProvideArticle) {
    return shell
  }

  return <ArticleDetailProvider slug={slug}>{shell}</ArticleDetailProvider>
}
