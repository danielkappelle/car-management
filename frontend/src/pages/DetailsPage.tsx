import { type Car, carSpecsInput } from "@car/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router";
import { FormError, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { daysUntil, formatDate } from "../format";
import { useCar, useDeleteCar, useSaveSpecs } from "../queries";
import { useCurrentCar } from "../selectedCar";

const SUGGESTED_SPECS = [
  "Fuel type",
  "Engine",
  "Power",
  "Transmission",
  "Oil type",
  "Oil capacity",
  "Tire size",
  "Tire pressure",
  "Color",
];

export function DetailsPage() {
  const { id } = useCurrentCar();
  const car = useCar(id);

  if (car.isPending) return <Loading />;
  if (car.isError) return <LoadError error={car.error} />;
  return <CarDetails car={car.data} />;
}

function ApkBadge({ date }: { date: string }) {
  const days = daysUntil(date);
  if (days < 0) return <span className="badge badge-danger">Overdue</span>;
  if (days <= 60) return <span className="badge badge-warning">In {days} days</span>;
  return null;
}

function CarDetails({ car }: { car: Car }) {
  const navigate = useNavigate();
  const deleteCar = useDeleteCar();
  const [editingSpecs, setEditingSpecs] = useState(false);

  const onDelete = () => {
    if (window.confirm(`Delete ${car.name} including all fuel, defect and maintenance records?`)) {
      deleteCar.mutate(car.id, { onSuccess: () => navigate("/details") });
    }
  };

  const rows: [string, React.ReactNode][] = [
    ["Make & model", `${car.make} ${car.model}`],
    ["License plate", <span className="plate">{car.licensePlate}</span>],
    ["VIN", car.vin ?? "—"],
    [
      "APK due",
      car.apkDueDate ? (
        <>
          {formatDate(car.apkDueDate)} <ApkBadge date={car.apkDueDate} />
        </>
      ) : (
        "—"
      ),
    ],
    ["First registration", car.firstRegistration ? formatDate(car.firstRegistration) : "—"],
    ["Owned since", car.ownedSince ? formatDate(car.ownedSince) : "—"],
  ];

  return (
    <>
      <PageHeader title={car.name}>
        <Link to="/details/edit" className="button">
          Edit
        </Link>
      </PageHeader>

      <div className="columns">
        <section className="card">
          <dl className="details">
            {rows.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {car.notes && <p className="notes">{car.notes}</p>}
        </section>

        <section className="card">
          <div className="section-header">
            <h2>Specs</h2>
            {!editingSpecs && (
              <button type="button" className="button button-small" onClick={() => setEditingSpecs(true)}>
                Edit
              </button>
            )}
          </div>
          {editingSpecs ? (
            <SpecsEditor car={car} onDone={() => setEditingSpecs(false)} />
          ) : car.specs.length === 0 ? (
            <p className="muted">No specs yet. Add things like fuel type, oil type or tire size.</p>
          ) : (
            <dl className="details">
              {car.specs.map((spec) => (
                <div key={spec.key}>
                  <dt>{spec.key}</dt>
                  <dd>{spec.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>

      <div className="danger-zone">
        <button type="button" className="button button-danger" onClick={onDelete} disabled={deleteCar.isPending}>
          Delete car
        </button>
      </div>
    </>
  );
}

function SpecsEditor({ car, onDone }: { car: Car; onDone: () => void }) {
  const save = useSaveSpecs(car.id);
  const { formError, check, showError } = useFormErrors();
  const [rows, setRows] = useState(() =>
    car.specs.length > 0 ? car.specs : [{ key: "", value: "" }],
  );

  const update = (index: number, change: Partial<(typeof rows)[number]>) =>
    setRows(rows.map((row, i) => (i === index ? { ...row, ...change } : row)));

  const move = (index: number, offset: number) => {
    const next = [...rows];
    const [row] = next.splice(index, 1);
    next.splice(index + offset, 0, row!);
    setRows(next);
  };

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const specs = rows
      .map((row) => ({ key: row.key.trim(), value: row.value.trim() }))
      .filter((row) => row.key || row.value);
    if (!check(carSpecsInput, specs)) return;
    save.mutate(specs, { onSuccess: onDone, onError: showError });
  };

  const unusedSuggestions = SUGGESTED_SPECS.filter((key) => !rows.some((row) => row.key === key));

  return (
    <form onSubmit={onSubmit} noValidate>
      <datalist id="spec-keys">
        {unusedSuggestions.map((key) => (
          <option key={key} value={key} />
        ))}
      </datalist>
      <div className="spec-rows">
        {rows.map((row, index) => (
          <div className="spec-row" key={index}>
            <input
              aria-label="Name"
              placeholder="Name"
              list="spec-keys"
              value={row.key}
              onChange={(event) => update(index, { key: event.target.value })}
            />
            <input
              aria-label="Value"
              placeholder="Value"
              value={row.value}
              onChange={(event) => update(index, { value: event.target.value })}
            />
            <div className="spec-row-actions">
              <button type="button" className="icon-button" aria-label="Move up" disabled={index === 0} onClick={() => move(index, -1)}>
                ↑
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Move down"
                disabled={index === rows.length - 1}
                onClick={() => move(index, 1)}
              >
                ↓
              </button>
              <button
                type="button"
                className="icon-button"
                aria-label="Remove"
                onClick={() => setRows(rows.filter((_, i) => i !== index))}
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" className="button-link" onClick={() => setRows([...rows, { key: "", value: "" }])}>
        + Add spec
      </button>
      <FormError message={formError} />
      <div className="form-actions">
        <button type="button" className="button" onClick={onDone}>
          Cancel
        </button>
        <button type="submit" className="button button-primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save specs"}
        </button>
      </div>
    </form>
  );
}
