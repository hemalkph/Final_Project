import { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { ChevronRight, Moon, Search, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { allNavItems } from '@/lib/nav-config';
import { applyTheme, getCurrentTheme, type Theme } from '@/lib/theme';

const THEME_LABELS: Record<Theme, string> = {
  spring: 'Spring',
  ocean: 'Ocean',
};

function useBreadcrumbLabel(): string {
  const location = useLocation();
  const current = allNavItems.find((item) => item.path === location.pathname);
  return current?.label ?? 'Dashboard';
}

export function Topbar() {
  const [theme, setTheme] = useState<Theme>(() => getCurrentTheme());
  const pageLabel = useBreadcrumbLabel();
  const isRoot = pageLabel === 'Dashboard';

  const handleSelect = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />

      <nav className="flex items-center gap-1.5 text-sm">
        <span className={isRoot ? 'font-medium text-foreground' : 'text-muted-foreground'}>Dashboard</span>
        {!isRoot && (
          <>
            <ChevronRight className="size-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">{pageLabel}</span>
          </>
        )}
      </nav>

      <div className="ml-auto flex items-center gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative hidden md:block">
              <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
              <Input placeholder="Search…" disabled className="w-56 pl-8" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Search isn't wired up yet</TooltipContent>
        </Tooltip>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              {theme === 'spring' ? (
                <Sun className="mr-1.5 size-4" />
              ) : (
                <Moon className="mr-1.5 size-4" />
              )}
              {THEME_LABELS[theme]}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => handleSelect('spring')}>
              Spring
            </DropdownMenuItem>
            <DropdownMenuItem onSelect={() => handleSelect('ocean')}>
              Ocean
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
