import { useState } from 'react';
import type { ColumnDef } from '@tanstack/react-table';
import { Copy, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import type { SellerAccount } from '@/types/seller';

// Masked by default with a reveal toggle + copy button — legacy showed the
// password in plaintext unconditionally; this is a presentation-only
// improvement, no backend change.
function PasswordCell({ password }: { password: string }) {
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="flex items-center gap-1.5">
      <code className="text-sm">{revealed ? password : '••••••••'}</code>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={() => setRevealed((prev) => !prev)}
      >
        {revealed ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        <span className="sr-only">{revealed ? 'Hide password' : 'Show password'}</span>
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="size-6"
        onClick={() => {
          navigator.clipboard.writeText(password);
          toast.success('Password copied');
        }}
      >
        <Copy className="size-3.5" />
        <span className="sr-only">Copy password</span>
      </Button>
    </div>
  );
}

export function getAccountColumns(): ColumnDef<SellerAccount>[] {
  return [
    {
      accessorKey: 'username',
      header: 'Username',
    },
    {
      id: 'password',
      header: 'Password',
      enableSorting: false,
      cell: ({ row }) => <PasswordCell password={row.original.password} />,
    },
  ];
}
