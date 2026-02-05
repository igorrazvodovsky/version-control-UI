"use client"

import * as React from "react"

import { NavMain } from "@/components/nav-main"
import { NavProjects } from "@/components/nav-projects"
import { NavSecondary } from "@/components/nav-secondary"
import { navMockData } from "@/components/shell/nav"

export function Nav() {
  return (
    <>
      <NavMain items={navMockData.navMain} />
      <NavProjects projects={navMockData.projects} />
      <NavSecondary items={navMockData.navSecondary} className="mt-auto" />
    </>
  )
}
