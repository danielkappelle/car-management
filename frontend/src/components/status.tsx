export function Loading() {
  return <p className="muted center">Loading…</p>;
}

export function LoadError({ error }: { error: Error }) {
  return <p className="form-error">Could not load data: {error.message}</p>;
}
