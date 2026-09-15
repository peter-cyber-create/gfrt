import { useEffect, useMemo, useState } from "react";
import { useOutletContext } from "react-router-dom";
import LocalModal, { useLocalModal } from "../components/LocalModal";
import Pagination from "../components/Pagination";
import PageHeader from "../components/PageHeader";
import StatusBadge from "../components/StatusBadge";
import StatusTimeline from "../components/StatusTimeline";
import EmptyState from "../components/EmptyState";
import LoadingState from "../components/LoadingState";
import { DEPARTMENTS } from "../data/mock";
import { STATUS_CODE_TO_LABEL } from "../data/config.js";
import { useAuth } from "../auth/AuthContext";
import { ALLOWED_TRANSITIONS } from "../domain/requisitionLifecycle.js";
import { requisitionService } from "../services/index.js";

export default function RequisitionsPage() {
  const { notify } = useOutletContext();
  const { user, can } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [department, setDepartment] = useState("All");
  const [dateFrom, setDateFrom] = useState("");
  const [sort, setSort] = useState("updated");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null);
  const [note, setNote] = useState("");
  const details = useLocalModal();
  const pageSize = 6;

  async function refresh() {
    setLoading(true);
    try {
      const list = await requisitionService.list({ query, status, department, dateFrom, sort, sortDir });
      setRows(list);
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
    notify(`Local status updated to ${STATUS_CODE_TO_LABEL[toCode] || toCode}.`);
    refresh();
  }

  const nextActions = selected ? ALLOWED_TRANSITIONS[selected.statusCode] || [] : [];

  return (
    <div data-testid="requisitions-page">
      <PageHeader
        title="Requisitions"
        subtitle="Core operational module — local demo workflow (not production-verified)."
        breadcrumb="Operations / Requisitions"
        actions={
          <button
            type="button"
            className="btn btn-primary btn-sm"
            disabled={!can("requisition.create")}
            onClick={() => notify("Create is disabled in presentation mode.", "info")}
          >
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
                <option>Submitted</option>
                <option>Under Review</option>
                <option>Processing</option>
                <option>Approved</option>
                <option>Completed</option>
                <option>Rejected</option>
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
                {DEPARTMENTS.map((d) => (
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
                          message="Adjust filters or reset to see demonstration records."
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
              <div className="detail-section-title">Local workflow actions (demo)</div>
              <p className="small text-muted">
                Proposed lifecycle only — does not change production. Available next steps for{" "}
                <code>{selected.statusCode}</code>:
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
    </div>
  );
}
