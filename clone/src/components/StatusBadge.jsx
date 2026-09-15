import { STATUS_CODE_TO_LABEL } from "../data/config.js";

export default function StatusBadge({ status, statusCode }) {
  const label = status || STATUS_CODE_TO_LABEL[statusCode] || statusCode || "—";
  const map = {
    Draft: "secondary",
    Submitted: "primary",
    Pending: "warning",
    Processing: "warning",
    "Under Review": "info",
    Approved: "success",
    Completed: "dark",
    Rejected: "danger",
    Cancelled: "secondary",
    Active: "success",
    Inactive: "secondary",
    Disabled: "danger",
  };
  const tone = map[label] || "secondary";
  return (
    <span className={`badge badge-soft badge-soft-${tone}`} title={statusCode || label}>
      {label}
    </span>
  );
}
