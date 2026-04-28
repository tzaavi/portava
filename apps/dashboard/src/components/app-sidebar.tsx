import { Link } from "@tanstack/react-router"
import { FolderOpen, LayoutDashboard, Settings } from "lucide-react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar"

const navItems = [
  { title: "Overview", url: "/", icon: LayoutDashboard },
  { title: "Portals", url: "/portals", icon: FolderOpen },
  { title: "Settings", url: "/settings", icon: Settings },
]

function PortavaLogo() {
  return (
    <div className="flex items-center gap-2.5">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-sky-500">
        <svg viewBox="0 0 16 16" className="h-4 w-4 fill-white" aria-hidden="true">
          <path d="M3 2h5.5a3 3 0 0 1 0 6H5v6H3V2zm2 2v2h3.5a1 1 0 0 0 0-2H5z" />
        </svg>
      </div>
      <span className="text-base font-semibold tracking-tight text-sidebar-foreground">Portava</span>
    </div>
  )
}

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-4 py-3">
        <PortavaLogo />
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    render={<Link to={item.url} activeProps={{ className: "bg-sidebar-accent" }} />}
                  >
                    <item.icon />
                    <span>{item.title}</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
