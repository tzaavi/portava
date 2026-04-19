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

export function AppSidebar() {
  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <span className="text-lg font-semibold tracking-tight">Portava</span>
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
