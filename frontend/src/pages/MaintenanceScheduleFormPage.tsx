import {
  DEFAULT_WARN_DAYS,
  DEFAULT_WARN_KM,
  type MaintenanceAction,
  type MaintenanceSchedule,
  type MaintenanceScheduleInput,
  maintenanceScheduleInput,
  type MaintenanceType,
  maintenanceTypeLabels,
  maintenanceTypes,
} from "@car/shared";
import { type FormEvent, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { Field, FormError, readNumber, Toggle, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatDate, formatKm, formatNumber, todayIso } from "../format";
import { maintenancePath } from "../maintenanceTab";
import { useFuelUplifts, useLatestOdo, useMaintenanceActions, useScheduleMutations, useSchedules } from "../queries";
import { useCurrentCar } from "../selectedCar";

export function MaintenanceScheduleFormPage() {
  const { id: carId } = useCurrentCar();
  const params = useParams();
  const schedules = useSchedules(carId);
  const actions = useMaintenanceActions(carId);
  // Loaded up front, so a new schedule can count from the latest odometer reading.
  const fuel = useFuelUplifts(carId);

  if (schedules.isPending || actions.isPending || fuel.isPending) return <Loading />;
  if (schedules.isError) return <LoadError error={schedules.error} />;
  if (actions.isError) return <LoadError error={actions.error} />;

  const scheduleId = params.id === undefined ? undefined : Number(params.id);
  const schedule = schedules.data.find((s) => s.id === scheduleId);
  if (scheduleId !== undefined && !schedule) {
    return <p className="form-error">Recurring maintenance not found.</p>;
  }
  const history = schedule ? actions.data.filter((a) => a.schedules.some((s) => s.id === schedule.id)) : [];
  return <ScheduleForm carId={carId} schedule={schedule} history={history} />;
}

function ScheduleForm({
  carId,
  schedule,
  history,
}: {
  carId: number;
  schedule?: MaintenanceSchedule;
  history: MaintenanceAction[];
}) {
  const navigate = useNavigate();
  const latestOdo = useLatestOdo(carId);
  const { save, remove } = useScheduleMutations(carId);
  const { errors, formError, check, showError } = useFormErrors();

  const [name, setName] = useState(schedule?.name ?? "");
  const [description, setDescription] = useState(schedule?.description ?? "");
  const [type, setType] = useState<MaintenanceType>(schedule?.type ?? "SERVICE");
  const [intervalKm, setIntervalKm] = useState(schedule?.intervalKm?.toString() ?? "");
  const [intervalMonths, setIntervalMonths] = useState(schedule?.intervalMonths?.toString() ?? "");
  const [warnKm, setWarnKm] = useState(schedule?.warnKm?.toString() ?? "");
  const [warnDays, setWarnDays] = useState(schedule?.warnDays?.toString() ?? "");
  const [startDate, setStartDate] = useState(schedule?.startDate ?? todayIso());
  const [startOdo, setStartOdo] = useState(schedule?.startOdo?.toString() ?? latestOdo?.toString() ?? "");
  const [active, setActive] = useState(schedule?.active ?? true);

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const body: MaintenanceScheduleInput = {
      name,
      description: description || null,
      type,
      intervalKm: readNumber(intervalKm),
      intervalMonths: readNumber(intervalMonths),
      warnKm: readNumber(warnKm),
      warnDays: readNumber(warnDays),
      startDate,
      startOdo: readNumber(startOdo),
      active,
    };
    if (!check(maintenanceScheduleInput, body)) return;
    save.mutate(
      { id: schedule?.id, body },
      { onSuccess: () => navigate(maintenancePath("recurring")), onError: showError },
    );
  };

  const onDelete = () => {
    if (schedule && window.confirm("Delete this recurring maintenance? Logged actions are kept.")) {
      remove.mutate(schedule.id, { onSuccess: () => navigate(maintenancePath("recurring")), onError: showError });
    }
  };

  return (
    <form className="form form-narrow" onSubmit={onSubmit} noValidate>
      <PageHeader
        title={schedule ? "Edit recurring maintenance" : "Add recurring maintenance"}
        back={maintenancePath("recurring")}
      >
        {schedule && (
          <Link to={`/maintenance/actions/new?schedule=${schedule.id}`} className="button">
            Log
          </Link>
        )}
      </PageHeader>

      <div className="card form-stack">
        <div className="form-row">
          <Field label="Name" error={errors.name}>
            <input value={name} placeholder="e.g. Oil change, timing belt" onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Type" error={errors.type}>
            <select value={type} onChange={(event) => setType(event.target.value as MaintenanceType)}>
              {maintenanceTypes.map((t) => (
                <option key={t} value={t}>
                  {maintenanceTypeLabels[t]}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <Field label="Description" error={errors.description}>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
      </div>

      <fieldset className="card form-stack">
        <legend>Interval</legend>
        <p className="field-hint">Set a distance, a time, or both: whichever comes first.</p>
        <div className="form-row">
          <Field label="Every (km)" error={errors.intervalKm}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 15000"
              value={intervalKm}
              onChange={(event) => setIntervalKm(event.target.value)}
            />
          </Field>
          <Field label="Every (months)" error={errors.intervalMonths}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder="e.g. 12"
              value={intervalMonths}
              onChange={(event) => setIntervalMonths(event.target.value)}
            />
          </Field>
        </div>
        <div className="form-row">
          <Field label="Warn before (km)" error={errors.warnKm}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={formatNumber(DEFAULT_WARN_KM)}
              value={warnKm}
              onChange={(event) => setWarnKm(event.target.value)}
            />
          </Field>
          <Field label="Warn before (days)" error={errors.warnDays}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              placeholder={String(DEFAULT_WARN_DAYS)}
              value={warnDays}
              onChange={(event) => setWarnDays(event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      <fieldset className="card form-stack">
        <legend>Count from</legend>
        <p className="field-hint">
          When it was last done, or when to start counting. Logging a maintenance action for it resets the interval.
        </p>
        <div className="form-row">
          <Field label="Date" error={errors.startDate}>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field
            label="Odometer (km)"
            error={errors.startOdo}
            hint={latestOdo !== null ? `Latest known: ${formatKm(latestOdo)}` : undefined}
          >
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={startOdo}
              onChange={(event) => setStartOdo(event.target.value)}
            />
          </Field>
        </div>
      </fieldset>

      {schedule && (
        <div className="card form-stack">
          <Toggle
            label="Active"
            description="Paused maintenance is not tracked and gives no warnings."
            checked={active}
            onChange={setActive}
          />
        </div>
      )}

      {schedule && (
        <section>
          <h2>History</h2>
          {history.length === 0 ? (
            <p className="muted card">Not logged yet.</p>
          ) : (
            <ul className="list card">
              {history.map((action) => (
                <li key={action.id}>
                  <Link to={`/maintenance/actions/${action.id}`} className="list-item">
                    <div className="list-main">
                      <strong>{action.title}</strong>
                      <span className="muted">
                        {formatDate(action.date)} · {formatKm(action.odo)}
                        {action.garage && ` · ${action.garage}`}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <FormError message={formError} />
      <div className="form-actions form-actions-sticky">
        {schedule && (
          <button type="button" className="button button-danger" onClick={onDelete} disabled={remove.isPending}>
            Delete
          </button>
        )}
        <button type="submit" className="button button-primary button-wide" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
