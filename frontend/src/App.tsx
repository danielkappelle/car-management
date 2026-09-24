import type { ReactNode } from "react";
import { Navigate, Outlet, Route, Routes, useLocation } from "react-router";
import { Layout } from "./components/Layout";
import { LoadError, Loading } from "./components/status";
import { CarFormPage } from "./pages/CarFormPage";
import { DefectFormPage } from "./pages/DefectFormPage";
import { DetailsPage } from "./pages/DetailsPage";
import { FuelFormPage } from "./pages/FuelFormPage";
import { FuelPage } from "./pages/FuelPage";
import { LoginPage } from "./pages/LoginPage";
import { MaintenanceActionFormPage } from "./pages/MaintenanceActionFormPage";
import { MaintenancePage } from "./pages/MaintenancePage";
import { NoCarsPage } from "./pages/NoCarsPage";
import { useCars, useMe } from "./queries";
import { SelectedCarProvider, useSelectedCar } from "./selectedCar";

function RequireLogin({ children }: { children: ReactNode }) {
  const me = useMe();
  const location = useLocation();

  if (me.isPending) return <Loading />;
  if (me.isError) return <LoadError error={me.error} />;
  if (!me.data) return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return children;
}

function WithCars() {
  const cars = useCars();

  if (cars.isPending) return <Loading />;
  if (cars.isError) return <LoadError error={cars.error} />;
  return (
    <SelectedCarProvider cars={cars.data}>
      <Layout />
    </SelectedCarProvider>
  );
}

/** Pages that need a car; shows the "add your first car" page otherwise. */
function RequireCar() {
  const { car } = useSelectedCar();
  // Remount per car, so forms and local state never leak between cars.
  return car ? <Outlet key={car.id} /> : <NoCarsPage />;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireLogin>
            <WithCars />
          </RequireLogin>
        }
      >
        <Route path="/cars/new" element={<CarFormPage />} />
        <Route element={<RequireCar />}>
          <Route index element={<Navigate to="/fuel" replace />} />
          <Route path="/details" element={<DetailsPage />} />
          <Route path="/details/edit" element={<CarFormPage edit />} />
          <Route path="/fuel" element={<FuelPage />} />
          <Route path="/fuel/new" element={<FuelFormPage />} />
          <Route path="/fuel/:id" element={<FuelFormPage />} />
          <Route path="/maintenance" element={<MaintenancePage />} />
          <Route path="/maintenance/defects/new" element={<DefectFormPage />} />
          <Route path="/maintenance/defects/:id" element={<DefectFormPage />} />
          <Route path="/maintenance/actions/new" element={<MaintenanceActionFormPage />} />
          <Route path="/maintenance/actions/:id" element={<MaintenanceActionFormPage />} />
          <Route path="*" element={<Navigate to="/fuel" replace />} />
        </Route>
      </Route>
    </Routes>
  );
}
