import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { Property } from '@/types/property';

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function formatPrice(price: number): string {
  return new Intl.NumberFormat('en-LK', { style: 'currency', currency: 'LKR', maximumFractionDigits: 0 }).format(
    price,
  );
}

interface ViewPropertyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  property: Property | null;
  onImageClick: (src: string) => void;
}

export function ViewPropertyDialog({ open, onOpenChange, property, onImageClick }: ViewPropertyDialogProps) {
  if (!property) return null;

  const images = [property.imageUrl, ...property.imageUrls].filter((src): src is string => Boolean(src));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{property.title || 'Untitled property'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {images.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {images.map((src, i) => (
                <button
                  key={src + i}
                  type="button"
                  onClick={() => onImageClick(src)}
                  className="aspect-square overflow-hidden rounded-md border border-border"
                >
                  <img src={src} alt="" className="size-full object-cover" />
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Badge variant="secondary">{property.type}</Badge>
            {property.houseType && <Badge variant="secondary">{property.houseType}</Badge>}
            <Badge>{property.status}</Badge>
          </div>

          <p className="text-lg font-semibold">{formatPrice(property.price)}</p>
          <p className="text-sm text-muted-foreground">{property.address}</p>

          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Bedrooms</span>
              <p>{property.bedrooms ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Bathrooms</span>
              <p>{property.bathrooms ?? '—'}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Area</span>
              <p>{property.areaSqFt ? `${property.areaSqFt} sq ft` : '—'}</p>
            </div>
          </div>

          {property.description && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Description</h4>
              <p className="text-sm text-muted-foreground">{property.description}</p>
            </div>
          )}

          {property.facilities.length > 0 && (
            <div>
              <h4 className="mb-1 text-sm font-medium">Facilities</h4>
              <div className="flex flex-wrap gap-1.5">
                {property.facilities.map((facility) => (
                  <Badge key={facility} variant="outline">
                    {facility}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {property.houseRules && (
            <div>
              <h4 className="mb-1 text-sm font-medium">House Rules</h4>
              <p className="text-sm text-muted-foreground">{property.houseRules}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4 text-sm">
            <div>
              <span className="text-muted-foreground">Owner</span>
              <p>{property.ownerName || '—'}</p>
              <p className="text-muted-foreground">{property.ownerEmail || property.ownerPhone || ''}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Assigned Agent</span>
              <p>{property.assignedAgent?.name ?? 'Unassigned'}</p>
            </div>
          </div>

          {property.driveLink && (
            <a
              href={property.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-primary hover:underline"
            >
              Open submitted drive resource
            </a>
          )}

          <p className="text-xs text-muted-foreground">Submitted {formatDate(property.createdAt)}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
