import { useEffect, useState } from "react";

export default function Toast({ message, variant = "success", onClose }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const t = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 180);
    }, 2800);
    return () => clearTimeout(t);
  }, [onClose]);

  return (
    <div className={`toast-local alert alert-${variant} shadow ${visible ? "show" : ""}`} role="status">
      <i
        className={`fas ${
          variant === "success" ? "fa-check-circle" : variant === "danger" ? "fa-exclamation-circle" : "fa-info-circle"
        } mr-2`}
        aria-hidden="true"
      />
      {message}
    </div>
  );
}
