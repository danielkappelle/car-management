import type {
  Car,
  CarInput,
  CarSpecsInput,
  CarSummary,
  Defect,
  DefectInput,
  FuelUplift,
  FuelUpliftInput,
  MaintenanceAction,
  MaintenanceActionInput,
} from "@car/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ApiError, api } from "./api";

export const keys = {
  me: ["me"] as const,
  cars: ["cars"] as const,
  car: (carId: number) => ["cars", carId] as const,
  fuel: (carId: number) => ["cars", carId, "fuel"] as const,
  defects: (carId: number) => ["cars", carId, "defects"] as const,
  maintenance: (carId: number) => ["cars", carId, "maintenance"] as const,
};

export function useMe() {
  return useQuery({
    queryKey: keys.me,
    queryFn: async () => {
      try {
        return await api<{ username: string }>("/auth/me");
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          return null;
        }
        throw error;
      }
    },
    staleTime: Infinity,
  });
}

export function useLogin() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: { username: string; password: string }) =>
      api<{ username: string }>("/auth/login", { method: "POST", body }),
    onSuccess: (me) => queryClient.setQueryData(keys.me, me),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => api<void>("/auth/logout", { method: "POST" }),
    onSuccess: () => {
      queryClient.clear();
      queryClient.setQueryData(keys.me, null);
    },
  });
}

export const useCars = () =>
  useQuery({ queryKey: keys.cars, queryFn: () => api<CarSummary[]>("/cars") });

export const useCar = (carId: number) =>
  useQuery({ queryKey: keys.car(carId), queryFn: () => api<Car>(`/cars/${carId}`) });

export const useFuelUplifts = (carId: number) =>
  useQuery({ queryKey: keys.fuel(carId), queryFn: () => api<FuelUplift[]>(`/cars/${carId}/fuel`) });

export const useDefects = (carId: number) =>
  useQuery({ queryKey: keys.defects(carId), queryFn: () => api<Defect[]>(`/cars/${carId}/defects`) });

export const useMaintenanceActions = (carId: number) =>
  useQuery({
    queryKey: keys.maintenance(carId),
    queryFn: () => api<MaintenanceAction[]>(`/cars/${carId}/maintenance`),
  });

export function useSaveCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id?: number; body: CarInput }) =>
      id === undefined
        ? api<Car>("/cars", { method: "POST", body })
        : api<Car>(`/cars/${id}`, { method: "PUT", body }),
    onSuccess: (car) => {
      queryClient.setQueryData(keys.car(car.id), car);
      void queryClient.invalidateQueries({ queryKey: keys.cars, exact: true });
    },
  });
}

export function useSaveSpecs(carId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: CarSpecsInput) => api<Car>(`/cars/${carId}/specs`, { method: "PUT", body }),
    onSuccess: (car) => queryClient.setQueryData(keys.car(car.id), car),
  });
}

export function useDeleteCar() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (carId: number) => api<void>(`/cars/${carId}`, { method: "DELETE" }),
    onSuccess: (_, carId) => {
      queryClient.removeQueries({ queryKey: keys.car(carId) });
      void queryClient.invalidateQueries({ queryKey: keys.cars, exact: true });
    },
  });
}

/** Save (create or update) and delete mutations for a list resource of a car. */
function useCarResource<TInput>(carId: number, resource: string, affects: readonly (readonly unknown[])[]) {
  const queryClient = useQueryClient();
  const onSuccess = () =>
    Promise.all(affects.map((queryKey) => queryClient.invalidateQueries({ queryKey })));

  const save = useMutation({
    mutationFn: ({ id, body }: { id?: number; body: TInput }) =>
      id === undefined
        ? api<unknown>(`/cars/${carId}/${resource}`, { method: "POST", body })
        : api<unknown>(`/cars/${carId}/${resource}/${id}`, { method: "PUT", body }),
    onSuccess,
  });
  const remove = useMutation({
    mutationFn: (id: number) => api<void>(`/cars/${carId}/${resource}/${id}`, { method: "DELETE" }),
    onSuccess,
  });
  return { save, remove };
}

export const useFuelMutations = (carId: number) =>
  useCarResource<FuelUpliftInput>(carId, "fuel", [keys.fuel(carId)]);

// Defects and maintenance actions link to each other, so changes to either refresh both.
export const useDefectMutations = (carId: number) =>
  useCarResource<DefectInput>(carId, "defects", [keys.defects(carId), keys.maintenance(carId)]);

export const useMaintenanceMutations = (carId: number) =>
  useCarResource<MaintenanceActionInput>(carId, "maintenance", [
    keys.defects(carId),
    keys.maintenance(carId),
  ]);

/** Highest known odometer reading of a car, from fuel uplifts and maintenance actions. */
export function useLatestOdo(carId: number): number | null {
  const fuel = useFuelUplifts(carId);
  const maintenance = useMaintenanceActions(carId);
  const readings = [...(fuel.data ?? []), ...(maintenance.data ?? [])].map((record) => record.odo);
  return readings.length > 0 ? Math.max(...readings) : null;
}
