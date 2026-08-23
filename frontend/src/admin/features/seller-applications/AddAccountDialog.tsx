import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { queryKeys } from '@/lib/queryKeys';
import { accountsApi } from './api';

const formSchema = z.object({
  username: z.string().min(1, 'Username is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

type FormSchema = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormSchema = { username: '', password: '' };

interface AddAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddAccountDialog({ open, onOpenChange }: AddAccountDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  const mutation = useMutation({
    mutationFn: (values: FormSchema) => accountsApi.createManual(values),
    onSuccess: (_data, values) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all() });
      // This account won't reappear in the Accounts list afterward (the
      // pre-generated endpoint only ever returns the 5 fixed demo sellers —
      // see Phase 3 audit), so surface the credential here while we have it.
      toast.success('Account created', { description: `Username: ${values.username}` });
      form.reset(EMPTY_VALUES);
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error('Failed to create account', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => mutation.mutate(values));

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) form.reset(EMPTY_VALUES);
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Account</DialogTitle>
          <DialogDescription>Manually create a seller login. The credentials are shown once — save them now.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="username"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Username (Email)</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Password</FormLabel>
                  <FormControl>
                    <Input type="text" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending}>
                {mutation.isPending ? 'Creating…' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
