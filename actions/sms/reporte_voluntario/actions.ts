import { VoluntaryReportStoreResponse } from '@/.gen/api/types.gen';
import axiosInstance from '@/lib/axios';
import { isAxiosError } from 'axios';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

const extractErrorMessage = (error: unknown, fallback: string): string => {
  if (!isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (data?.errors) {
    const messages = Object.values(data.errors as Record<string, string[]>).flat();
    if (messages.length) return messages.join(' ');
  }
  return data?.message ?? fallback;
};

interface VoluntaryReportData {
  company: string | null;
  reportData: {
    report_number?: string | null;
    source_reference?: string | null;
    identification_date: string;
    report_date: string;
    sms_station_id?: number;
    sms_finding_location_id?: number;
    finding_location_other: string;
    danger_type: string;
    is_anonymous: boolean | 0 | 1;
    description: string;
    possible_consequences: string[];
    recommendations: string;
    status: 'ABIERTO' | 'PROCESO' | 'CERRADO';
    reporter_name?: string | null;
    reporter_last_name?: string | null;
    reporter_phone?: string | null;
    reporter_email?: string | null;
    sms_area_id?: number;
    image?: File | string | null;
    document?: File | string | null;
  };
}
interface UpdateVoluntaryReportData {
  company: string | null;
  id: string;
  data: {
    report_number?: string;
    report_date: Date | string;
    identification_date: Date | string;
    sms_station_id?: number;
    sms_finding_location_id?: number;
    finding_location_other: string;
    danger_type: string;
    description: string;
    possible_consequences: string[];
    recommendations: string;
    danger_identification_id: number | null;
    status: string;
    reporter_name?: string;
    reporter_last_name?: string;
    reporter_phone?: string;
    reporter_email?: string;
    referred_to_name?: string;
    referred_to_position?: string;
    image?: File | string;
    document?: File | string;
  };
}
interface NextNumberResponse {
  next_number: string;
}

export const useCreateVoluntaryReport = () => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationKey: ['voluntary-reports'],
    mutationFn: async ({ company, reportData }: VoluntaryReportData) => {
      const response = await axiosInstance.post<VoluntaryReportStoreResponse>(
        `/${company}/sms/voluntary-reports`,
        reportData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voluntary-reports'] });
      toast.success('¡Creado!', {
        description: `El reporte voluntario ha sido creado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error('Error', { description: extractErrorMessage(error, 'No se pudo crear el reporte.') });
    },
  });
  return {
    createVoluntaryReport: createMutation,
  };
};

export const useDeleteVoluntaryReport = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationKey: ['voluntary-reports'],
    mutationFn: async ({ company, id }: { company: string | null; id: string | number }) => {
      await axiosInstance.delete(`/${company}/sms/voluntary-reports/${id}`);
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: ['danger-identifications', data.company],
      });
      queryClient.invalidateQueries({ queryKey: ['voluntary-reports'] });
      queryClient.invalidateQueries({ queryKey: ['analysis'] });
      toast.success('¡Eliminado!', {
        description: `¡El reporte ha sido eliminada correctamente!`,
      });
    },
    onError: (error) => {
      toast.error('Error', { description: extractErrorMessage(error, 'No se pudo eliminar el reporte.') });
    },
  });

  return {
    deleteVoluntaryReport: deleteMutation,
  };
};

export const useUpdateVoluntaryReport = () => {
  const queryClient = useQueryClient();

  const updateVoluntaryReportMutation = useMutation({
    mutationKey: ['voluntary-reports'],
    mutationFn: async ({ company, id, data }: UpdateVoluntaryReportData) => {
      const response = await axiosInstance.post(`/${company}/sms/voluntary-reports/update/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voluntary-reports'] });
      queryClient.invalidateQueries({ queryKey: ['voluntary-report'] });
      toast.success('¡Actualizado!', {
        description: `El reporte voluntario ha sido actualizado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error('Error', { description: extractErrorMessage(error, 'No se pudo actualizar el reporte voluntario.') });
    },
  });
  return {
    updateVoluntaryReport: updateVoluntaryReportMutation,
  };
};

export const useAcceptVoluntaryReport = () => {
  const queryClient = useQueryClient();

  const acceptVoluntaryReportMutation = useMutation({
    mutationFn: async ({ company, id, data }: UpdateVoluntaryReportData) => {
      const response = await axiosInstance.patch(`/${company}/sms/voluntary-reports/accept/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['voluntary-reports'] });
      queryClient.invalidateQueries({ queryKey: ['voluntary-report'] });
      toast.success('Aceptado!', {
        description: `El reporte voluntario ha sido aceptado.`,
      });
    },
    onError: (error) => {
      toast.error('Error', { description: extractErrorMessage(error, 'No se pudo aceptar el reporte voluntario.') });
    },
  });
  return {
    acceptVoluntaryReport: acceptVoluntaryReportMutation,
  };
};

export const useGetNextReportNumber = (company: string | null) => {
  return useQuery<NextNumberResponse>({
    queryKey: ['next-voluntary-report-number', company],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/${company}/sms/voluntary-reports/next-number`);
      return data;
    },
    enabled: !!company,
    staleTime: 5000,
    retry: 1,
  });
};
