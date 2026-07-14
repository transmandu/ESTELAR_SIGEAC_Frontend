'use client';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { AircraftResource } from '@api/types';
import { Boxes, PenLine, Plug2 } from 'lucide-react';
import { Tabs as TabsPrimitive } from 'radix-ui';
import { useState } from 'react';
import { ManualInstallForm } from './manual-install-form';
import { WarehouseInstallForm } from './warehouse-install-form';

type InstallMode = 'manual' | 'warehouse';

interface InstallDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  componentId: number | null;
  aircraft: AircraftResource | null;
  defaultPartNumber?: string;
  slotBatchId?: number | null;
  slotLabel?: string;
  componentLabel?: string;
}

export function InstallDialog(props: InstallDialogProps) {
  const { open, onOpenChange } = props;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-6xl overflow-hidden p-0">
        <div className="flex max-h-[92vh] flex-col">
          <Content {...props} />
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Content(props: InstallDialogProps) {
  const { componentId, aircraft, defaultPartNumber, slotBatchId, slotLabel, componentLabel, onOpenChange } = props;
  const [mode, setMode] = useState<InstallMode>('manual');

  const formProps = {
    componentId,
    aircraft,
    defaultPartNumber,
    slotLabel,
    componentLabel,
    onSuccess: () => onOpenChange(false),
  };
  return (
    <>
      <DialogHeader className="space-y-0 px-6 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-muted/30">
            <Plug2 className="size-5 text-foreground" />
          </div>
          <div className="space-y-1">
            <DialogTitle className="text-base font-semibold">Montar componente</DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              {mode === 'manual'
                ? 'Ingresa manualmente serial, P/N y tiempos del componente instalado.'
                : 'Selecciona el artículo del inventario. Almacén deberá aprobar la solicitud para consumir inventario.'}
            </DialogDescription>
          </div>
        </div>
      </DialogHeader>
      <TabsPrimitive.Root
        value={mode}
        onValueChange={(v) => setMode(v as InstallMode)}
        className="flex min-h-0 flex-1 flex-col"
      >
        <div className="border-b border-border/60 px-6">
          <TabsPrimitive.List className="-mb-px flex gap-0">
            <TabsPrimitive.Trigger
              value="manual"
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 pb-2.5 pt-2 text-[11px] font-semibold uppercase tracking-widest transition-colors',
                mode === 'manual'
                  ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <PenLine className="size-3.5" />
              Manual
            </TabsPrimitive.Trigger>
            <TabsPrimitive.Trigger
              value="warehouse"
              className={cn(
                'flex items-center gap-1.5 border-b-2 px-4 pb-2.5 pt-2 text-[11px] font-semibold uppercase tracking-widest transition-colors',
                mode === 'warehouse'
                  ? 'border-sky-600 text-sky-700 dark:border-sky-400 dark:text-sky-300'
                  : 'border-transparent text-muted-foreground hover:text-foreground',
              )}
            >
              <Boxes className="size-3.5" />
              Almacén
            </TabsPrimitive.Trigger>
          </TabsPrimitive.List>
        </div>

        <TabsPrimitive.Content value="manual" className="empty:hidden contents outline-none focus-visible:outline-none">
          <ManualInstallForm {...formProps} />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content
          value="warehouse"
          className="empty:hidden contents outline-none focus-visible:outline-none"
        >
          <WarehouseInstallForm {...formProps} slotBatchId={slotBatchId} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </>
  );
}
