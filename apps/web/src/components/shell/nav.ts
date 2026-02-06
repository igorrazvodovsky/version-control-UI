import type { LucideIcon } from "lucide-react"
import {
  BookOpen,
  Bot,
  Frame,
  GitBranch,
  Library,
  LifeBuoy,
  Map,
  Package,
  PieChart,
  Plug,
  Send,
  Settings2,
  Shield,
  Smile,
  SquareTerminal,
  Tag,
} from "lucide-react"

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

type NavMainItem = {
  title: string
  url: string
  icon: LucideIcon
  isActive?: boolean
  items?: {
    title: string
    url: string
  }[]
}

type NavSecondaryItem = {
  title: string
  url: string
  icon: LucideIcon
}

type NavProjectItem = {
  name: string
  url: string
  icon: LucideIcon
}

type NavUser = {
  name: string
  email: string
  avatar: string
}

type NavDemoData = {
  user: NavUser
  navMain: NavMainItem[]
  navSecondary: NavSecondaryItem[]
  projects: NavProjectItem[]
}

type NavTreeAttributeDomainOption = {
  key: string
  label: string
}

type NavTreeAttribute = {
  id: string
  name: string
  dataType: "number" | "enum" | "boolean" | "string"
  unit?: string
  domain?: NavTreeAttributeDomainOption[]
  default?: number | string | boolean
}

type NavTreePart = {
  id: string
  partNumber: string
  name: string
  qty: number
  uom: string
}

type NavTreePositionOccurrence = {
  occurrenceId: string
  selectedVariant: string
  children?: NavTreeItem[]
}

type NavTreeNodeBase = {
  id: string
  name: string
  type: string
  updatedAt?: string
  attributes?: NavTreeAttribute[]
  parts?: NavTreePart[]
  children?: NavTreeItem[]
}

type NavTreePosition = NavTreeNodeBase & {
  type: "Position"
  minOccurs: number
  maxOccurs: number
  allowedVariants?: string[]
  selectedVariant?: string
  occurrences?: NavTreePositionOccurrence[]
}

type NavTreeAssembly = NavTreeNodeBase & {
  type: "Assembly"
  quantity: number
  positions?: NavTreePosition[]
}

type NavTreeModuleVariant = NavTreeNodeBase & {
  type: "ModuleVariant"
}

type NavTreeAssemblyVariant = NavTreeNodeBase & {
  type: "AssemblyVariant"
  positions?: NavTreePosition[]
}

type NavTreeProductModel = {
  id: string
  name: string
  type: "ProductModel"
  updatedAt?: string
  metadata: {
    version: string
    currency: string
    uomSystem: string
  }
  attributes?: NavTreeAttribute[]
  rootAssembly: NavTreeAssembly
}

type NavTreeItem =
  | NavTreeProductModel
  | NavTreeAssembly
  | NavTreePosition
  | NavTreeModuleVariant
  | NavTreeAssemblyVariant

type NavChangeItem = {
  file: string
  state: string
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
      },
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
      },
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
      },
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
      },
    ],
  },
]

const navMockData: NavDemoData = {
  user: {
    name: "shadcn",
    email: "m@example.com",
    avatar: "/avatars/shadcn.jpg",
  },
  navMain: [
    {
      title: "Playground",
      url: "#",
      icon: SquareTerminal,
      isActive: true,
      items: [
        {
          title: "History",
          url: "#",
        },
        {
          title: "Starred",
          url: "#",
        },
        {
          title: "Settings",
          url: "#",
        },
      ],
    },
    {
      title: "Models",
      url: "#",
      icon: Bot,
      items: [
        {
          title: "Genesis",
          url: "#",
        },
        {
          title: "Explorer",
          url: "#",
        },
        {
          title: "Quantum",
          url: "#",
        },
      ],
    },
    {
      title: "Documentation",
      url: "#",
      icon: BookOpen,
      items: [
        {
          title: "Introduction",
          url: "#",
        },
        {
          title: "Get Started",
          url: "#",
        },
        {
          title: "Tutorials",
          url: "#",
        },
        {
          title: "Changelog",
          url: "#",
        },
      ],
    },
    {
      title: "Settings",
      url: "#",
      icon: Settings2,
      items: [
        {
          title: "General",
          url: "#",
        },
        {
          title: "Team",
          url: "#",
        },
        {
          title: "Billing",
          url: "#",
        },
        {
          title: "Limits",
          url: "#",
        },
      ],
    },
  ],
  navSecondary: [
    {
      title: "Support",
      url: "#",
      icon: LifeBuoy,
    },
    {
      title: "Feedback",
      url: "#",
      icon: Send,
    },
  ],
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
}

const navMockChanges: NavChangeItem[] = [
  {
    file: "README.md",
    state: "M",
  },
  {
    file: "api/hello/route.ts",
    state: "U",
  },
  {
    file: "app/layout.tsx",
    state: "M",
  },
]


export {
  navGroups,
  navMockChanges,
  navMockData,
  workspaceOptions,
}
export type {
  NavChangeItem,
  NavDemoData,
  NavGroup,
  NavItem,
  NavMainItem,
  NavProjectItem,
  NavSecondaryItem,
  NavTreeItem,
}
