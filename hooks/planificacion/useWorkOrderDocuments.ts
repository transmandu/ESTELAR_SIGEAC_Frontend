import { useCompanySlug } from '@/stores/CompanyStore';
import { DocumentGenerationMetadataResource, planificationWorkOrderDocumentDownload } from '@api/index';
import {
  planificationWorkOrderDocumentQueuePdfMutation,
  planificationWorkOrderDocumentStatusOptions,
  planificationWorkOrderDocumentStatusQueryKey,
  planificationWorkOrderTallySheetQueuePdfMutation,
} from '@api/queries';
import { useEcho } from '@laravel/echo-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type DocumentType = 'work_order' | 'tally_sheet';

export type WorkOrderDocState = {
  statusData: DocumentGenerationMetadataResource | null;
  isGenerating: boolean;
  isCompleted: boolean;
  isFailed: boolean;
  isNotGenerated: boolean;
  statusError: string | null;
};

export function useWorkOrderDocuments(orderNumber: string) {
  const queryClient = useQueryClient();
  const companySlug = useCompanySlug();

  /* ── Echo: real-time document status updates ── */
  useEcho(
    `order-documents.${orderNumber}.${companySlug}`,
    'WorkOrderDocumentStatusChanged',
    (payload) => {
      if (!orderNumber) return;
      const docType = payload.document_type;
      queryClient.invalidateQueries({
        queryKey: planificationWorkOrderDocumentStatusQueryKey({
          path: { order_number: orderNumber, document_type: docType },
        }),
      });
    },
    [orderNumber, companySlug, queryClient],
    'private',
  );

  const workOrderStatusQuery = useQuery({
    ...planificationWorkOrderDocumentStatusOptions({
      path: { order_number: orderNumber ?? '', document_type: 'work_order' },
    }),
    enabled: Boolean(orderNumber),
    refetchOnWindowFocus: true,
  });

  const tallySheetStatusQuery = useQuery({
    ...planificationWorkOrderDocumentStatusOptions({
      path: { order_number: orderNumber ?? '', document_type: 'tally_sheet' },
    }),
    enabled: Boolean(orderNumber),
    refetchOnWindowFocus: true,
  });

  const workOrderStatusError = workOrderStatusQuery.error
    ? workOrderStatusQuery.error?.status === 404
      ? 'not_found'
      : 'error'
    : null;

  const tallySheetStatusError = tallySheetStatusQuery.error
    ? tallySheetStatusQuery.error?.status === 404
      ? 'not_found'
      : 'error'
    : null;

  const workOrderStatusData = workOrderStatusQuery.data?.data ?? null;
  const tallySheetStatusData = tallySheetStatusQuery.data?.data ?? null;

  const workOrderQueue = useMutation({
    ...planificationWorkOrderDocumentQueuePdfMutation(),
    onSuccess: () => {
      if (orderNumber) {
        queryClient.invalidateQueries({
          queryKey: planificationWorkOrderDocumentStatusQueryKey({
            path: { order_number: orderNumber, document_type: 'work_order' },
          }),
        });
      }
    },
  });

  const tallySheetQueue = useMutation({
    ...planificationWorkOrderTallySheetQueuePdfMutation(),
    onSuccess: () => {
      if (orderNumber) {
        queryClient.invalidateQueries({
          queryKey: planificationWorkOrderDocumentStatusQueryKey({
            path: { order_number: orderNumber, document_type: 'tally_sheet' },
          }),
        });
      }
    },
  });

  const queueDocument = (type: DocumentType) => {
    if (!orderNumber) return;
    if (type === 'work_order') {
      if (workOrderQueue.status === 'pending') return;
      workOrderQueue.mutate({ path: { order_number: orderNumber } });
      return;
    }
    if (tallySheetQueue.status === 'pending') return;
    tallySheetQueue.mutate({ path: { order_number: orderNumber } });
  };

  const downloadDocument = async (type: DocumentType) => {
    if (!orderNumber) return null;
    try {
      const res = await planificationWorkOrderDocumentDownload({
        path: { order_number: orderNumber, document_type: type },
        throwOnError: true,
      });
      return res.data;
    } catch (e) {
      throw e;
    }
  };

  const workOrder: WorkOrderDocState = {
    statusData: workOrderStatusData,
    isNotGenerated: workOrderStatusData?.status === 'not_generated',
    isGenerating: workOrderStatusData?.status === 'queued' || workOrderStatusData?.status === 'in_progress',
    isCompleted: workOrderStatusData?.status === 'completed',
    isFailed: workOrderStatusError !== null || workOrderStatusData?.status === 'failed',
    statusError: workOrderStatusError,
  };

  const tallySheet: WorkOrderDocState = {
    statusData: tallySheetStatusData,
    isNotGenerated: tallySheetStatusData?.status === 'not_generated',
    isGenerating: tallySheetStatusData?.status === 'queued' || tallySheetStatusData?.status === 'in_progress',
    isCompleted: tallySheetStatusData?.status === 'completed',
    isFailed: tallySheetStatusError !== null || tallySheetStatusData?.status === 'failed',
    statusError: tallySheetStatusError,
  };

  return {
    workOrder,
    tallySheet,
    queueDocument,
    downloadDocument,
    queries: { workOrderStatusQuery, tallySheetStatusQuery },
    mutations: { workOrderQueue, tallySheetQueue },
  } as const;
}
