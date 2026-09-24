import { computeFuelStats, type FuelUplift, type FuelUpliftInput, fuelUpliftInput } from "@car/shared";
import { type FormEvent, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { Field, FormError, readNumber, Toggle, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatCurrency, formatDate, formatKm, toInputDecimal, todayIso } from "../format";
import { useFuelMutations, useFuelUplifts } from "../queries";
import { useCurrentCar } from "../selectedCar";
import { ConsumptionText } from "./FuelPage";

export function FuelFormPage() {
  const { id: carId } = useCurrentCar();
  const params = useParams();
  const uplifts = useFuelUplifts(carId);

  if (uplifts.isPending) return <Loading />;
  if (uplifts.isError) return <LoadError error={uplifts.error} />;

  const upliftId = params.id === undefined ? undefined : Number(params.id);
  const uplift = uplifts.data.find((u) => u.id === upliftId);
  if (upliftId !== undefined && !uplift) {
    return <p className="form-error">Fuel uplift not found.</p>;
  }
  return <FuelForm carId={carId} uplift={uplift} others={uplifts.data.filter((u) => u.id !== upliftId)} />;
}

function FuelForm({ carId, uplift, others }: { carId: number; uplift?: FuelUplift; others: FuelUplift[] }) {
  const navigate = useNavigate();
  const { save, remove } = useFuelMutations(carId);
  const { errors, formError, check, showError } = useFormErrors();

  const [date, setDate] = useState(uplift?.date ?? todayIso());
  const [odo, setOdo] = useState(uplift ? String(uplift.odo) : "");
  const [volume, setVolume] = useState(uplift ? toInputDecimal(uplift.volume) : "");
  const [totalPrice, setTotalPrice] = useState(uplift ? toInputDecimal(uplift.totalPrice) : "");
  const [fullTank, setFullTank] = useState(uplift?.fullTank ?? true);
  const [missedPrevious, setMissedPrevious] = useState(uplift?.missedPrevious ?? false);
  const [notes, setNotes] = useState(uplift?.notes ?? "");

  const body: FuelUpliftInput = {
    date,
    odo: readNumber(odo) as number,
    volume: readNumber(volume) as number,
    totalPrice: readNumber(totalPrice) as number,
    fullTank,
    missedPrevious,
    notes: notes || null,
  };

  // Live preview, computed exactly like the overview does.
  const previewValid = body.odo > 0 && body.volume > 0 && body.totalPrice > 0;
  const preview = previewValid
    ? computeFuelStats([...others, { ...body, id: -1, fullTank, missedPrevious }]).entries.get(-1)
    : undefined;

  // Reference reading: the latest uplift before this one (or overall, for a new uplift).
  const previous = others
    .filter((u) => !uplift || u.odo < uplift.odo)
    .reduce<FuelUplift | undefined>((latest, u) => (!latest || u.odo > latest.odo ? u : latest), undefined);
  const odoTooLow = !uplift && previous && body.odo > 0 && body.odo <= previous.odo;

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    if (!check(fuelUpliftInput, body)) return;
    save.mutate({ id: uplift?.id, body }, { onSuccess: () => navigate("/fuel"), onError: showError });
  };

  const onDelete = () => {
    if (uplift && window.confirm("Delete this fuel uplift?")) {
      remove.mutate(uplift.id, { onSuccess: () => navigate("/fuel"), onError: showError });
    }
  };

  return (
    <form className="form form-narrow" onSubmit={onSubmit} noValidate>
      <PageHeader title={uplift ? "Edit fuel uplift" : "Add fuel"} back="/fuel" />

      <div className="card form-stack">
        <Field
          label="Odometer (km)"
          error={errors.odo}
          hint={
            odoTooLow ? (
              <span className="warning">Not higher than the last reading ({formatKm(previous.odo)})</span>
            ) : previous ? (
              `Last: ${formatKm(previous.odo)} on ${formatDate(previous.date)}`
            ) : undefined
          }
        >
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            enterKeyHint="next"
            autoComplete="off"
            autoFocus={!uplift}
            value={odo}
            onChange={(event) => setOdo(event.target.value)}
          />
        </Field>

        <div className="form-row">
          <Field label="Liters" error={errors.volume}>
            <input
              inputMode="decimal"
              enterKeyHint="next"
              autoComplete="off"
              value={volume}
              onChange={(event) => setVolume(event.target.value)}
            />
          </Field>
          <Field label="Total price (€)" error={errors.totalPrice}>
            <input
              inputMode="decimal"
              enterKeyHint="done"
              autoComplete="off"
              value={totalPrice}
              onChange={(event) => setTotalPrice(event.target.value)}
            />
          </Field>
        </div>

        <div className="preview" aria-live="polite">
          <div>
            <span className="stat-label">Price</span>
            <span>{preview ? `${formatCurrency(preview.pricePerLiter)}/l` : "—"}</span>
          </div>
          <div>
            <span className="stat-label">Distance</span>
            <span>{preview?.distance != null ? formatKm(preview.distance) : "—"}</span>
          </div>
          <div>
            <span className="stat-label">Consumption</span>
            <span>{preview?.consumption ? <ConsumptionText consumption={preview.consumption} /> : "—"}</span>
          </div>
        </div>

        <Toggle label="Full tank" checked={fullTank} onChange={setFullTank} />

        <Field label="Date" error={errors.date}>
          <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>

        <details className="more" open={missedPrevious || Boolean(notes)}>
          <summary>More options</summary>
          <Toggle
            label="Missed a previous uplift"
            description="Skips the consumption calculation up to this uplift"
            checked={missedPrevious}
            onChange={setMissedPrevious}
          />
          <Field label="Notes" error={errors.notes}>
            <textarea rows={2} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </Field>
        </details>
      </div>

      <FormError message={formError} />
      <div className="form-actions form-actions-sticky">
        {uplift && (
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
