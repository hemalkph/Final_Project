import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

interface ImageLightboxProps {
  src: string | null;
  onOpenChange: (open: boolean) => void;
}

export function ImageLightbox({ src, onOpenChange }: ImageLightboxProps) {
  return (
    <Dialog open={Boolean(src)} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
        <DialogTitle className="sr-only">Image preview</DialogTitle>
        {src && <img src={src} alt="" className="max-h-[85vh] w-full rounded-lg object-contain" />}
      </DialogContent>
    </Dialog>
  );
}
