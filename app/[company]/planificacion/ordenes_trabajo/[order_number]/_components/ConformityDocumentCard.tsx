'use client';

import { planificationWorkOrderConformityDownload } from '@api/index';
import { planificationWorkOrderConformityUploadMutation, workOrdersShowQueryKey } from '@api/queries';
import { WorkOrderResource } from '@api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { DocumentPill } from './DocumentPill';

interface ConformityDocumentCardProps {
  order_number: string;
  wo: WorkOrderResource;
}

export function ConformityDocumentCard({ order_number, wo }: ConformityDocumentCardProps) {
  const queryClient = useQueryClient();
  const [isDownloading, setIsDownloading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isClosed = wo.status?.toUpperCase() === 'CERRADO';
  const hasDocument = wo.has_conformity_document;

  const uploadMutation = useMutation({
    ...planificationWorkOrderConformityUploadMutation(),
    async onSuccess() {
      await queryClient.invalidateQueries({ queryKey: workOrdersShowQueryKey({ path: { orderNumber: order_number } }) });
      toast.success('Documento de conformidad cargado correctamente.');
    },
    onError(error) {
      toast.error(error.response?.data?.message || 'No se pudo subir el documento de conformidad.');
    },
  });

  if (!isClosed && !hasDocument) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Solo se permiten archivos PDF.');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('El archivo no debe superar los 10 MB.');
      return;
    }

    uploadMutation.mutate({
      path: { order_number },
      body: { conformity_file: file },
    });

    if (inputRef.current) inputRef.current.value = '';
  };

  const downloadPdf = async () => {
    setIsDownloading(true);
    try {
      const response = await planificationWorkOrderConformityDownload({
        path: { order_number },
        throwOnError: true,
      });

      const url = window.URL.createObjectURL(new Blob([response.data as BlobPart]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `conformity-${order_number}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('PDF descargado exitosamente.');
    } catch {
      toast.error('Error al descargar el documento de conformidad.');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <>
      <DocumentPill
        label="Conformidad (CSM)"
        state={hasDocument ? 'ready' : uploadMutation.isPending ? 'generating' : 'stale'}
        title={
          hasDocument
            ? 'Documento de conformidad disponible'
            : 'La orden está cerrada pero no tiene documento de conformidad'
        }
        actions={
          hasDocument
            ? [{ label: 'Descargar', onClick: downloadPdf, disabled: isDownloading }]
            : [{ label: 'Subir', onClick: () => inputRef.current?.click(), disabled: uploadMutation.isPending }]
        }
      />
      {!hasDocument && (
        <input ref={inputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
      )}
    </>
  );
}
