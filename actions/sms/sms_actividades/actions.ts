import axiosInstance from "@/lib/axios";
import { useCompanyStore } from "@/stores/CompanyStore";
import { SmsActivityRequest } from "@/.gen/api/types.gen";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { format } from "date-fns";
import { toast } from "sonner";

// El formulario maneja fechas como Date; el backend espera strings yyyy-MM-dd
type ActivityFormDates = { start_date: Date; end_date: Date };
type SMSActivityData = Omit<SmsActivityRequest, 'start_date' | 'end_date'> & ActivityFormDates & { mitigation_measure_id?: number | null; category_ids?: number[] };

interface UpdateSMSActivityData {
  company: string | null;
  id: string;
  data: Omit<SMSActivityData, 'status'> & { status: string; mitigation_measure_id?: number | null; category_ids?: number[] };
}

interface NextActivityNumber {
  next_number: string;
}

export const useCreateSMSActivity = () => {
  const queryClient = useQueryClient();
  const createMutation = useMutation({
    mutationFn: async ({
      company,
      data,
    }: {
      company: string | null;
      data: SMSActivityData;
    }) => {
      const formData = new FormData();
      formData.append("activity_name", data.activity_name);
      if (data.title) formData.append("title", data.title);
      if (data.activity_number) formData.append("activity_number", data.activity_number);
      formData.append("start_date", format(new Date(data.start_date), "yyyy-MM-dd"));
      formData.append("end_date", format(new Date(data.end_date), "yyyy-MM-dd"));
      if (data.start_time) formData.append("start_time", data.start_time);
      if (data.end_time) formData.append("end_time", data.end_time);
      formData.append("place", data.place);
      formData.append("topics", data.topics);
      formData.append("objetive", data.objetive);
      formData.append("description", data.description);
      formData.append("authorized_by", data.authorized_by);
      formData.append("planned_by", data.planned_by);
      if (data.executed_by) formData.append("executed_by", data.executed_by);
      if (data.mitigation_measure_id != null)
        formData.append("mitigation_measure_id", data.mitigation_measure_id.toString());
      if (data.category_ids && data.category_ids.length > 0) {
        data.category_ids.forEach((catId) => formData.append("category_ids[]", catId.toString()));
      }
      if (data.image instanceof File) formData.append("image", data.image);
      if (data.document instanceof File) formData.append("document", data.document);

      const response = await axiosInstance.post(
        `/${company}/sms/activities`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-activities"] });
      toast.success("¡Creado!", {
        description: `La Actividad ha sido creado correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo crear la actividad...",
      });
      console.log(error);
    },
  });
  return {
    createSMSActivity: createMutation,
  };
};

export const useDeleteSMSActivity = () => {
  const queryClient = useQueryClient();

  const deleteMutation = useMutation({
    mutationFn: async ({
      company,
      id,
    }: {
      company: string | null;
      id: string;
    }) => {
      await axiosInstance.delete(`/${company}/sms/activities/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-activities"] }); // No se cual key va aca pero estoy seguro que no es esa
      toast.success("¡Eliminado!", {
        description: `¡La actividad ha sido eliminada correctamente!`,
      });
    },
    onError: (e) => {
      toast.error("Oops!", {
        description: "¡Hubo un error al eliminar la actividad!",
      });
    },
  });

  return {
    deleteSMSActivity: deleteMutation,
  };
};

export const useUpdateSMSActivity = () => {
  const queryClient = useQueryClient();

  const updateSMSActivityMutation = useMutation({
    mutationFn: async ({ company, id, data }: UpdateSMSActivityData) => {
      const formData = new FormData();
      // Spoofing PATCH via POST since multipart/form-data doesn't work with PATCH in some servers
      formData.append("_method", "PATCH");
      formData.append("activity_name", data.activity_name);
      if (data.title) formData.append("title", data.title);
      if (data.activity_number) formData.append("activity_number", data.activity_number);
      formData.append("start_date", format(new Date(data.start_date), "yyyy-MM-dd"));
      formData.append("end_date", format(new Date(data.end_date), "yyyy-MM-dd"));
      if (data.start_time) formData.append("start_time", data.start_time);
      if (data.end_time) formData.append("end_time", data.end_time);
      formData.append("place", data.place);
      formData.append("topics", data.topics);
      formData.append("objetive", data.objetive);
      formData.append("description", data.description);
      formData.append("authorized_by", data.authorized_by);
      formData.append("planned_by", data.planned_by);
      formData.append("status", data.status);
      if (data.executed_by) formData.append("executed_by", data.executed_by);
      if (data.mitigation_measure_id != null)
        formData.append("mitigation_measure_id", data.mitigation_measure_id.toString());
      if (data.category_ids && data.category_ids.length > 0) {
        data.category_ids.forEach((id) => formData.append("category_ids[]", id.toString()));
      }
      if (data.image instanceof File) formData.append("image", data.image);
      if (data.document instanceof File) formData.append("document", data.document);

      const response = await axiosInstance.post(
        `/${company}/sms/activities/${id}`,
        formData,
        {
          headers: { "Content-Type": "multipart/form-data" },
        },
      );
      return response.data;
    },
    onSuccess: (_, data) => {
      queryClient.invalidateQueries({ queryKey: ["sms-activities"] });
      queryClient.invalidateQueries({ queryKey: ["sms-activity", data.id] });
      toast.success("¡Actualizado!", {
        description: `La actividad ha sido actualizada correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo actualizar la actividad...",
      });
      console.log(error);
    },
  });
  return {
    updateSMSActivity: updateSMSActivityMutation,
  };
};

export const useUpdateCalendarSMSActivity = () => {
  const queryClient = useQueryClient();

  const updateSMSActivityMutation = useMutation({
    mutationFn: async ({
      company,
      id,
      data,
    }: {
      company: string;
      id: string;
      data: any;
    }) => {
      if (data.status === "CERRADO") {
        throw new Error(
          "No se puede actualizar la actividad de un curso con estatus CERRADO.",
        );
      }
      const response = await axiosInstance.patch(
        `/${company}/sms/activities/update-calendar/${id}`,
        data,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-calendar-activities"] });
      toast.success("¡Actualizado!", {
        description: `La actividad ha sido actualizada correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo actualizar la actividad...",
      });
      console.log(error);
    },
  });
  return {
    updateCalendarSMSActivity: updateSMSActivityMutation,
  };
};

export const useCloseSMSActivity = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompanyStore();
  const closeSMSActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await axiosInstance.patch(
        `/${selectedCompany?.slug}/sms/activities/close/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-activities"] });
      toast.success("Cerrado", {
        description: `La actividad se ha cerrado.`,
      });
    },
    onError: (error) => {
      const message = isAxiosError(error)
        ? error.response?.data?.message ?? "No se pudo cerrar la actividad."
        : "No se pudo cerrar la actividad.";
      toast.error("Error", { description: message });
    },
  });
  return {
    closeSMSActivity: closeSMSActivityMutation,
  };
};

export const useOpenSMSActivity = () => {
  const queryClient = useQueryClient();
  const { selectedCompany } = useCompanyStore();

  const openSMSActivityMutation = useMutation({
    mutationFn: async (id: string) => {
      // Ajusta esta URL según tu API (ej. /open-sms-activity o similar)
      const response = await axiosInstance.patch(
        `/${selectedCompany?.slug}/sms/activities/open/${id}`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["sms-activities"] });
      toast.success("Reabierta", {
        description: `La actividad se ha vuelto a abrir correctamente.`,
      });
    },
    onError: (error) => {
      toast.error("Oops!", {
        description: "No se pudo reabrir la actividad...",
      });
      console.log(error);
    },
  });

  return {
    openSMSActivity: openSMSActivityMutation,
  };
};

export const useGetNextActivityNumber = (company: string | null) => {
  return useQuery<NextActivityNumber>({
    queryKey: ["next-activity-number", company],
    queryFn: async () => {
      const { data } = await axiosInstance.get(
        `/${company}/sms/activities/next-number`,
      );
      return data;
    },
    enabled: !!company,
    staleTime: 5000,
    retry: 1,
  });
};
