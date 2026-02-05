"use client"

import { Bell, ChevronsUpDown, HelpCircle, Settings, User } from "lucide-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { SidebarMenuButton } from "@/components/ui/sidebar"

export function AdminMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <SidebarMenuButton
          size="lg"
          className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
        >
          <div className="flex aspect-square size-8 shrink-0 items-center justify-center rounded-lg bg-neutral-200">
            <Settings className="size-4" />
          </div>
          <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
            <span className="truncate font-semibold">Administration</span>
            <span className="truncate text-xs text-muted-foreground">Set up, releases, stuff</span>
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
        {/* TODO: Move to submenu */}
        {/* <DropdownMenuItem>
          <LogOut className="mr-2 size-4" />
          Log out
        </DropdownMenuItem> */}
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <Bell className="mr-2 size-4" />
          Notifications
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 size-4" />
          Version and release management
        </DropdownMenuItem>
        <DropdownMenuItem>
          <User className="mr-2 size-4" />
          Jobs
        </DropdownMenuItem>
        <DropdownMenuItem>
          <Settings className="mr-2 size-4" />
          Setup
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem>
          <HelpCircle className="mr-2 size-4" />
          Help
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
