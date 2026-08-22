import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ImageUploader } from '@/components/media/ImageUploader';
import { agentsApi } from './api';
import { queryKeys } from '@/lib/queryKeys';
import { AGENT_STATUSES, SPECIALIZATIONS, type Agent, type AgentFormValues } from '@/types/agent';

// Plain (non-coerced) number types, same convention as PropertyFormDialog —
// <Input> onChange handlers below convert string -> number|null explicitly,
// which keeps zod's input/output types identical.
const formSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  phone: z.string(),
  title: z.string().min(1, 'Title is required'),
  // Both free text server-side (plain String columns, no Java enum, no
  // bean validation) — the Select below offers the legacy option list for
  // convenience, but the schema must accept any string so an existing
  // value outside that list (or location's real data, e.g. "Negombo",
  // which is outside the old 25-district list) never gets silently
  // rejected or blanked.
  specialization: z.string(),
  location: z.string(),
  status: z.enum(AGENT_STATUSES),
  degree: z.string(),
  qualifications: z.string(),
  experience: z.number().int().min(0).max(50).nullable(),
  propertiesSold: z.number().int().nonnegative().nullable(),
  // 0-5, not the legacy form's 1-5: rating has no server-side constraint
  // and 0 is a representable, legal value that must round-trip correctly.
  rating: z.number().min(0).max(5).nullable(),
  bio: z.string().max(1000, 'Bio must be 1000 characters or fewer'),
  profileImageUrl: z.string(),
});

type FormSchema = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormSchema = {
  name: '',
  email: '',
  phone: '',
  title: '',
  specialization: '',
  location: '',
  status: 'ACTIVE',
  degree: '',
  qualifications: '',
  experience: null,
  propertiesSold: 0,
  rating: 5,
  bio: '',
  profileImageUrl: '',
};

// ?? throughout, never || — a real 0 (experience, propertiesSold, rating)
// must populate as 0, not fall through to a default (see Phase 2 audit
// issue #5, a real legacy bug this fixes).
function agentToFormValues(agent: Agent): FormSchema {
  return {
    name: agent.name ?? '',
    email: agent.email ?? '',
    phone: agent.phone ?? '',
    title: agent.title ?? '',
    specialization: agent.specialization ?? '',
    location: agent.location ?? '',
    status: agent.status,
    degree: agent.degree ?? '',
    qualifications: agent.qualifications ?? '',
    experience: agent.experience,
    propertiesSold: agent.propertiesSold,
    rating: agent.rating,
    bio: agent.bio ?? '',
    profileImageUrl: agent.profileImageUrl ?? '',
  };
}

interface AgentFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  agent?: Agent;
}

export function AgentFormDialog({ open, onOpenChange, mode, agent }: AgentFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  const [avatarUploading, setAvatarUploading] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.reset(mode === 'edit' && agent ? agentToFormValues(agent) : EMPTY_VALUES);
    setAvatarUploading(false);
  }, [open, mode, agent, form]);

  const mutation = useMutation({
    mutationFn: async (values: FormSchema) => {
      const payload: AgentFormValues = values;
      return mode === 'add' ? agentsApi.create(payload) : agentsApi.update(agent!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.agents.all() });
      toast.success(mode === 'add' ? 'Agent created' : 'Agent updated');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(mode === 'add' ? 'Failed to create agent' : 'Failed to update agent', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    // Belt-and-braces: the Save button is already disabled while uploading,
    // but Enter-to-submit bypasses a disabled button in some browsers.
    if (avatarUploading) return;
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Agent' : 'Edit Agent'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Job Title</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="specialization"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Specialization</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SPECIALIZATIONS.map((spec) => (
                          <SelectItem key={spec} value={spec}>
                            {spec}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {AGENT_STATUSES.map((status) => (
                          <SelectItem key={status} value={status}>
                            {status}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location</FormLabel>
                  <FormControl>
                    <Input placeholder="e.g. Colombo" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="degree"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Degree</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="qualifications"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Qualifications</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Experience (yrs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="propertiesSold"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Properties Sold</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="rating"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Rating (0–5)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === '' ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="bio"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Bio</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="profileImageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profile Image</FormLabel>
                  <FormControl>
                    <ImageUploader
                      folder="agents"
                      maxFiles={1}
                      value={field.value ? [field.value] : []}
                      onChange={(urls) => field.onChange(urls[0] ?? '')}
                      onUploadingChange={setAvatarUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {mode === 'add' && (
              <p className="text-xs text-muted-foreground">
                This creates an agent profile only — it does not create login credentials or a user
                account.
              </p>
            )}

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || avatarUploading}>
                {avatarUploading
                  ? 'Uploading image…'
                  : mutation.isPending
                    ? 'Saving…'
                    : mode === 'add'
                      ? 'Create Agent'
                      : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
