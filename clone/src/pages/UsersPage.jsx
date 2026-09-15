import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LocalModal, { useLocalModal } from "../components/LocalModal";
import Pagination from "../components/Pagination";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { DEMO_MODE } from "../data/mock";
import { useAuth } from "../auth/AuthContext";
import { userService } from "../services/index.js";

export default function UsersPage() {
  const { notify } = useOutletContext();
  const { user: currentUser, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");
  const [form, setForm] = useState({ name: "", email: "", role: "Facility", department: "Health Systems" });
  const [selected, setSelected] = useState(null);
  const addModal = useLocalModal();
  const viewModal = useLocalModal();
  const editModal = useLocalModal();
  const pageSize = 6;

  async function refresh() {
    setRows(await userService.list({ query, role, status }));
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role, status]);

  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

  function openAdd() {
    setForm({ name: "", email: "", role: "Facility", department: "Health Systems" });
    addModal.openModal();
  }

  async function saveUser(e) {
    e.preventDefault();
    if (!form.name || !form.email) return;
    await userService.create(form, currentUser?.name);
    addModal.closeModal();
    notify("User saved locally (presentation only).");
    setPage(1);
    refresh();
  }

  async function saveEdit(e) {
    e.preventDefault();
    await userService.update(selected.id, form, currentUser?.name);
    editModal.closeModal();
    notify("User updated locally.");
    refresh();
  }

  async function disableUser(u) {
    if (!DEMO_MODE && !can("user.manage")) return;
    await userService.disable(u.id, currentUser?.name);
    notify(`${u.name} disabled locally.`);
    refresh();
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Administration of demonstration user accounts."
        breadcrumb="Management / Users"
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={openAdd} disabled={!can("user.manage")}>
            <i className="fas fa-user-plus mr-1" /> Add User
          </button>
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="form-row">
            <div className="form-group col-md-4 mb-2">
              <input
                id="userSearch"
                className="form-control form-control-sm"
                placeholder="Search name or email…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="form-group col-md-3 mb-2">
              <select
                id="userRoleFilter"
                className="form-control form-control-sm"
                value={role}
                onChange={(e) => {
                  setRole(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                <option>Administrator</option>
                <option>District</option>
                <option>Facility</option>
                <option>Reviewer</option>
                <option>Viewer</option>
              </select>
            </div>
            <div className="form-group col-md-3 mb-2">
              <select
                id="userStatusFilter"
                className="form-control form-control-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                <option>Active</option>
                <option>Inactive</option>
                <option>Disabled</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="table-responsive">
          <table className="table table-striped mb-0" id="usersTable">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
                <th>Last activity</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState title="No users found" message="Try a different search or filter." />
                  </td>
                </tr>
              ) : (
                pageRows.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.department}</td>
                    <td>
                      <StatusBadge status={u.status} />
                    </td>
                    <td className="small">{u.lastActivity}</td>
                    <td className="text-right text-nowrap">
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-secondary mr-1"
                        onClick={() => {
                          setSelected(u);
                          viewModal.openModal();
                        }}
                      >
                        View
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-primary mr-1"
                        onClick={() => {
                          setSelected(u);
                          setForm({ name: u.name, email: u.email, role: u.role, department: u.department });
                          editModal.openModal();
                        }}
                      >
                        Edit
                      </button>
                      <button type="button" className="btn btn-sm btn-outline-danger" onClick={() => disableUser(u)} disabled={u.status === "Disabled"}>
                        Disable
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="card-footer d-flex justify-content-between align-items-center">
          <span className="small text-muted">{rows.length} users</span>
          <Pagination page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />
        </div>
      </div>

      <LocalModal
        id="addUser"
        title="Add User"
        open={addModal.open}
        onClose={addModal.closeModal}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={addModal.closeModal}>
              Cancel
            </button>
            <button type="submit" form="userForm" className="btn btn-primary">
              Save
            </button>
          </>
        }
      >
        <form id="userForm" onSubmit={saveUser}>
          <div className="form-group">
            <label htmlFor="userName">Name</label>
            <input id="userName" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="userEmail">Email</label>
            <input id="userEmail" type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="userRole">Role</label>
            <select id="userRole" className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Administrator</option>
              <option>District</option>
              <option>Facility</option>
              <option>Reviewer</option>
              <option>Viewer</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="userDept">Department</label>
            <input id="userDept" className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </form>
      </LocalModal>

      <LocalModal id="viewUser" title="User details" open={viewModal.open} onClose={viewModal.closeModal} footer={<button type="button" className="btn btn-secondary" onClick={viewModal.closeModal}>Close</button>}>
        {selected && (
          <dl className="row mb-0">
            <dt className="col-sm-4">Name</dt>
            <dd className="col-sm-8">{selected.name}</dd>
            <dt className="col-sm-4">Email</dt>
            <dd className="col-sm-8">{selected.email}</dd>
            <dt className="col-sm-4">Role</dt>
            <dd className="col-sm-8">{selected.role}</dd>
            <dt className="col-sm-4">Department</dt>
            <dd className="col-sm-8">{selected.department}</dd>
            <dt className="col-sm-4">Status</dt>
            <dd className="col-sm-8">
              <StatusBadge status={selected.status} />
            </dd>
            <dt className="col-sm-4">Last activity</dt>
            <dd className="col-sm-8">{selected.lastActivity}</dd>
          </dl>
        )}
      </LocalModal>

      <LocalModal
        id="editUser"
        title="Edit User"
        open={editModal.open}
        onClose={editModal.closeModal}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={editModal.closeModal}>
              Cancel
            </button>
            <button type="submit" form="editUserForm" className="btn btn-primary">
              Save
            </button>
          </>
        }
      >
        <form id="editUserForm" onSubmit={saveEdit}>
          <div className="form-group">
            <label htmlFor="editName">Name</label>
            <input id="editName" className="form-control" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="editEmail">Email</label>
            <input id="editEmail" type="email" className="form-control" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
          </div>
          <div className="form-group">
            <label htmlFor="editRole">Role</label>
            <select id="editRole" className="form-control" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
              <option>Administrator</option>
              <option>District</option>
              <option>Facility</option>
              <option>Reviewer</option>
              <option>Viewer</option>
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="editDept">Department</label>
            <input id="editDept" className="form-control" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })} />
          </div>
        </form>
      </LocalModal>
    </div>
  );
}
