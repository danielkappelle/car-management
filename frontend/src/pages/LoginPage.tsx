import { type FormEvent, useState } from "react";
import { Navigate, useLocation } from "react-router";
import { ApiError } from "../api";
import { useLogin, useMe } from "../queries";

export function LoginPage() {
  const me = useMe();
  const login = useLogin();
  const location = useLocation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const from = (location.state as { from?: string } | null)?.from ?? "/";
  if (me.data) {
    return <Navigate to={from} replace />;
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault();
    login.mutate({ username, password });
  };

  const error = login.error
    ? login.error instanceof ApiError && login.error.status === 429
      ? "Too many attempts, try again later"
      : login.error.message
    : null;

  return (
    <div className="login">
      <form className="card login-card" onSubmit={onSubmit}>
        <img src="/icon.svg" alt="" width={56} height={56} />
        <h1>Car management</h1>
        <label className="field">
          <span className="field-label">Username</span>
          <input
            autoComplete="username"
            autoCapitalize="none"
            value={username}
            onChange={(event) => setUsername(event.target.value)}
            required
          />
        </label>
        <label className="field">
          <span className="field-label">Password</span>
          <input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="button button-primary" disabled={login.isPending}>
          {login.isPending ? "Logging in…" : "Log in"}
        </button>
      </form>
    </div>
  );
}
