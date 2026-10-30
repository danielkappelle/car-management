import {
  type Defect,
  type DueStatus,
  type MaintenanceAction,
  type MaintenanceSchedule,
  maintenanceTypeLabels,
  type ScheduleDue,
} from "@car/shared";
import { useEffect } from "react";
import { Link, useSearchParams } from "react-router";
import { capitalize, describeDue, DueBadge, formatInterval } from "../components/due";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatCurrency, formatDate, formatKm } from "../format";
import { isMaintenanceTab, loadMaintenanceTab, type MaintenanceTab, storeMaintenanceTab } from "../maintenanceTab";
import { useDefects, useMaintenanceActions, useScheduleDues, useSchedules } from "../queries";
import { useCurrentCar } from "../selectedCar";

const tabs: { id: MaintenanceTab; label: string; add: { to: string; label: string } }[] = [
  { id: "recurring", label: "Recurring", add: { to: "/maintenance/schedules/new", label: "Add recurring" } },
  { id: "defects", label: "Defects", add: { to: "/maintenance/defects/new", label: "Add defect" } },
  { id: "actions", label: "Actions", add: { to: "/maintenance/actions/new", label: "Add action" } },
];

export function MaintenancePage() {
  const { id } = useCurrentCar();
  const defects = useDefects(id);
  const actions = useMaintenanceActions(id);
  const schedules = useSchedules(id);
  const dues = useScheduleDues(id);
  const [searchParams, setSearchParams] = useSearchParams();

  // Without a tab in the URL (e.g. via the navigation), reopen the last used tab.
  const param = searchParams.get("tab");
  const current = isMaintenanceTab(param) ? param : loadMaintenanceTab();
  useEffect(() => storeMaintenanceTab(current), [current]);

  // Tab badges: recurring maintenance needing attention and open defects.
  const needsAttention = dues?.filter(({ schedule, due }) => schedule.active && due.status !== "ok") ?? [];
  const openDefects = defects.data?.filter((defect) => !defect.fixedDate).length ?? 0;
  const counts: Partial<Record<MaintenanceTab, { value: number; className: string }>> = {
    recurring: {
      value: needsAttention.length,
      className: needsAttention.some(({ due }) => due.status === "overdue") ? "badge-danger" : "badge-warning",
    },
    defects: { value: openDefects, className: "badge-warning" },
  };
  const add = tabs.find((tab) => tab.id === current)!.add;

  return (
    <>
      <PageHeader title="Maintenance">
        <Link to={add.to} className="button">
          {add.label}
        </Link>
      </PageHeader>

      <div className="segmented" role="tablist" aria-label="Maintenance">
        {tabs.map((tab) => {
          const count = counts[tab.id];
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              id={`tab-${tab.id}`}
              aria-selected={tab.id === current}
              aria-controls="maintenance-panel"
              onClick={() => setSearchParams({ tab: tab.id }, { replace: true })}
            >
              {tab.label}
              {count && count.value > 0 && <span className={`badge ${count.className}`}>{count.value}</span>}
            </button>
          );
        })}
      </div>

      <section id="maintenance-panel" role="tabpanel" aria-labelledby={`tab-${current}`}>
        {current === "recurring" &&
          (schedules.isError ? <LoadError error={schedules.error} /> : dues ? <ScheduleList dues={dues} /> : <Loading />)}
        {current === "defects" &&
          (defects.isPending ? (
            <Loading />
          ) : defects.isError ? (
            <LoadError error={defects.error} />
          ) : (
            <DefectList defects={defects.data} />
          ))}
        {current === "actions" &&
          (actions.isPending ? (
            <Loading />
          ) : actions.isError ? (
            <LoadError error={actions.error} />
          ) : (
            <ActionList actions={actions.data} />
          ))}
      </section>
    </>
  );
}

const statusOrder: Record<DueStatus, number> = { overdue: 0, dueSoon: 1, ok: 2 };

function ScheduleItems({ dues }: { dues: { schedule: MaintenanceSchedule; due: ScheduleDue }[] }) {
  return (
    <ul className="list card">
      {dues.map(({ schedule, due }) => (
        <li key={schedule.id}>
          <Link to={`/maintenance/schedules/${schedule.id}`} className="list-item">
            <div className="list-main">
              <strong>{schedule.name}</strong>
              <span className="muted">
                {formatInterval(schedule)}
                {schedule.lastAction && ` · last ${formatDate(schedule.lastAction.date)}`}
              </span>
              {schedule.active && <span className="muted">{capitalize(describeDue(due))}</span>}
            </div>
            <div className="list-side">
              {schedule.active ? <DueBadge status={due.status} /> : <span className="badge badge-type">Paused</span>}
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function ScheduleList({ dues }: { dues: { schedule: MaintenanceSchedule; due: ScheduleDue }[] }) {
  if (dues.length === 0) {
    return (
      <p className="muted card">
        No recurring maintenance yet. Add things like oil changes or timing belts to get a warning when they are due.
      </p>
    );
  }
  const active = dues
    .filter(({ schedule }) => schedule.active)
    .sort((a, b) => statusOrder[a.due.status] - statusOrder[b.due.status]);
  const paused = dues.filter(({ schedule }) => !schedule.active);

  return (
    <>
      {active.length > 0 && <ScheduleItems dues={active} />}
      {paused.length > 0 && (
        <details className="more">
          <summary>Paused ({paused.length})</summary>
          <ScheduleItems dues={paused} />
        </details>
      )}
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
                {action.schedules.length > 0 && (
                  <span className="muted">Recurring: {action.schedules.map((s) => s.name).join(", ")}</span>
                )}
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
