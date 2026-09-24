import { type Defect, type MaintenanceAction, maintenanceTypeLabels } from "@car/shared";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatCurrency, formatDate, formatKm } from "../format";
import { useDefects, useMaintenanceActions } from "../queries";
import { useCurrentCar } from "../selectedCar";

export function MaintenancePage() {
  const { id } = useCurrentCar();
  const defects = useDefects(id);
  const actions = useMaintenanceActions(id);

  return (
    <>
      <PageHeader title="Maintenance" />
      <div className="columns">
        <section>
          <div className="section-header">
            <h2>Defects</h2>
            <Link to="/maintenance/defects/new" className="button button-small">
              Add defect
            </Link>
          </div>
          {defects.isPending ? (
            <Loading />
          ) : defects.isError ? (
            <LoadError error={defects.error} />
          ) : (
            <DefectList defects={defects.data} />
          )}
        </section>

        <section>
          <div className="section-header">
            <h2>Actions</h2>
            <Link to="/maintenance/actions/new" className="button button-small">
              Add action
            </Link>
          </div>
          {actions.isPending ? (
            <Loading />
          ) : actions.isError ? (
            <LoadError error={actions.error} />
          ) : (
            <ActionList actions={actions.data} />
          )}
        </section>
      </div>
    </>
  );
}

function DefectItems({ defects }: { defects: Defect[] }) {
  return (
    <ul className="list card">
      {defects.map((defect) => (
        <li key={defect.id}>
          <Link to={`/maintenance/defects/${defect.id}`} className="list-item">
            <div className="list-main">
              <strong>{defect.title}</strong>
              <span className="muted">
                {defect.fixedDate
                  ? `Fixed ${formatDate(defect.fixedDate)}`
                  : `Since ${formatDate(defect.startDate)}${defect.startOdo !== null ? ` · ${formatKm(defect.startOdo)}` : ""}`}
              </span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function DefectList({ defects }: { defects: Defect[] }) {
  const open = defects.filter((defect) => !defect.fixedDate);
  const fixed = defects.filter((defect) => defect.fixedDate);

  return (
    <>
      {open.length === 0 ? <p className="muted card">No open defects.</p> : <DefectItems defects={open} />}
      {fixed.length > 0 && (
        <details className="more">
          <summary>Fixed defects ({fixed.length})</summary>
          <DefectItems defects={fixed} />
        </details>
      )}
    </>
  );
}

function ActionList({ actions }: { actions: MaintenanceAction[] }) {
  if (actions.length === 0) {
    return <p className="muted card">No maintenance actions yet.</p>;
  }
  const total = actions.reduce((sum, action) => sum + action.cost, 0);

  return (
    <>
      <ul className="list card">
        {actions.map((action) => (
          <li key={action.id}>
            <Link to={`/maintenance/actions/${action.id}`} className="list-item">
              <div className="list-main">
                <strong>
                  <span className={`badge badge-type badge-${action.type.toLowerCase()}`}>
                    {maintenanceTypeLabels[action.type]}
                  </span>{" "}
                  {action.title}
                </strong>
                <span className="muted">
                  {formatDate(action.date)} · {formatKm(action.odo)}
                  {action.garage && ` · ${action.garage}`}
                </span>
                {action.fixedDefects.length > 0 && (
                  <span className="muted">Fixed: {action.fixedDefects.map((d) => d.title).join(", ")}</span>
                )}
              </div>
              <div className="list-side">
                <strong>{formatCurrency(action.cost)}</strong>
              </div>
            </Link>
          </li>
        ))}
      </ul>
      <p className="muted total">Total: {formatCurrency(total)}</p>
    </>
  );
}
