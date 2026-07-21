import axiosInstance from "@/lib/axios";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

export interface ActivityCategory {
  id: number;
  name: string;
}

export const useGetActivityCategories = (company?: string | null) => {
  return useQuery<ActivityCategory[]>({
    queryKey: ["sms-activity-categories", company],
    queryFn: async () => {
      const { data } = await axiosInstance.get(`/${company}/sms/activity-categories`);
      return data;
    },
    staleTime: 1000 * 60 * 5,
    enabled: !!company,
  });
};

export const useCreateActivityCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ company, name }: { company: string; name: string }) => {
      const { data } = await axiosInstance.post(`/${company}/sms/activity-categories`, { name });
      return data;
    },
    onSuccess: (_, { company }) => {
      queryClient.invalidateQueries({ queryKey: ["sms-activity-categories", company] });
      toast.success("Categoría creada correctamente.");
    },
    onError: () => {
      toast.error("No se pudo crear la categoría.");
    },
  });
};

export const useUpdateActivityCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ company, id, name }: { company: string; id: number; name: string }) => {
      const { data } = await axiosInstance.patch(`/${company}/sms/activity-categories/${id}`, { name });
      return data;
    },
    onSuccess: (_, { company }) => {
      queryClient.invalidateQueries({ queryKey: ["sms-activity-categories", company] });
      toast.success("Categoría actualizada correctamente.");
    },
    onError: () => {
      toast.error("No se pudo actualizar la categoría.");
    },
  });
};

export const useDeleteActivityCategory = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ company, id }: { company: string; id: number }) => {
      await axiosInstance.delete(`/${company}/sms/activity-categories/${id}`);
    },
    onSuccess: (_, { company }) => {
      queryClient.invalidateQueries({ queryKey: ["sms-activity-categories", company] });
      toast.success("Categoría eliminada correctamente.");
    },
    onError: () => {
      toast.error("No se pudo eliminar la categoría.");
    },
  });
};
