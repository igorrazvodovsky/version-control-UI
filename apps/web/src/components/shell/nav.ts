import type { LucideIcon } from "lucide-react"
import { BarChart, Calendar, FileText, Home, Inbox, Search, Settings, Users, GitBranch, Package, Layers, Tag, Shield, Plug, Library, Smile } from "lucide-react"

type NavItem = {
  label: string
  icon: LucideIcon
  tooltip?: string
  isActive?: boolean
}

type NavGroup = {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

const workspaceOptions = ["All channels", "Direct sales", "Partner A", "Partner B"]

const navGroups = [
    {
      title: "Business process",
      url: "#",
      icon: GitBranch,
      isActive: true,
      items: [
        {
          title: "Entities",
          url: "#",
        },
        {
          title: "Lifecycle",
          url: "#",
        },
      ],
    },
    {
      title: "Catalog",
      url: "#",
      icon: Package,
      items: [
        {
          title: "Products",
          url: "#",
        },
        {
          title: "Services",
          url: "#",
        }
      ],
    },
    {
      title: "Pricing",
      url: "#",
      icon: Tag,
      items: [
        {
          title: "Price models",
          url: "#",
        },
        {
          title: "Subscriptions",
          url: "#",
        },
      ],
    },
    {
      title: "Governance",
      url: "#",
      icon: Shield,
      items: [
        {
          title: "Roles",
          url: "#",
        },
        {
          title: "Organizations",
          url: "#",
        }
      ],
    },
    {
      title: "Integration",
      url: "#",
      icon: Plug,
      items: [
        {
          title: "Price models",
          url: "#",
        },
        {
          title: "Subscriptions",
          url: "#",
        },
      ],
    },
    {
      title: "Experience",
      url: "#",
      icon: Smile,
      items: [
        {
          title: "Editors",
          url: "#",
        },
        {
          title: "Configurator",
          url: "#",
        },
        {
          title: "Branding",
          url: "#",
        },
        {
          title: "Languages and Localization",
          url: "#",
        }
      ],
    },
    {
      title: "Reference data",
      url: "#",
      icon: Library,
      items: [
        {
          title: "...",
          url: "#",
        }
      ],
    }
  ]

export { navGroups, workspaceOptions }
export type { NavGroup, NavItem }
