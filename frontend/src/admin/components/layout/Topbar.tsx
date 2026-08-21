import { useState } from 'react';
import { Moon, Sun } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Separator } from '@/components/ui/separator';
import { applyTheme, getCurrentTheme, type Theme } from '@/lib/theme';

const THEME_LABELS: Record<Theme, string> = {
  spring: 'Spring',
  ocean: 'Ocean',
};

export function Topbar() {
  const [theme, setTheme] = useState<Theme>(() => getCurrentTheme());

  const handleSelect = (next: Theme) => {
    applyTheme(next);
    setTheme(next);
  };

  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <span className="text-sm font-medium text-foreground">Admin</span>
      <div className="ml-auto flex items-center gap-2">
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
