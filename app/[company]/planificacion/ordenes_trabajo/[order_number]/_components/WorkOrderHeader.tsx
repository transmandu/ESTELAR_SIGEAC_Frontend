'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useWorkOrderDocuments, type DocumentType } from '@/hooks/planificacion/useWorkOrderDocuments';
import { cn } from '@/lib/utils';
import { useCompanySlug } from '@/stores/CompanyStore';
import { planificationWorkOrderDocumentDownload } from '@api/index';
import { WorkOrderResource } from '@api/types';
import { ArrowLeft, CheckCircle2, ClipboardList } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';
import { ConformityDocumentCard } from './ConformityDocumentCard';
import { getStatusConfig } from './constants';
import { DocumentPill, type DocumentPillState } from './DocumentPill';
import { timestampEqualSecondsPrecision } from './WorkOrderHelpers';

interface WorkOrderHeaderProps {
  order_number: string;
  wo: WorkOrderResource;
  onCompleteWorkOrder: () => void;
}

const DOC_LABELS: Record<DocumentType, { label: string; fileName: string }> = {
  work_order: { label: 'Orden de Trabajo', fileName: 'orden-trabajo' },
  tally_sheet: { label: 'Tally Sheet', fileName: 'tally-sheet' },
};

export function WorkOrderHeader({ order_number, wo, onCompleteWorkOrder }: WorkOrderHeaderProps) {
  const companySlug = useCompanySlug();
  const [downloadingType, setDownloadingType] = useState<DocumentType | null>(null);

  const { workOrder, tallySheet, queueDocument, mutations } = useWorkOrderDocuments(order_number);

  const statusRaw = wo?.status?.toUpperCase() ?? '';
  const statusCfg = getStatusConfig(statusRaw);

  const downloadPdf = async (type: DocumentType) => {
    setDownloadingType(type);
    try {
      const response = await planificationWorkOrderDocumentDownload({
        path: { order_number, document_type: type },
        throwOnError: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${DOC_LABELS[type].fileName}-${order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado exitosamente.');
    } catch {
      toast.error('Error al descargar el PDF.');
    } finally {
      setDownloadingType(null);
    }
  };

  const documentPills = ([
    { type: 'work_order' as const, doc: workOrder, isQueueing: mutations.workOrderQueue.status === 'pending' },
    { type: 'tally_sheet' as const, doc: tallySheet, isQueueing: mutations.tallySheetQueue.status === 'pending' },
  ] as const).map(({ type, doc, isQueueing }) => {
    const isFinal = Boolean(doc.statusData?.is_final);
    const stale =
      !isFinal &&
      Boolean(
        doc.statusData?.work_order_updated_at &&
          wo.updated_at &&
          !timestampEqualSecondsPrecision(doc.statusData.work_order_updated_at, wo?.updated_at),
      );

    const state: DocumentPillState =
      doc.isGenerating || isQueueing
        ? 'generating'
        : doc.isFailed
          ? 'failed'
          : doc.isCompleted
            ? stale
              ? 'stale'
              : 'ready'
            : 'missing';

    const actions = [];
    if (doc.isCompleted) {
      actions.push({
        label: 'Descargar',
        onClick: () => downloadPdf(type),
        disabled: downloadingType === type,
      });
    }
    if (!isFinal && !doc.isGenerating && (doc.isNotGenerated || doc.isFailed || stale)) {
      actions.push({
        label: doc.isFailed ? 'Reintentar' : stale ? 'Regenerar' : 'Generar',
        onClick: () => queueDocument(type),
        disabled: isQueueing,
      });
    }

    const title = isFinal
      ? 'Documento final generado al cierre (inalterable)'
      : doc.isGenerating
        ? 'Generando documento PDF...'
        : stale
          ? 'Documento PDF desactualizado respecto a la orden'
          : doc.isFailed
            ? 'Error al generar el documento PDF'
            : doc.isCompleted
              ? 'Documento PDF listo para descargar'
              : 'Documento aún no generado';

    return <DocumentPill key={type} label={DOC_LABELS[type].label} state={state} title={title} actions={actions} />;
  });

  return (
    <>
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Link href={`/${companySlug}/planificacion/ordenes_trabajo`}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ArrowLeft className="size-4" />
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg border bg-muted/30">
              <ClipboardList className="size-4 text-muted-foreground" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-mono text-lg font-semibold tracking-wide">{wo.order_number}</h1>
                <Badge variant="outline" className={cn('text-[11px]', statusCfg.className)}>
                  {statusCfg.label}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {wo.tally_number ? `Tally: ${wo.tally_number}` : 'Orden de Trabajo'}
              </p>
            </div>
          </div>
        </div>
        <Button
          variant="default"
          size="sm"
          className="h-8 gap-1.5 text-xs"
          onClick={onCompleteWorkOrder}
          disabled={statusRaw === 'CERRADO'}
        >
          <CheckCircle2 className="size-3.5" />
          {statusRaw === 'CERRADO' ? 'Orden completada' : 'Completar orden'}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {documentPills}
        <ConformityDocumentCard order_number={order_number} wo={wo} />
      </div>
    </>
  );
}
