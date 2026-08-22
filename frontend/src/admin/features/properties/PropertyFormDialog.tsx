import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { propertiesApi } from './api';
import { agentsApi } from '@/features/agents/api';
import { queryKeys } from '@/lib/queryKeys';
import {
  FACILITY_OPTIONS,
  HOUSE_TYPES,
  PROPERTY_STATUSES,
  PROPERTY_TYPES,
  type Property,
  type PropertyFormValues,
} from '@/types/property';

// Plain (non-coerced) number types throughout — the <Input> onChange
// handlers below convert string -> number|null explicitly. This keeps
// zod's input/output types identical, avoiding react-hook-form's
// three-generic dance that z.coerce()/z.preprocess() would otherwise force.
const formSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string(),
  address: z.string().min(1, 'Address is required'),
  price: z.number().positive('Price must be greater than 0'),
  type: z.enum(PROPERTY_TYPES),
  houseType: z.enum([...HOUSE_TYPES, ''] as const),
  status: z.enum(PROPERTY_STATUSES),
  imageUrl: z.string(),
  bedrooms: z.number().int().nonnegative().nullable(),
  bathrooms: z.number().int().nonnegative().nullable(),
  areaSqFt: z.number().nonnegative().nullable(),
  assignedAgentId: z.number().nullable(),
  facilities: z.array(z.string()),
  imageUrls: z.array(z.string()),
  houseRules: z.string(),
});

type FormSchema = z.infer<typeof formSchema>;

const EMPTY_VALUES: FormSchema = {
  title: '',
  description: '',
  address: '',
  price: 0,
  type: 'SALE',
  houseType: '',
  status: 'AVAILABLE',
  imageUrl: '',
  bedrooms: null,
  bathrooms: null,
  areaSqFt: null,
  assignedAgentId: null,
  facilities: [],
  imageUrls: [],
  houseRules: '',
};

function propertyToFormValues(property: Property): FormSchema {
  return {
    title: property.title ?? '',
    description: property.description ?? '',
    address: property.address ?? '',
    price: property.price,
    type: property.type,
    houseType: property.houseType ?? '',
    status: property.status,
    imageUrl: property.imageUrl ?? '',
    bedrooms: property.bedrooms,
    bathrooms: property.bathrooms,
    areaSqFt: property.areaSqFt,
    assignedAgentId: property.assignedAgent?.id ?? null,
    facilities: property.facilities ?? [],
    imageUrls: property.imageUrls ?? [],
    houseRules: property.houseRules ?? '',
  };
}

interface PropertyFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'add' | 'edit';
  property?: Property;
}

export function PropertyFormDialog({ open, onOpenChange, mode, property }: PropertyFormDialogProps) {
  const queryClient = useQueryClient();

  const form = useForm<FormSchema>({
    resolver: zodResolver(formSchema),
    defaultValues: EMPTY_VALUES,
  });

  // Tracked per-uploader so the form can block submission while any image
  // is still in flight — saving mid-upload would persist a property whose
  // gallery is missing the files the admin just picked.
  const [mainUploading, setMainUploading] = useState(false);
  const [galleryUploading, setGalleryUploading] = useState(false);
  const isUploading = mainUploading || galleryUploading;

  useEffect(() => {
    if (!open) return;
    form.reset(mode === 'edit' && property ? propertyToFormValues(property) : EMPTY_VALUES);
    // Stale flags from a previous open would otherwise keep Save disabled.
    setMainUploading(false);
    setGalleryUploading(false);
  }, [open, mode, property, form]);

  const agentsQuery = useQuery({
    queryKey: queryKeys.agents.publicList(),
    queryFn: agentsApi.getPublic,
    enabled: open,
  });

  const mutation = useMutation({
    mutationFn: async (values: FormSchema) => {
      // FormSchema is now structurally identical to PropertyFormValues —
      // the uploader yields string[] directly, so the old comma-splitting
      // adapter is gone. imageUrl/imageUrls reach the API unchanged.
      const payload: PropertyFormValues = values;
      return mode === 'add'
        ? propertiesApi.create(payload)
        : propertiesApi.update(property!.id, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.properties.all() });
      toast.success(mode === 'add' ? 'Property created' : 'Property updated');
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error(mode === 'add' ? 'Failed to create property' : 'Failed to update property', {
        description: error instanceof Error ? error.message : undefined,
      });
    },
  });

  const onSubmit = form.handleSubmit((values) => {
    // Belt-and-braces: the Save button is already disabled while uploading,
    // but Enter-to-submit bypasses a disabled button in some browsers.
    if (isUploading) return;
    mutation.mutate(values);
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{mode === 'add' ? 'Add Property' : 'Edit Property'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={onSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Address</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        value={field.value}
                        onChange={(e) => field.onChange(e.target.value === '' ? 0 : Number(e.target.value))}
                      />
                    </FormControl>
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
                        {PROPERTY_STATUSES.map((status) => (
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

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {PROPERTY_TYPES.map((type) => (
                          <SelectItem key={type} value={type}>
                            {type}
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
                name="houseType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>House Type</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="None" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {HOUSE_TYPES.map((houseType) => (
                          <SelectItem key={houseType} value={houseType}>
                            {houseType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="bedrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bedrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="bathrooms"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Bathrooms</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="areaSqFt"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Area (sq ft)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value === "" ? null : Number(e.target.value))}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="assignedAgentId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assigned Agent</FormLabel>
                  <Select
                    onValueChange={(v) => field.onChange(v === 'unassigned' ? null : Number(v))}
                    value={field.value ? String(field.value) : 'unassigned'}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {agentsQuery.data?.map((agent) => (
                        <SelectItem key={agent.id} value={String(agent.id)}>
                          {agent.name}
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
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={3} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Main Image</FormLabel>
                  <FormControl>
                    {/* imageUrl is a single string but the uploader speaks
                        string[] — adapt at the boundary rather than making
                        the reusable component aware of this field. */}
                    <ImageUploader
                      folder="properties"
                      maxFiles={1}
                      value={field.value ? [field.value] : []}
                      onChange={(urls) => field.onChange(urls[0] ?? '')}
                      onUploadingChange={setMainUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="imageUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Additional Images</FormLabel>
                  <FormControl>
                    <ImageUploader
                      folder="properties"
                      value={field.value}
                      onChange={field.onChange}
                      onUploadingChange={setGalleryUploading}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="facilities"
              render={() => (
                <FormItem>
                  <FormLabel>Facilities</FormLabel>
                  <div className="grid grid-cols-2 gap-2">
                    {FACILITY_OPTIONS.map((facility) => (
                      <FormField
                        key={facility}
                        control={form.control}
                        name="facilities"
                        render={({ field }) => {
                          const checked = field.value.includes(facility);
                          return (
                            <FormItem className="flex items-center gap-2 space-y-0">
                              <FormControl>
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(isChecked) => {
                                    field.onChange(
                                      isChecked
                                        ? [...field.value, facility]
                                        : field.value.filter((f) => f !== facility),
                                    );
                                  }}
                                />
                              </FormControl>
                              <FormLabel className="font-normal">{facility}</FormLabel>
                            </FormItem>
                          );
                        }}
                      />
                    ))}
                  </div>
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="houseRules"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>House Rules</FormLabel>
                  <FormControl>
                    <Textarea rows={2} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={mutation.isPending || isUploading}>
                {isUploading
                  ? 'Uploading images…'
                  : mutation.isPending
                    ? 'Saving…'
                    : mode === 'add'
                      ? 'Create Property'
                      : 'Save Changes'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
