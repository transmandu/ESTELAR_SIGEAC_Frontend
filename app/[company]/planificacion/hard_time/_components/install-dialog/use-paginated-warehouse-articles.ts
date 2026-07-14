'use client';

import { useCompanyStore } from '@/stores/CompanyStore';
import { dispatchOrderShowItemsDispatchPaginatedOptions } from '@api/queries';
import { keepPreviousData, useQuery } from '@tanstack/react-query';

interface UsePaginatedWarehouseArticlesParams {
  search?: string;
  batchId?: number | null;
  partNumber?: string | null;
  page?: number;
  perPage?: number;
}

export function usePaginatedWarehouseArticles({
  search,
  batchId,
  partNumber,
  page = 1,
  perPage = 25,
}: UsePaginatedWarehouseArticlesParams = {}) {
  const { selectedStation } = useCompanyStore();

  return useQuery({
    ...dispatchOrderShowItemsDispatchPaginatedOptions({
      query: {
        location: Number(selectedStation),
        category: 'COMPONENTE',
        search: search || undefined,
        batch_id: batchId ?? undefined,
        part_number: partNumber || undefined,
        page,
        per_page: perPage,
      },
    }),
    enabled: !!selectedStation,
    placeholderData: keepPreviousData,
  });
}
