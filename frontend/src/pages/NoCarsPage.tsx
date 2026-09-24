import { Link } from "react-router";

export function NoCarsPage() {
  return (
    <div className="empty-state">
      <img src="/icon.svg" alt="" width={64} height={64} />
      <h1>Welcome</h1>
      <p className="muted">Add your first car to start tracking fuel and maintenance.</p>
      <Link to="/cars/new" className="button button-primary">
        Add a car
      </Link>
    </div>
  );
}
