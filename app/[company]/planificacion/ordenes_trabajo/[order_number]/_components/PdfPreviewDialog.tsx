'use client';

import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Download, Loader2 } from 'lucide-react';

interface PdfPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string | null;
  isLoading?: boolean;
  onDownload?: () => void;
}

export function PdfPreviewDialog({ open, onOpenChange, title, url, isLoading, onDownload }: PdfPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[85vh] max-w-4xl flex-col gap-3">
        <DialogHeader className="flex-row items-center justify-between gap-4 space-y-0 pr-8">
          <DialogTitle className="truncate">{title}</DialogTitle>
          {onDownload && (
            <Button variant="outline" size="sm" className="h-7 gap-1.5 text-xs" onClick={onDownload} disabled={!url}>
              <Download className="size-3.5" />
              Descargar
            </Button>
          )}
        </DialogHeader>
        <div className="flex-1 overflow-hidden rounded-md border bg-muted/10">
          {isLoading || !url ? (
            <div className="flex h-full items-center justify-center">
              <Loader2 className="size-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <iframe src={url} className="h-full w-full" title={title} />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
