'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { HardTimeInstallationRequestResource } from '@api/types';
import { format, parseISO } from 'date-fns';
import { Ban, ClockArrowUp, PackagePlus, UserRound } from 'lucide-react';

interface PendingInstallationRequestProps {
  request: HardTimeInstallationRequestResource;
  position?: string;
  componentName?: string;
  onCancel?: () => void;
  isCancelling?: boolean;
}

export function PendingInstallationRequest({ request, position, componentName, onCancel, isCancelling }: PendingInstallationRequestProps) {
  return (
    <div className="space-y-2 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2.5">
      <div className="flex items-center gap-2">
        <ClockArrowUp className="h-3.5 w-3.5 shrink-0 text-amber-600 dark:text-amber-400" />
        <p className="text-[11px] font-medium text-amber-700 dark:text-amber-300">Solicitud de montaje pendiente</p>
        <Badge
          variant="outline"
          className="ml-auto h-5 border-amber-500/20 bg-amber-500/10 px-1.5 text-[10px] capitalize text-amber-600 dark:text-amber-400"
        >
          {request.status}
        </Badge>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pl-[22px] text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <PackagePlus className="h-3 w-3" />
          Art. #{request.article_id}
        </span>
        <span className="flex items-center gap-1">
          <UserRound className="h-3 w-3" />
          Solicitante #{request.requested_by}
        </span>
        <span className="flex items-center gap-1">
          <ClockArrowUp className="h-3 w-3" />
          {format(parseISO(request.installed_at), 'dd/MM/yyyy HH:mm')}
        </span>
      </div>
      {onCancel && (
        <div className="flex justify-end border-t border-amber-500/10 pt-2">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="h-7 gap-1 border-red-500/30 px-2.5 text-[11px] text-red-600 hover:bg-red-500/10 dark:text-red-400"
                disabled={isCancelling}
                onClick={(e) => e.stopPropagation()}
              >
                <Ban className="h-3 w-3" />
                {isCancelling ? 'Cancelando...' : 'Cancelar solicitud'}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent onClick={(e) => e.stopPropagation()}>
              <AlertDialogHeader>
                <AlertDialogTitle>Cancelar solicitud</AlertDialogTitle>
                <AlertDialogDescription>
                  Se cancelará la solicitud de montaje{componentName ? <>, <span className="font-medium text-foreground">{componentName}</span></> : null} en la posición{' '}
                  <span className="font-mono font-medium text-foreground">{position || 'esta posición'}</span>.
                  Esta acción no se puede deshacer.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={(e) => e.stopPropagation()}>Volver</AlertDialogCancel>
                <AlertDialogAction
                  onClick={(e) => {
                    e.stopPropagation();
                    onCancel();
                  }}
                  className="bg-red-600 hover:bg-red-700"
                >
                  Sí, cancelar solicitud
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  );
}
