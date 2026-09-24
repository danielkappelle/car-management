import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { useLogout } from "../queries";
import { useSelectedCar } from "../selectedCar";
import { CarIcon, FuelIcon, PlusIcon, WrenchIcon } from "./icons";

const tabs = [
  { to: "/details", label: "Details", icon: <CarIcon /> },
  { to: "/fuel", label: "Fuel", icon: <FuelIcon /> },
  { to: "/maintenance", label: "Maintenance", icon: <WrenchIcon /> },
];

const ADD_CAR = "add";

function CarSelect() {
  const { cars, car, selectCar } = useSelectedCar();
  const navigate = useNavigate();

  if (!car) {
    return null;
  }
  return (
    <select
      className="car-select"
      aria-label="Selected car"
      value={car.id}
      onChange={(event) => {
        if (event.target.value === ADD_CAR) {
          navigate("/cars/new");
        } else {
          selectCar(Number(event.target.value));
        }
      }}
    >
      {cars.map((c) => (
        <option key={c.id} value={c.id}>
          {c.name} · {c.licensePlate}
        </option>
      ))}
      <option value={ADD_CAR}>+ Add car…</option>
    </select>
  );
}

export function Layout() {
  const { car } = useSelectedCar();
  const logout = useLogout();
  const { pathname } = useLocation();
  // Forms have their own save button at the bottom, keep the floating button out of the way.
  const onForm = /\/(new|edit|\d+)$/.test(pathname);

  return (
    <div className="app">
      <header className="topbar">
        <Link to="/" className="brand">
          <img src="/icon.svg" alt="" width={28} height={28} />
          <span>Cars</span>
        </Link>
        <CarSelect />
        {car && (
          <nav className="tabs-top" aria-label="Main">
            {tabs.map((tab) => (
              <NavLink key={tab.to} to={tab.to}>
                {tab.label}
              </NavLink>
            ))}
          </nav>
        )}
        <button type="button" className="button-link logout" onClick={() => logout.mutate()}>
          Log out
        </button>
      </header>

      <main className="content">
        <Outlet />
      </main>

      {car && !onForm && (
        <Link to="/fuel/new" className="fab" aria-label="Add fuel uplift">
          <PlusIcon />
          <FuelIcon />
        </Link>
      )}

      {car && (
        <nav className="tabs-bottom" aria-label="Main">
          {tabs.map((tab) => (
            <NavLink key={tab.to} to={tab.to}>
              {tab.icon}
              <span>{tab.label}</span>
            </NavLink>
          ))}
        </nav>
      )}
    </div>
  );
}
