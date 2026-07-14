import {
  aircraftComponentSlotDestroyMutation,
  aircraftComponentSlotIndexQueryKey,
  aircraftComponentSlotShowQueryKey,
  aircraftComponentSlotStoreMutation,
  hardTimeInstallationInstallMutation,
  hardTimeInstallationRequestApproveMutation,
  hardTimeInstallationRequestIndexQueryKey,
  hardTimeInstallationRequestRejectMutation,
  hardTimeInstallationRequestStoreMutation,
  hardTimeIntervalStoreMutation,
  hardTimeIntervalToggleMutation,
} from '@api/queries';
import {
  hardTimeComplianceStore,
  hardTimeInstallationUninstall,
  hardTimeIntervalUpdate,
} from '@api/sdk.gen';
import {
  StoreComplianceRequest,
  UninstallComponentRequest,
  UpdateIntervalRequest,
} from '@api/types';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';

export const useInstallHardTimeComponent = (componentId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeInstallationInstallMutation({ path: { id: componentId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: componentId } }) });
      toast.success('Componente montado', { description: 'El componente fue instalado correctamente.' });
    },
    onError: () => toast.error('No se pudo montar el componente'),
  });
};

export const useUninstallHardTimeComponent = (componentId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UninstallComponentRequest) =>
      hardTimeInstallationUninstall({
        path: { id: componentId },
        body: data,
        throwOnError: true,
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: componentId } }) });
      toast.success('Componente desmontado', { description: 'El componente fue removido correctamente.' });
    },
    onError: () => toast.error('No se pudo desmontar el componente'),
  });
};

export const useRegisterHardTimeCompliance = (aircraftPartId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StoreComplianceRequest) =>
      hardTimeComplianceStore({
        path: { aircraftPartId },
        body: data,
        throwOnError: true,
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: aircraftPartId } }) });
      toast.success('Cumplimiento registrado');
    },
    onError: () => toast.error('No se pudo registrar el cumplimiento'),
  });
};

export const useCreateHardTimeInterval = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeIntervalStoreMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({}),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey(undefined as any) });
      toast.success('Intervalo creado');
    },
    onError: () => toast.error('No se pudo crear el intervalo'),
  });
};

export const useUpdateHardTimeInterval = (intervalId: number, componentId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UpdateIntervalRequest) =>
      hardTimeIntervalUpdate({
        path: { id: intervalId },
        body: data,
        throwOnError: true,
      }).then((res) => res.data),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: componentId } }) });
      toast.success('Intervalo actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el intervalo'),
  });
};

export const useToggleHardTimeInterval = (componentId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeIntervalToggleMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: componentId } }) });
      toast.success('Intervalo actualizado');
    },
    onError: () => toast.error('No se pudo actualizar el intervalo'),
  });
};

export const useCreateHardTimeComponent = (aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...aircraftComponentSlotStoreMutation(),

    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      toast.success('Componente controlado creado');
    },
    onError: () => toast.error('No se pudo crear el componente'),
  });
};

export const useDeleteHardTimeComponent = (aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...aircraftComponentSlotDestroyMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      toast.success('Componente eliminado');
    },
    onError: () => toast.error('No se pudo eliminar el componente'),
  });
};

// ── Install request hooks ────────────────────────────────────────────────────

export const useCreateInstallRequest = (slotId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeInstallationRequestStoreMutation({ path: { id: slotId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey({ path: { id: slotId } }) });
      queryClient.invalidateQueries({ queryKey: hardTimeInstallationRequestIndexQueryKey() });
      toast.success('Solicitud de instalación creada', {
        description: 'Almacén debe aprobar la solicitud para consumir inventario.',
      });
    },
    onError: (error: any) =>
      toast.error('No se pudo crear la solicitud', {
        description: error.response?.data?.message ?? 'Verifica que el artículo esté disponible.',
      }),
  });
};

export const useApproveInstallRequest = (requestId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeInstallationRequestApproveMutation({ path: { id: requestId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: hardTimeInstallationRequestIndexQueryKey() });
      toast.success('Instalación aprobada', { description: 'El componente fue instalado y el inventario consumido.' });
    },
    onError: (error: any) =>
      toast.error('No se pudo aprobar la solicitud', {
        description: error.response?.data?.message ?? 'El artículo puede no estar disponible.',
      }),
  });
};

export const useRejectInstallRequest = (requestId: number, aircraftId: number | null) => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeInstallationRequestRejectMutation({ path: { id: requestId } }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey({ query: { aircraft_id: aircraftId! } }),
      });
      queryClient.invalidateQueries({ queryKey: hardTimeInstallationRequestIndexQueryKey() });
      toast.success('Solicitud rechazada', { description: 'El slot fue liberado sin consumir inventario.' });
    },
    onError: (error: any) =>
      toast.error('No se pudo rechazar la solicitud', {
        description: error.response?.data?.message ?? 'Solo se pueden rechazar solicitudes pendientes.',
      }),
  });
};

export const useCancelInstallationRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    ...hardTimeInstallationRequestRejectMutation(),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: aircraftComponentSlotIndexQueryKey(),
      });
      queryClient.invalidateQueries({ queryKey: aircraftComponentSlotShowQueryKey(undefined as any) });
      queryClient.invalidateQueries({ queryKey: hardTimeInstallationRequestIndexQueryKey() });
      toast.success('Solicitud cancelada', { description: 'La solicitud de montaje fue cancelada.' });
    },
    onError: (error) =>
      toast.error('No se pudo cancelar la solicitud', {
        description: error.response?.data?.message ?? 'Solo se pueden cancelar solicitudes pendientes.',
      }),
  });
};
