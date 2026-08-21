import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, Plus, Search } from 'lucide-react';
import { isAxiosError } from 'axios';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { DataTable } from '@/components/data-table';
import { queryKeys } from '@/lib/queryKeys';
import { HOUSE_TYPES, PROPERTY_TYPES, type Property, type PropertyFilters } from '@/types/property';
import { propertiesApi } from './api';
import { getPropertyColumns } from './columns';
import { PropertyFormDialog } from './PropertyFormDialog';
import { ViewPropertyDialog } from './ViewPropertyDialog';
import { ImageLightbox } from './ImageLightbox';
import { DeletePropertyAlert } from './DeletePropertyAlert';

const ALL_VALUE = 'all';

export function PropertiesPage() {
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState<PropertyFilters>({});

  // Debounce free-text search before it hits the real query key / backend
  // call — type/houseType selects apply immediately (discrete choices, no
  // need to debounce those).
  useEffect(() => {
    const handle = setTimeout(() => {
      setFilters((prev) => ({ ...prev, q: searchInput || undefined }));
    }, 300);
    return () => clearTimeout(handle);
  }, [searchInput]);

  const propertiesQuery = useQuery({
    queryKey: queryKeys.properties.list(filters),
    queryFn: () => propertiesApi.getAll(filters),
  });

  const [formState, setFormState] = useState<{ mode: 'add' | 'edit'; property?: Property } | null>(null);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

  const columns = getPropertyColumns({
    onView: setViewProperty,
    onEdit: (property) => setFormState({ mode: 'edit', property }),
    onDelete: setDeleteProperty,
  });

  const isForbidden = isAxiosError(propertiesQuery.error) && propertiesQuery.error.response?.status === 403;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-foreground">Properties</h1>
          <p className="text-sm text-muted-foreground">Manage all property listings.</p>
        </div>
        <Button onClick={() => setFormState({ mode: 'add' })}>
          <Plus className="mr-1.5 size-4" /> Add Property
        </Button>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search title, address, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="pl-8"
          />
        </div>
        <Select
          value={filters.type ?? ALL_VALUE}
          onValueChange={(v) => setFilters((prev) => ({ ...prev, type: v === ALL_VALUE ? undefined : (v as PropertyFilters['type']) }))}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All Types</SelectItem>
            {PROPERTY_TYPES.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={filters.houseType ?? ALL_VALUE}
          onValueChange={(v) =>
            setFilters((prev) => ({ ...prev, houseType: v === ALL_VALUE ? undefined : (v as PropertyFilters['houseType']) }))
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue placeholder="House Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_VALUE}>All House Types</SelectItem>
            {HOUSE_TYPES.map((houseType) => (
              <SelectItem key={houseType} value={houseType}>
                {houseType}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {propertiesQuery.isLoading && (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      )}

      {propertiesQuery.isError && (
        <Alert variant="destructive">
          <AlertCircle className="size-4" />
          <AlertTitle>{isForbidden ? 'Permission denied' : 'Failed to load properties'}</AlertTitle>
          <AlertDescription>
            {isForbidden
              ? "Your account doesn't have permission to view this. Log in as an admin and try again."
              : 'Something went wrong reaching the server.'}
            <Button variant="link" className="h-auto p-0 pl-2" onClick={() => propertiesQuery.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {propertiesQuery.isSuccess && (
        <DataTable
          columns={columns}
          data={propertiesQuery.data}
          emptyMessage={
            filters.q || filters.type || filters.houseType
              ? 'No properties match these filters.'
              : 'No properties yet — add the first one.'
          }
        />
      )}

      <PropertyFormDialog
        open={Boolean(formState)}
        onOpenChange={(open) => !open && setFormState(null)}
        mode={formState?.mode ?? 'add'}
        property={formState?.property}
      />

      <ViewPropertyDialog
        open={Boolean(viewProperty)}
        onOpenChange={(open) => !open && setViewProperty(null)}
        property={viewProperty}
        onImageClick={setLightboxSrc}
      />

      <ImageLightbox src={lightboxSrc} onOpenChange={(open) => !open && setLightboxSrc(null)} />

      <DeletePropertyAlert property={deleteProperty} onOpenChange={(open) => !open && setDeleteProperty(null)} />
    </div>
  );
}
