import axiosInstance from "@/lib/axios";
import { ObligatoryReportRequest, UpdateObligatoryReportRequest } from "@/.gen/api/types.gen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

interface CreateObligatoryReportPayload {
  company: string;
  data: ObligatoryReportRequest & {
    flight_number?: string | null;
    airline_company_involved?: string | null;
    flight_phases?: string[] | null;
  };
}

interface UpdateObligatoryReportPayload {
  company: string | null;
  id: string;
  data: UpdateObligatoryReportRequest & {
    status?: string;
    danger_identification_id?: string | number | null;
    flight_number?: string | null;
    airline_company_involved?: string | null;
    flight_phases?: string[] | null;
  };
}

interface NextNumberResponse {
  next_number: string;
}

export const useCreateObligatoryReport = () => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async ({ company, data }: CreateObligatoryReportPayload) => {
      const response = await axiosInstance.post(
        `/${company}/sms/obligatory-reports`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obligatory-reports"] });
      toast.success("¡Creado!", {
        description: `El reporte obligatorio ha sido creado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo crear el reporte obligatorio...",
      });
      console.log(error);
    },
  });
  return {
    createObligatoryReport: createMutation,
  };
};

export const useDeleteObligatoryReport = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationKey: ["obligatory-reports"],
    mutationFn: async ({
      company,
      id,
    }: {
      company: string | null;
      id: string;
    }) => {
      await axiosInstance.delete(`/${company}/sms/obligatory-reports/${id}`);
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({
        queryKey: ["danger-identifications", data.company],
      });
      queryClient.invalidateQueries({ queryKey: ["obligatory-reports"] });
      toast.success("¡Eliminado!", {
        description: `¡El reporte ha sido eliminado correctamente!`,
      });
    },
    onError: () => {
      toast.error("Oops!", {
        description: "¡Hubo un error al eliminar el reporte!",
      });
    },
  });

  return {
    deleteObligatoryReport: deleteMutation,
  };
};

export const useUpdateObligatoryReport = () => {
  const queryClient = useQueryClient();

  const updateObligatoryReportMutation = useMutation({
    mutationKey: ["obligatory-reports"],
    mutationFn: async ({ company, id, data }: UpdateObligatoryReportPayload) => {
      await axiosInstance.post(
        `/${company}/sms/obligatory-reports/update/${id}`,
        data,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obligatory-reports"] });
      queryClient.invalidateQueries({ queryKey: ["obligatory-report"] });
      toast.success("¡Actualizado!", {
        description: `El reporte obligatorio ha sido actualizado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo actualizar el reporte obligatorio...",
      });
      console.log(error);
    },
  });
  return {
    updateObligatoryReport: updateObligatoryReportMutation,
  };
};

export const useAcceptObligatoryReport = () => {
  const queryClient = useQueryClient();

  const acceptObligatoryReportMutation = useMutation({
    mutationKey: ["obligatory-reports"],
    mutationFn: async ({ company, id, data }: UpdateObligatoryReportPayload) => {
      await axiosInstance.patch(
        `/${company}/sms/obligatory-reports/accept/${id}`,
        data,
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["obligatory-reports"] });
      toast.success("¡Actualizado!", {
        description: `El reporte obligatorio ha sido aceptado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo aceptar el reporte obligatorio...",
      });
      console.log(error);
    },
  });
  return {
    acceptObligatoryReport: acceptObligatoryReportMutation,
  };
};

export const useGetNextReportNumber = (company: string | null) => {
  return useQuery<NextNumberResponse>({
    queryKey: ["next-obligatory-report-number", company],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/${company}/sms/obligatory-reports/next-number`,
      );
      return data;
    },
    enabled: !!company,
    staleTime: 5000,
    retry: 1,
  });
};
