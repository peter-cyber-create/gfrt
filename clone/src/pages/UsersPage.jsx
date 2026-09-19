import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LocalModal, { useLocalModal } from "../components/LocalModal";
import Pagination from "../components/Pagination";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import EmptyState from "../components/EmptyState";
import { DEMO_MODE } from "../data/mock";
import { useAuth } from "../auth/AuthContext";
import { departmentService, roleService, userService } from "../services/index.js";

const emptyForm = { name: "", email: "", password: "", roleId: "", departmentId: "" };

export default function UsersPage() {
  const { notify } = useOutletContext();
  const { user: currentUser, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState("All");
  const [status, setStatus] = useState("All");
  const [form, setForm] = useState(emptyForm);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const addModal = useLocalModal();
  const viewModal = useLocalModal();
  const editModal = useLocalModal();
  const pageSize = 6;

  async function refresh() {
    setRows(await userService.list({ query, role, status }));
  }

  useEffect(() => {
    roleService.list().then(setRoles).catch(() => setRoles([]));
    departmentService.list().then(setDepartments).catch(() => setDepartments([]));
  }, []);

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, role, status]);

  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);
  const roleNames = useMemo(() => [...new Set(roles.map((r) => r.name))], [roles]);

  function openAdd() {
    setForm({
      ...emptyForm,
      roleId: roles[0]?.id || "",
      departmentId: departments[0]?.id || "",
      password: "ChangeMe123!",
    });
    addModal.openModal();
  }

  async function saveUser(e) {
    e.preventDefault();
    if (!form.name || !form.email || !form.roleId) return;
    setSaving(true);
    try {
      await userService.create(form, currentUser?.name);
      addModal.closeModal();
      notify("User created.");
      setPage(1);
      refresh();
    } catch (err) {
      notify(err.message || "Unable to create user.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit(e) {
    e.preventDefault();
    setSaving(true);
    try {
      await userService.update(
        selected.id,
        {
          name: form.name,
          roleId: form.roleId || undefined,
          departmentId: form.departmentId || null,
        },
        currentUser?.name
      );
      editModal.closeModal();
      notify("User updated.");
      refresh();
    } catch (err) {
      notify(err.message || "Unable to update user.", "danger");
    } finally {
      setSaving(false);
    }
  }

  async function disableUser(u) {
    if (!DEMO_MODE && !can("user.manage")) return;
    try {
      await userService.disable(u.id, currentUser?.name);
      notify(`${u.name} disabled.`);
      refresh();
    } catch (err) {
      notify(err.message || "Unable to disable user.", "danger");
    }
  }

  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="User administration against the staging API."
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
                {roleNames.map((name) => (
                  <option key={name}>{name}</option>
                ))}
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
                        disabled={!can("user.manage")}
                        onClick={() => {
                          setSelected(u);
                          setForm({
                            name: u.name,
                            email: u.email,
                            password: "",
                            roleId: u.roleId || roles.find((r) => r.name === u.role)?.id || "",
                            departmentId: u.departmentId || "",
                          });
                          editModal.openModal();
                        }}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => disableUser(u)}
                        disabled={!can("user.manage") || u.status === "Disabled"}
                      >
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
            <button type="submit" form="userForm" className="btn btn-primary" disabled={saving}>
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
            <label htmlFor="userPassword">Temporary password</label>
            <input
              id="userPassword"
              type="text"
              className="form-control"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              required
              minLength={8}
            />
          </div>
          <div className="form-group">
            <label htmlFor="userRole">Role</label>
            <select id="userRole" className="form-control" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })} required>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="userDept">Department</label>
            <select id="userDept" className="form-control" value={form.departmentId} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
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
            <button type="submit" form="editUserForm" className="btn btn-primary" disabled={saving}>
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
            <input id="editEmail" type="email" className="form-control" value={form.email} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="editRole">Role</label>
            <select id="editRole" className="form-control" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group mb-0">
            <label htmlFor="editDept">Department</label>
            <select id="editDept" className="form-control" value={form.departmentId || ""} onChange={(e) => setForm({ ...form, departmentId: e.target.value })}>
              <option value="">—</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
        </form>
      </LocalModal>
    </div>
  );
}
