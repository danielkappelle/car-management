import { type Car, type CarInput, carInput } from "@car/shared";
import { type FormEvent, useState } from "react";
import { useNavigate } from "react-router";
import { Field, FormError, useFormErrors } from "../components/form";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { useCar, useSaveCar } from "../queries";
import { useCurrentCar, useSelectedCar } from "../selectedCar";

type Values = Record<keyof CarInput, string>;

const empty: Values = {
  name: "",
  make: "",
  model: "",
  licensePlate: "",
  vin: "",
  firstRegistration: "",
  ownedSince: "",
  apkDueDate: "",
  notes: "",
};

export function CarFormPage({ edit = false }: { edit?: boolean }) {
  return edit ? <EditCarForm /> : <CarForm />;
}

function EditCarForm() {
  const { id } = useCurrentCar();
  const existing = useCar(id);

  if (existing.isPending) return <Loading />;
  if (existing.isError) return <LoadError error={existing.error} />;
  return <CarForm car={existing.data} />;
}

function CarForm({ car }: { car?: Car }) {
  const navigate = useNavigate();
  const { selectCar } = useSelectedCar();
  const save = useSaveCar();
  const { errors, formError, check, showError } = useFormErrors();
  const [values, setValues] = useState<Values>(() =>
    car
      ? Object.fromEntries(Object.keys(empty).map((key) => [key, car[key as keyof Values] ?? ""])) as Values
      : empty,
  );

  const input = (name: keyof Values, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <input
      name={name}
      value={values[name]}
      onChange={(event) => setValues({ ...values, [name]: event.target.value })}
      {...props}
    />
  );

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    const body: CarInput = {
      ...values,
      vin: values.vin || null,
      firstRegistration: values.firstRegistration || null,
      ownedSince: values.ownedSince || null,
      apkDueDate: values.apkDueDate || null,
      notes: values.notes || null,
    };
    if (!check(carInput, body)) return;
    save.mutate(
      { id: car?.id, body },
      {
        onSuccess: (saved) => {
          selectCar(saved.id);
          navigate("/details");
        },
        onError: showError,
      },
    );
  };

  return (
    <form className="form" onSubmit={onSubmit} noValidate>
      <PageHeader title={car ? `Edit ${car.name}` : "Add a car"} back={car ? "/details" : "/"} />
      <div className="card form-grid">
        <Field label="Name" error={errors.name} hint="A short name you recognize, e.g. “Daily” or “Camper”">
          {input("name", { required: true })}
        </Field>
        <Field label="License plate" error={errors.licensePlate}>
          {input("licensePlate", { required: true, autoCapitalize: "characters" })}
        </Field>
        <Field label="Make" error={errors.make}>
          {input("make", { required: true })}
        </Field>
        <Field label="Model" error={errors.model}>
          {input("model", { required: true })}
        </Field>
        <Field label="VIN" error={errors.vin}>
          {input("vin", { autoCapitalize: "characters", maxLength: 17 })}
        </Field>
        <Field label="APK due" error={errors.apkDueDate}>
          {input("apkDueDate", { type: "date" })}
        </Field>
        <Field label="First registration" error={errors.firstRegistration}>
          {input("firstRegistration", { type: "date" })}
        </Field>
        <Field label="Owned since" error={errors.ownedSince}>
          {input("ownedSince", { type: "date" })}
        </Field>
        <Field label="Notes" error={errors.notes}>
          <textarea
            rows={4}
            value={values.notes}
            onChange={(event) => setValues({ ...values, notes: event.target.value })}
          />
        </Field>
      </div>
      <FormError message={formError} />
      <div className="form-actions">
        <button type="submit" className="button button-primary" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </form>
  );
}
