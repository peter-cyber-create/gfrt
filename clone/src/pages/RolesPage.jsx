import { useEffect, useState } from "react";
import LocalModal, { useLocalModal } from "../components/LocalModal";
import PageHeader from "../components/PageHeader";
import { roleService } from "../services/index.js";

export default function RolesPage() {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const details = useLocalModal();

  useEffect(() => {
    roleService.list().then(setRows);
  }, []);

  return (
    <div>
      <PageHeader title="Roles" subtitle="Role definitions and proposed permission summaries (not production-verified)." breadcrumb="Management / Roles" />

      <div className="row">
        {rows.map((role) => (
          <div className="col-md-6 col-xl-4 mb-3" key={role.id}>
            <div className="card h-100 role-card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h5 className="mb-0">{role.name}</h5>
                  <span className="badge badge-primary">{role.users} users</span>
                </div>
                <p className="text-muted small mb-3">{role.description}</p>
                <div className="mb-3">
                  {role.permissions.slice(0, 3).map((p) => (
                    <span className="badge badge-light border mr-1 mb-1" key={p}>
                      {p}
                    </span>
                  ))}
                  {role.permissions.length > 3 && (
                    <span className="badge badge-light border">+{role.permissions.length - 3}</span>
                  )}
                </div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setSelected(role);
                    details.openModal();
                  }}
                >
                  View details
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <LocalModal
        id="roleDetails"
        title={selected ? selected.name : "Role"}
        open={details.open}
        onClose={details.closeModal}
        footer={
          <button type="button" className="btn btn-secondary" onClick={details.closeModal}>
            Close
          </button>
        }
      >
        {selected && (
          <>
            <p>{selected.description}</p>
            <p className="small text-muted">
              Assigned users (demo): <strong>{selected.users}</strong>
            </p>
            <h6 className="mt-3">Permissions (proposed)</h6>
            <ul className="list-group list-group-flush">
              {selected.permissions.map((p) => (
                <li className="list-group-item px-0 d-flex align-items-center" key={p}>
                  <i className="fas fa-check text-success mr-2" />
                  <code className="small mb-0">{p}</code>
                </li>
              ))}
            </ul>
          </>
        )}
      </LocalModal>
    </div>
  );
}
