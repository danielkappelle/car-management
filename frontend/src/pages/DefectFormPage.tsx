import { type Defect, type DefectInput, defectInput, type MaintenanceAction } from "@car/shared";
import { type FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Field, FormError, readNumber, Toggle, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatDate, formatKm, todayIso } from "../format";
import { useDefectMutations, useDefects, useLatestOdo, useMaintenanceActions } from "../queries";
import { useCurrentCar } from "../selectedCar";

export function DefectFormPage() {
  const { id: carId } = useCurrentCar();
  const params = useParams();
  const defects = useDefects(carId);
  const actions = useMaintenanceActions(carId);

  if (defects.isPending || actions.isPending) return <Loading />;
  if (defects.isError) return <LoadError error={defects.error} />;
  if (actions.isError) return <LoadError error={actions.error} />;

  const defectId = params.id === undefined ? undefined : Number(params.id);
  const defect = defects.data.find((d) => d.id === defectId);
  if (defectId !== undefined && !defect) {
    return <p className="form-error">Defect not found.</p>;
  }
  return <DefectForm carId={carId} defect={defect} actions={actions.data} />;
}

function DefectForm({
  carId,
  defect,
  actions,
}: {
  carId: number;
  defect?: Defect;
  actions: MaintenanceAction[];
}) {
  const navigate = useNavigate();
  const latestOdo = useLatestOdo(carId);
  const { save, remove } = useDefectMutations(carId);
  const { errors, formError, check, showError } = useFormErrors();

  const [title, setTitle] = useState(defect?.title ?? "");
  const [description, setDescription] = useState(defect?.description ?? "");
  const [startDate, setStartDate] = useState(defect?.startDate ?? todayIso());
  const [startOdo, setStartOdo] = useState(defect?.startOdo?.toString() ?? "");
  const [fixed, setFixed] = useState(Boolean(defect?.fixedDate));
  const [fixedActionId, setFixedActionId] = useState(defect?.fixedActionId?.toString() ?? "");
  const [fixedDate, setFixedDate] = useState(defect?.fixedDate ?? todayIso());
  const [fixedOdo, setFixedOdo] = useState(defect?.fixedOdo?.toString() ?? "");

  const byAction = fixed && fixedActionId !== "";

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const body: DefectInput = {
      title,
      description: description || null,
      startDate,
      startOdo: readNumber(startOdo),
      fixedDate: fixed && !byAction ? fixedDate : null,
      fixedOdo: fixed && !byAction ? readNumber(fixedOdo) : null,
      fixedActionId: byAction ? Number(fixedActionId) : null,
    };
    if (!check(defectInput, body)) return;
    save.mutate({ id: defect?.id, body }, { onSuccess: () => navigate("/maintenance"), onError: showError });
  };

  const onDelete = () => {
    if (defect && window.confirm("Delete this defect?")) {
      remove.mutate(defect.id, { onSuccess: () => navigate("/maintenance"), onError: showError });
    }
  };

  const odoHint = latestOdo !== null ? `Latest known: ${formatKm(latestOdo)}` : undefined;

  return (
    <form className="form form-narrow" onSubmit={onSubmit} noValidate>
      <PageHeader title={defect ? "Edit defect" : "Add defect"} back="/maintenance" />

      <div className="card form-stack">
        <Field label="Title" error={errors.title}>
          <input value={title} onChange={(event) => setTitle(event.target.value)} autoFocus={!defect} />
        </Field>
        <Field label="Description" error={errors.description}>
          <textarea rows={3} value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="form-row">
          <Field label="Noticed on" error={errors.startDate}>
            <input type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label="Odometer (km)" error={errors.startOdo} hint={odoHint}>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              value={startOdo}
              onChange={(event) => setStartOdo(event.target.value)}
            />
          </Field>
        </div>
      </div>

      <div className="card form-stack">
        <Toggle label="Fixed" checked={fixed} onChange={setFixed} />
        {fixed && (
          <>
            <Field label="Fixed by" error={errors.fixedActionId}>
              <select value={fixedActionId} onChange={(event) => setFixedActionId(event.target.value)}>
                <option value="">No maintenance action</option>
                {actions.map((action) => (
                  <option key={action.id} value={action.id}>
                    {formatDate(action.date)} · {action.title}
                  </option>
                ))}
              </select>
            </Field>
            {!byAction && (
              <div className="form-row">
                <Field label="Fixed on" error={errors.fixedDate}>
                  <input type="date" value={fixedDate} onChange={(event) => setFixedDate(event.target.value)} />
                </Field>
                <Field label="Odometer (km)" error={errors.fixedOdo} hint={odoHint}>
                  <input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={fixedOdo}
                    onChange={(event) => setFixedOdo(event.target.value)}
                  />
                </Field>
              </div>
            )}
          </>
        )}
      </div>

      <FormError message={formError} />
      <div className="form-actions form-actions-sticky">
        {defect && (
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
