import { NavLink, useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { Badge } from '@/components/ui/badge';
import { navGroups } from '@/lib/nav-config';

export function AppSidebar() {
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="px-3 py-4">
        <span className="text-sm font-semibold tracking-tight text-sidebar-foreground group-data-[collapsible=icon]:hidden">
          Real Estate Admin
        </span>
      </SidebarHeader>
      <SidebarContent>
        {navGroups.map((group) => (
          <SidebarGroup key={group.id}>
            <SidebarGroupLabel>{group.label}</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const Icon = item.icon;

                  if (item.status === 'absent') {
                    return (
                      <SidebarMenuItem key={item.id}>
                        <SidebarMenuButton
                          disabled
                          tooltip={`${item.label} — backend not built yet`}
                          className="cursor-not-allowed opacity-50 hover:bg-transparent hover:text-sidebar-foreground"
                        >
                          <Icon />
                          <span>{item.label}</span>
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px] font-normal group-data-[collapsible=icon]:hidden"
                          >
                            Soon
                          </Badge>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  }

                  return (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        asChild
                        isActive={location.pathname === item.path}
                        tooltip={item.label}
                      >
                        <NavLink to={item.path} end={item.path === '/'}>
                          <Icon />
                          <span>{item.label}</span>
                          {item.status === 'partial' && (
                            <Badge
                              variant="secondary"
                              className="ml-auto text-[10px] font-normal group-data-[collapsible=icon]:hidden"
                            >
                              Partial
                            </Badge>
                          )}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  );
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  );
}
