import type { LucideIcon } from "lucide-react"
import { BarChart, Calendar, FileText, Home, Inbox, Search, Settings, Users } from "lucide-react"

type NavItem = {
  label: string
  icon: LucideIcon
  tooltip?: string
  isActive?: boolean
}

type NavGroup = {
  label: string
  items: NavItem[]
}

const workspaceOptions = ["All channels", "Direct sales", "Partner A", "Partner B"]

const navGroups: NavGroup[] = [
  {
    label: "Platform",
    items: [
      { label: "Dashboard", icon: Home, tooltip: "Dashboard", isActive: true },
      { label: "Inbox", icon: Inbox, tooltip: "Inbox" },
      { label: "Calendar", icon: Calendar, tooltip: "Calendar" },
      { label: "Search", icon: Search, tooltip: "Search" },
    ],
  },
  {
    label: "Workspace",
    items: [
      { label: "Documents", icon: FileText, tooltip: "Documents" },
      { label: "Analytics", icon: BarChart, tooltip: "Analytics" },
      { label: "Team", icon: Users, tooltip: "Team" },
      { label: "Settings", icon: Settings, tooltip: "Settings" },
    ],
  },
]

export { navGroups, workspaceOptions }
export type { NavGroup, NavItem }
