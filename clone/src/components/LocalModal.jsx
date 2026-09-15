import { useEffect, useState } from "react";

export default function LocalModal({ id, title, children, open, onClose, footer, size = "" }) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.classList.add("modal-open");
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.classList.remove("modal-open");
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div className="modal-backdrop fade show" onClick={onClose} />
      <div className="modal fade show d-block" id={id} tabIndex={-1} role="dialog" aria-modal="true">
        <div className={`modal-dialog modal-dialog-scrollable ${size}`} role="document">
          <div className="modal-content animate-modal">
            <div className="modal-header">
              <h5 className="modal-title">{title}</h5>
              <button type="button" className="close" aria-label="Close" onClick={onClose}>
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">{children}</div>
            {footer && <div className="modal-footer">{footer}</div>}
          </div>
        </div>
      </div>
    </>
  );
}

export function useLocalModal(initial = false) {
  const [open, setOpen] = useState(initial);
  return {
    open,
    openModal: () => setOpen(true),
    closeModal: () => setOpen(false),
  };
}
