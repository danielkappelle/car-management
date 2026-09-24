import type { ReactNode } from "react";
import { Link } from "react-router";

export function PageHeader({
  title,
  back,
  children,
}: {
  title: string;
  /** Path of the parent page, shows a back link. */
  back?: string;
  /** Actions shown on the right. */
  children?: ReactNode;
}) {
  return (
    <div className="page-header">
      <div>
        {back && (
          <Link to={back} className="back-link">
            ‹ Back
          </Link>
        )}
        <h1>{title}</h1>
      </div>
      {children && <div className="page-actions">{children}</div>}
    </div>
  );
}
