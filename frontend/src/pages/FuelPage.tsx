import { type Consumption, computeFuelStats, type FuelUplift } from "@car/shared";
import { Link } from "react-router";
import { PageHeader } from "../components/PageHeader";
import { LoadError, Loading } from "../components/status";
import { formatCurrency, formatDate, formatKm, formatNumber } from "../format";
import { useFuelUplifts } from "../queries";
import { useCurrentCar } from "../selectedCar";

export function ConsumptionText({ consumption }: { consumption: Consumption }) {
  return (
    <>
      {formatNumber(consumption.litersPer100Km, 1)} l/100km
      <span className="muted"> · 1:{formatNumber(consumption.kmPerLiter, 1)}</span>
    </>
  );
}

export function FuelPage() {
  const { id } = useCurrentCar();
  const uplifts = useFuelUplifts(id);

  return (
    <>
      <PageHeader title="Fuel">
        <Link to="/fuel/new" className="button button-primary">
          Add fuel
        </Link>
      </PageHeader>
      {uplifts.isPending ? (
        <Loading />
      ) : uplifts.isError ? (
        <LoadError error={uplifts.error} />
      ) : uplifts.data.length === 0 ? (
        <div className="empty-state">
          <p className="muted">No fuel uplifts yet.</p>
          <Link to="/fuel/new" className="button button-primary">
            Add your first uplift
          </Link>
        </div>
      ) : (
        <FuelOverview uplifts={uplifts.data} />
      )}
    </>
  );
}

function FuelOverview({ uplifts }: { uplifts: FuelUplift[] }) {
  const { entries, summary } = computeFuelStats(uplifts);

  return (
    <>
      <div className="stats">
        <div className="stat">
          <span className="stat-label">Avg. consumption</span>
          <span className="stat-value">
            {summary.averageConsumption ? formatNumber(summary.averageConsumption.litersPer100Km, 1) : "—"}
            <small> l/100km</small>
          </span>
          {summary.averageConsumption && (
            <span className="stat-sub">1:{formatNumber(summary.averageConsumption.kmPerLiter, 1)}</span>
          )}
        </div>
        <div className="stat">
          <span className="stat-label">Avg. price</span>
          <span className="stat-value">
            {summary.averagePricePerLiter ? formatCurrency(summary.averagePricePerLiter) : "—"}
            <small> /l</small>
          </span>
        </div>
        <div className="stat">
          <span className="stat-label">Total spent</span>
          <span className="stat-value">{formatCurrency(summary.totalSpent)}</span>
          <span className="stat-sub">{summary.count} uplifts</span>
        </div>
        <div className="stat">
          <span className="stat-label">Total fuel</span>
          <span className="stat-value">
            {formatNumber(summary.totalLiters)}
            <small> l</small>
          </span>
        </div>
      </div>

      <ul className="list card">
        {uplifts.map((uplift) => {
          const stats = entries.get(uplift.id)!;
          return (
            <li key={uplift.id}>
              <Link to={`/fuel/${uplift.id}`} className="list-item">
                <div className="list-main">
                  <strong>{formatDate(uplift.date)}</strong>
                  <span className="muted">
                    {formatKm(uplift.odo)}
                    {stats.distance !== null && ` · +${formatKm(stats.distance)}`}
                  </span>
                  <span>
                    {stats.consumption ? (
                      <ConsumptionText consumption={stats.consumption} />
                    ) : (
                      <span className="muted">
                        {!uplift.fullTank ? "Partial fill" : uplift.missedPrevious ? "After missed uplift" : "—"}
                      </span>
                    )}
                  </span>
                </div>
                <div className="list-side">
                  <strong>{formatCurrency(uplift.totalPrice)}</strong>
                  <span>{formatNumber(uplift.volume, 2)} l</span>
                  <span className="muted">{formatCurrency(stats.pricePerLiter)}/l</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </>
  );
}
