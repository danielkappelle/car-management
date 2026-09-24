import {
  type Defect,
  type MaintenanceAction,
  type MaintenanceActionInput,
  maintenanceActionInput,
  type MaintenanceType,
  maintenanceTypeLabels,
  maintenanceTypes,
} from "@car/shared";
import { type FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { carToInput } from "../cars";
import { Field, FormError, readNumber, Toggle, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { addYears, formatDate, formatKm, toInputDecimal, todayIso } from "../format";
import { useCar, useDefects, useLatestOdo, useMaintenanceActions, useMaintenanceMutations, useSaveCar } from "../queries";
import { useCurrentCar } from "../selectedCar";

export function MaintenanceActionFormPage() {
  const { id: carId } = useCurrentCar();
  const params = useParams();
  const actions = useMaintenanceActions(carId);
  const defects = useDefects(carId);

  if (actions.isPending || defects.isPending) return <Loading />;
  if (actions.isError) return <LoadError error={actions.error} />;
  if (defects.isError) return <LoadError error={defects.error} />;

  const actionId = params.id === undefined ? undefined : Number(params.id);
  const action = actions.data.find((a) => a.id === actionId);
  if (actionId !== undefined && !action) {
    return <p className="form-error">Maintenance action not found.</p>;
  }
  const garages = [...new Set(actions.data.map((a) => a.garage).filter((g): g is string => Boolean(g)))];
  return <ActionForm carId={carId} action={action} defects={defects.data} garages={garages} />;
}

function ActionForm({
  carId,
  action,
  defects,
  garages,
}: {
  carId: number;
  action?: MaintenanceAction;
  defects: Defect[];
  garages: string[];
}) {
  const navigate = useNavigate();
  const car = useCar(carId);
  const saveCar = useSaveCar();
  const latestOdo = useLatestOdo(carId);
  const { save, remove } = useMaintenanceMutations(carId);
  const { errors, formError, check, showError } = useFormErrors();

  const [type, setType] = useState<MaintenanceType>(action?.type ?? "SERVICE");
  const [title, setTitle] = useState(action?.title ?? "");
  const [date, setDate] = useState(action?.date ?? todayIso());
  const [odo, setOdo] = useState(action?.odo.toString() ?? "");
  const [cost, setCost] = useState(action ? toInputDecimal(action.cost) : "");
  const [garage, setGarage] = useState(action?.garage ?? "");
  const [notes, setNotes] = useState(action?.notes ?? "");
  const [fixedDefectIds, setFixedDefectIds] = useState(() => new Set(action?.fixedDefects.map((d) => d.id)));
  // Logging a new APK offers to move the car's APK due date a year ahead.
  const [updateApk, setUpdateApk] = useState(!action);
  const [apkDueDate, setApkDueDate] = useState<string | null>(null);

  // Defects that can be linked: open ones, plus the ones this action already fixes.
  const linkableDefects = defects.filter((d) => !d.fixedDate || d.fixedActionId === action?.id);
  const showApk = type === "APK" && car.data !== undefined;

  const toggleDefect = (id: number, checked: boolean) => {
    const next = new Set(fixedDefectIds);
    if (checked) next.add(id);
    else next.delete(id);
    setFixedDefectIds(next);
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const body: MaintenanceActionInput = {
      type,
      title,
      date,
      odo: readNumber(odo) as number,
      cost: readNumber(cost) as number,
      garage: garage || null,
      notes: notes || null,
      fixedDefectIds: [...fixedDefectIds],
    };
    if (!check(maintenanceActionInput, body)) return;
    try {
      await save.mutateAsync({ id: action?.id, body });
      if (showApk && updateApk) {
        await saveCar.mutateAsync({
          id: carId,
          body: { ...carToInput(car.data), apkDueDate: apkDueDate ?? addYears(date, 1) },
        });
      }
      navigate("/maintenance");
    } catch (error) {
      showError(error);
    }
  };

  const onDelete = () => {
    if (action && window.confirm("Delete this maintenance action? Defects it fixed become open again.")) {
      remove.mutate(action.id, { onSuccess: () => navigate("/maintenance"), onError: showError });
    }
  };

  return (
    <form className="form form-narrow" onSubmit={onSubmit} noValidate>
      <PageHeader title={action ? "Edit maintenance" : "Add maintenance"} back="/maintenance" />

      <div className="card form-stack">
        <div className="form-row">
          <Field label="Type" error={errors.type}>
            <select value={type} onChange={(event) => setType(event.target.value as MaintenanceType)}>
              {maintenanceTypes.map((t) => (
                <option key={t} value={t}>
                  {maintenanceTypeLabels[t]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date" error={errors.date}>
            <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
          </Field>
        </div>
        <Field label="Title" error={errors.title}>
          <input
            value={title}
            placeholder={type === "APK" ? "APK inspection" : "e.g. Oil change, brake pads"}
            onChange={(event) => setTitle(event.target.value)}
          />
        </Field>
        <div className="form-row">
          <Field
            label="Odometer (km)"
            error={errors.odo}
            hint={latestOdo !== null ? `Latest known: ${formatKm(latestOdo)}` : undefined}
          >
            <input inputMode="numeric" pattern="[0-9]*" value={odo} onChange={(event) => setOdo(event.target.value)} />
          </Field>
          <Field label="Cost (€)" error={errors.cost}>
            <input inputMode="decimal" value={cost} onChange={(event) => setCost(event.target.value)} />
          </Field>
        </div>
        <Field label="Garage" error={errors.garage}>
          <input list="garages" value={garage} onChange={(event) => setGarage(event.target.value)} />
        </Field>
        <datalist id="garages">
          {garages.map((g) => (
            <option key={g} value={g} />
          ))}
        </datalist>
        <Field label="Notes" error={errors.notes}>
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} />
        </Field>
      </div>

      {showApk && (
        <div className="card form-stack">
          <Toggle
            label="Update APK due date"
            description={car.data.apkDueDate ? `Currently ${formatDate(car.data.apkDueDate)}` : "Currently not set"}
            checked={updateApk}
            onChange={setUpdateApk}
          />
          {updateApk && (
            <Field label="New APK due date">
              <input
                type="date"
                value={apkDueDate ?? addYears(date, 1)}
                onChange={(event) => setApkDueDate(event.target.value)}
              />
            </Field>
          )}
        </div>
      )}

      {linkableDefects.length > 0 && (
        <fieldset className="card form-stack">
          <legend>Defects fixed by this action</legend>
          {linkableDefects.map((defect) => (
            <label key={defect.id} className="checkbox">
              <input
                type="checkbox"
                checked={fixedDefectIds.has(defect.id)}
                onChange={(event) => toggleDefect(defect.id, event.target.checked)}
              />
              {defect.title}
            </label>
          ))}
        </fieldset>
      )}

      <FormError message={formError} />
      <div className="form-actions form-actions-sticky">
        {action && (
          <button type="button" className="button button-danger" onClick={onDelete} disabled={remove.isPending}>
            Delete
          </button>
        )}
        <button
          type="submit"
          className="button button-primary button-wide"
          disabled={save.isPending || saveCar.isPending}
        >
          {save.isPending || saveCar.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
