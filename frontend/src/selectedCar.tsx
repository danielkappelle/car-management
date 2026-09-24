import type { CarSummary } from "@car/shared";
import { createContext, type ReactNode, useCallback, useContext, useState } from "react";

const STORAGE_KEY = "selectedCarId";

function readStoredId(): number | null {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY));
    return Number.isInteger(value) && value > 0 ? value : null;
  } catch {
    return null;
  }
}

interface SelectedCarContextValue {
  cars: CarSummary[];
  car: CarSummary | null;
  selectCar: (carId: number) => void;
}

const SelectedCarContext = createContext<SelectedCarContextValue | null>(null);

export function SelectedCarProvider({ cars, children }: { cars: CarSummary[]; children: ReactNode }) {
  const [storedId, setStoredId] = useState(readStoredId);

  const selectCar = useCallback((carId: number) => {
    setStoredId(carId);
    try {
      localStorage.setItem(STORAGE_KEY, String(carId));
    } catch {
      // Storage unavailable: the selection just isn't remembered.
    }
  }, []);

  // Fall back to the first car when the remembered one no longer exists.
  const car = cars.find((c) => c.id === storedId) ?? cars[0] ?? null;

  return (
    <SelectedCarContext.Provider value={{ cars, car, selectCar }}>{children}</SelectedCarContext.Provider>
  );
}

export function useSelectedCar() {
  const context = useContext(SelectedCarContext);
  if (!context) {
    throw new Error("useSelectedCar must be used inside SelectedCarProvider");
  }
  return context;
}

/** The selected car, for pages that are only rendered when a car exists. */
export function useCurrentCar(): CarSummary {
  const { car } = useSelectedCar();
  if (!car) {
    throw new Error("No car selected");
  }
  return car;
}
