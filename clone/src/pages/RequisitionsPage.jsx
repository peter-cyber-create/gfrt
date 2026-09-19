import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LocalModal, { useLocalModal } from "../components/LocalModal";
import Pagination from "../components/Pagination";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import StatusTimeline from "../components/StatusTimeline";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { STATUS_CODE_TO_LABEL } from "../data/config.js";
import { useAuth } from "../auth/AuthContext";
import { ALLOWED_TRANSITIONS } from "../domain/requisitionLifecycle.js";
import { departmentService, requisitionService } from "../services/index.js";

export default function RequisitionsPage() {
  const { notify } = useOutletContext();
  const { user, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [deptRecords, setDeptRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [sort, setSort] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const [createForm, setCreateForm] = useState({
    facility: "",
    district: "",
    departmentId: "",
    description: "",
    amountValue: "",
    itemDescription: "",
    itemQuantity: "1",
    itemUnit: "box",
    itemUnitCost: "0",
  });
  const [creating, setCreating] = useState(false);
  const details = useLocalModal();
  const createModal = useLocalModal();
  const pageSize = 6;

  useEffect(() => {
    departmentService
      .list()
      .then((list) => {
        setDeptRecords(list);
        setDepartments(list.map((d) => d.name));
      })
      .catch(() => {
        setDeptRecords([]);
        setDepartments([]);
      });
  }, []);

  async function refresh() {
    setLoading(true);
    setError("");
    try {
      const list = await requisitionService.list({ query, status, department, dateFrom, sort, sortDir });
      setRows(list);
    } catch (err) {
      setRows([]);
      setError(err.message || "Unable to load requisitions.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, status, department, dateFrom, sort, sortDir]);

  const pageRows = useMemo(() => rows.slice((page - 1) * pageSize, page * pageSize), [rows, page]);

  async function openDetails(row) {
    const full = await requisitionService.getById(row.id);
    setSelected(full || row);
    setNote("");
    details.openModal();
  }

  function openCreate() {
    setCreateForm({
      facility: "",
      district: "",
      departmentId: deptRecords[0]?.id || "",
      description: "",
      amountValue: "",
      itemDescription: "",
      itemQuantity: "1",
      itemUnit: "box",
      itemUnitCost: "0",
    });
    createModal.openModal();
  }

  async function saveCreate(e) {
    e.preventDefault();
    if (!can("requisition.create")) {
      notify("You do not have permission to create requisitions.", "danger");
      return;
    }
    const qty = Number(createForm.itemQuantity);
    const unitCost = Number(createForm.itemUnitCost);
    const amountValue = Number(createForm.amountValue);
    if (!createForm.facility || !createForm.district || !createForm.departmentId || !createForm.description) {
      notify("Please fill all required fields.", "danger");
      return;
    }
    if (!createForm.itemDescription || !Number.isFinite(qty) || qty < 1) {
      notify("At least one line item with quantity is required.", "danger");
      return;
    }
    setCreating(true);
    try {
      const created = await requisitionService.create({
        facility: createForm.facility,
        district: createForm.district,
        departmentId: createForm.departmentId,
        description: createForm.description,
        amountValue: Number.isFinite(amountValue) ? Math.max(0, Math.round(amountValue)) : Math.max(0, Math.round(qty * (unitCost || 0))),
        items: [
          {
            description: createForm.itemDescription,
            quantity: Math.round(qty),
            unit: createForm.itemUnit || "unit",
            unitCost: Number.isFinite(unitCost) ? Math.max(0, Math.round(unitCost)) : 0,
          },
        ],
      });
      createModal.closeModal();
      notify(`Requisition ${created?.number || "created"} saved as draft.`);
      setPage(1);
      await refresh();
      if (created) openDetails(created);
    } catch (err) {
      notify(err.message || "Unable to create requisition.", "danger");
    } finally {
      setCreating(false);
    }
  }

  function resetFilters() {
    setQuery("");
    setStatus("All");
    setDepartment("All");
    setDateFrom("");
    setPage(1);
  }

  function toggleSort(key) {
    if (sort === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(key);
      setSortDir("desc");
    }
  }

  async function applyTransition(toCode) {
    if (!selected) return;
    const result = await requisitionService.transition(selected.id, toCode, {
      actor: user?.name || "Demo User",
      note,
    });
    if (!result.ok) {
      notify(result.message, "danger");
      return;
    }
    setSelected(result.requisition);
    notify(`Status updated to ${STATUS_CODE_TO_LABEL[toCode] || toCode}.`);
    refresh();
  }

  const nextActions = selected ? ALLOWED_TRANSITIONS[selected.statusCode] || [] : [];

  return (
    <div data-testid="requisitions-page">
      <PageHeader
        title="Requisitions"
        subtitle="Operational requisitions loaded from the staging API."
        breadcrumb="Operations / Requisitions"
        actions={
          <button type="button" className="btn btn-primary btn-sm" disabled={!can("requisition.create")} onClick={openCreate}>
            <i className="fas fa-plus mr-1" aria-hidden="true" /> New Requisition
          </button>
        }
      />

      <div className="card mb-3">
        <div className="card-body py-3">
          <div className="form-row align-items-end">
            <div className="form-group col-md-3 mb-2">
              <label className="small text-muted mb-1" htmlFor="reqSearch">
                Search
              </label>
              <input
                id="reqSearch"
                className="form-control form-control-sm"
                placeholder="ID, facility, requester…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="form-group col-md-2 mb-2">
              <label className="small text-muted mb-1" htmlFor="reqStatus">
                Status
              </label>
              <select
                id="reqStatus"
                className="form-control form-control-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                <option>Draft</option>
                <option>Submitted</option>
                <option>Under Review</option>
                <option>Processing</option>
                <option>Approved</option>
                <option>Completed</option>
                <option>Rejected</option>
                <option>Cancelled</option>
              </select>
            </div>
            <div className="form-group col-md-2 mb-2">
              <label className="small text-muted mb-1" htmlFor="reqDept">
                Department
              </label>
              <select
                id="reqDept"
                className="form-control form-control-sm"
                value={department}
                onChange={(e) => {
                  setDepartment(e.target.value);
                  setPage(1);
                }}
              >
                <option>All</option>
                {departments.map((d) => (
                  <option key={d}>{d}</option>
                ))}
              </select>
            </div>
            <div className="form-group col-md-2 mb-2">
              <label className="small text-muted mb-1" htmlFor="reqFrom">
                Submitted from
              </label>
              <input
                id="reqFrom"
                type="date"
                className="form-control form-control-sm"
                value={dateFrom}
                onChange={(e) => {
                  setDateFrom(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <div className="form-group col-md-3 mb-2">
              <button type="button" className="btn btn-sm btn-outline-secondary mr-2" onClick={resetFilters}>
                Reset
              </button>
              <span className="small text-muted">{rows.length} results</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        {loading ? (
          <LoadingState label="Loading requisitions…" />
        ) : error ? (
          <div className="card-body">
            <div className="alert alert-danger mb-0" role="alert">
              {error}
            </div>
          </div>
        ) : (
          <>
            <div className="table-responsive">
              <table className="table table-hover mb-0" id="requisitionsTable">
                <thead>
                  <tr>
                    <th scope="col" className="sortable-th" onClick={() => toggleSort("id")}>
                      ID {sort === "id" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                    </th>
                    <th scope="col">Facility</th>
                    <th scope="col">District</th>
                    <th scope="col">Department</th>
                    <th scope="col" className="sortable-th" onClick={() => toggleSort("status")}>
                      Status
                    </th>
                    <th scope="col" className="sortable-th" onClick={() => toggleSort("amountValue")}>
                      Amount
                    </th>
                    <th scope="col" className="sortable-th" onClick={() => toggleSort("submitted")}>
                      Submitted
                    </th>
                    <th scope="col">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <EmptyState
                          title="No requisitions found"
                          message="Adjust filters or reset to see requisition records."
                          action={
                            <button type="button" className="btn btn-sm btn-outline-primary" onClick={resetFilters}>
                              Reset filters
                            </button>
                          }
                        />
                      </td>
                    </tr>
                  ) : (
                    pageRows.map((row) => (
                      <tr key={row.id} data-status-code={row.statusCode}>
                        <td className="small font-monospace">{row.id}</td>
                        <td>{row.facility}</td>
                        <td>{row.district}</td>
                        <td>{row.department}</td>
                        <td>
                          <StatusBadge status={row.status} statusCode={row.statusCode} />
                        </td>
                        <td>{row.amount}</td>
                        <td>{row.submitted}</td>
                        <td className="text-right text-nowrap">
                          <button type="button" className="btn btn-sm btn-outline-primary" onClick={() => openDetails(row)}>
                            View
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="card-footer d-flex justify-content-between align-items-center flex-wrap">
              <span className="small text-muted">
                Page {page} · {rows.length} total
              </span>
              <Pagination page={page} pageSize={pageSize} total={rows.length} onChange={setPage} />
            </div>
          </>
        )}
      </div>

      <LocalModal
        id="reqDetails"
        title={selected ? selected.id : "Requisition"}
        open={details.open}
        onClose={details.closeModal}
        size="modal-lg"
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={details.closeModal}>
              Close
            </button>
          </>
        }
      >
        {selected && (
          <div data-testid="requisition-detail">
            <div className="d-flex justify-content-between align-items-start flex-wrap mb-3">
              <div>
                <div className="detail-label">Status</div>
                <StatusBadge status={selected.status} statusCode={selected.statusCode} />
                <span className="small text-muted ml-2">({selected.statusCode})</span>
              </div>
              <div className="text-right small text-muted">
                <div>Submitted {selected.submitted}</div>
                <div>Required {selected.requiredDate || "—"}</div>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="detail-label">Facility</div>
                <div>{selected.facility}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-label">District</div>
                <div>{selected.district}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-label">Department</div>
                <div>{selected.department}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-label">Requester</div>
                <div>{selected.requester}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-label">Amount</div>
                <div>{selected.amount}</div>
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-label">Updated</div>
                <div>{selected.updated}</div>
              </div>
              <div className="col-12 mb-3">
                <div className="detail-label">Description</div>
                <div>{selected.description}</div>
              </div>
            </div>

            <div className="mb-3">
              <div className="detail-section-title">Items</div>
              <div className="table-responsive">
                <table className="table table-sm mb-0">
                  <thead>
                    <tr>
                      <th scope="col">Description</th>
                      <th scope="col">Qty</th>
                      <th scope="col">Unit</th>
                      <th scope="col">Est. value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(selected.items || []).map((item) => (
                      <tr key={item.id}>
                        <td>{item.description}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unit}</td>
                        <td>UGX {(item.unitCost || 0).toLocaleString("en-UG")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="row">
              <div className="col-md-6 mb-3">
                <div className="detail-section-title">Status timeline</div>
                <StatusTimeline history={selected.history || []} />
              </div>
              <div className="col-md-6 mb-3">
                <div className="detail-section-title">Approvals</div>
                {(selected.approvals || []).length === 0 ? (
                  <p className="small text-muted mb-0">No approval decisions yet.</p>
                ) : (
                  <ul className="list-unstyled mb-0">
                    {selected.approvals.map((a) => (
                      <li key={a.id} className="mb-2 small">
                        <strong>{a.decision}</strong> by {a.actor}
                        <div className="text-muted">{String(a.at).replace("T", " ").slice(0, 16)}</div>
                        {a.comment && <div>{a.comment}</div>}
                      </li>
                    ))}
                  </ul>
                )}
                <div className="detail-section-title mt-3">Comments</div>
                {(selected.comments || []).length === 0 ? (
                  <p className="small text-muted mb-0">No comments.</p>
                ) : (
                  <ul className="mb-0 pl-3">
                    {selected.comments.map((c) => (
                      <li key={c.id} className="small">
                        <strong>{c.actor}</strong>: {c.text}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>

            <div className="border-top pt-3">
              <div className="detail-section-title">Workflow actions</div>
              <p className="small text-muted">
                Server-enforced lifecycle transitions for <code>{selected.statusCode}</code>:
              </p>
              <div className="form-group">
                <label htmlFor="transitionNote" className="small">
                  Note (optional)
                </label>
                <input
                  id="transitionNote"
                  className="form-control form-control-sm"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Reason / comment for local transition"
                />
              </div>
              <div className="workflow-actions" data-testid="workflow-actions">
                {nextActions.length === 0 ? (
                  <span className="small text-muted">No further transitions from this status.</span>
                ) : (
                  nextActions.map((code) => (
                    <button
                      key={code}
                      type="button"
                      className="btn btn-sm btn-outline-primary"
                      onClick={() => applyTransition(code)}
                      disabled={
                        (code === "APPROVED" || code === "REJECTED") && !can("requisition.approve") && !can("requisition.reject")
                      }
                    >
                      → {STATUS_CODE_TO_LABEL[code] || code}
                    </button>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </LocalModal>

      <LocalModal
        id="createRequisition"
        title="New Requisition"
        open={createModal.open}
        onClose={createModal.closeModal}
        footer={
          <>
            <button type="button" className="btn btn-secondary" onClick={createModal.closeModal}>
              Cancel
            </button>
            <button type="submit" form="createRequisitionForm" className="btn btn-primary" disabled={creating}>
              {creating ? "Saving…" : "Create draft"}
            </button>
          </>
        }
      >
        <form id="createRequisitionForm" onSubmit={saveCreate}>
          <div className="form-row">
            <div className="form-group col-md-6">
              <label htmlFor="crFacility">Facility</label>
              <input
                id="crFacility"
                className="form-control"
                value={createForm.facility}
                onChange={(e) => setCreateForm({ ...createForm, facility: e.target.value })}
                required
              />
            </div>
            <div className="form-group col-md-6">
              <label htmlFor="crDistrict">District</label>
              <input
                id="crDistrict"
                className="form-control"
                value={createForm.district}
                onChange={(e) => setCreateForm({ ...createForm, district: e.target.value })}
                required
              />
            </div>
          </div>
          <div className="form-group">
            <label htmlFor="crDept">Department</label>
            <select
              id="crDept"
              className="form-control"
              value={createForm.departmentId}
              onChange={(e) => setCreateForm({ ...createForm, departmentId: e.target.value })}
              required
            >
              {deptRecords.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="crDesc">Description</label>
            <textarea
              id="crDesc"
              className="form-control"
              rows={2}
              value={createForm.description}
              onChange={(e) => setCreateForm({ ...createForm, description: e.target.value })}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="crAmount">Total amount (UGX)</label>
            <input
              id="crAmount"
              type="number"
              min="0"
              className="form-control"
              value={createForm.amountValue}
              onChange={(e) => setCreateForm({ ...createForm, amountValue: e.target.value })}
              placeholder="Optional — defaults to qty × unit cost"
            />
          </div>
          <div className="detail-section-title">Line item</div>
          <div className="form-row">
            <div className="form-group col-md-6">
              <label htmlFor="crItemDesc">Item description</label>
              <input
                id="crItemDesc"
                className="form-control"
                value={createForm.itemDescription}
                onChange={(e) => setCreateForm({ ...createForm, itemDescription: e.target.value })}
                required
              />
            </div>
            <div className="form-group col-md-2">
              <label htmlFor="crQty">Qty</label>
              <input
                id="crQty"
                type="number"
                min="1"
                className="form-control"
                value={createForm.itemQuantity}
                onChange={(e) => setCreateForm({ ...createForm, itemQuantity: e.target.value })}
                required
              />
            </div>
            <div className="form-group col-md-2">
              <label htmlFor="crUnit">Unit</label>
              <input
                id="crUnit"
                className="form-control"
                value={createForm.itemUnit}
                onChange={(e) => setCreateForm({ ...createForm, itemUnit: e.target.value })}
              />
            </div>
            <div className="form-group col-md-2">
              <label htmlFor="crCost">Unit cost</label>
              <input
                id="crCost"
                type="number"
                min="0"
                className="form-control"
                value={createForm.itemUnitCost}
                onChange={(e) => setCreateForm({ ...createForm, itemUnitCost: e.target.value })}
              />
            </div>
          </div>
        </form>
      </LocalModal>
    </div>
  );
}
