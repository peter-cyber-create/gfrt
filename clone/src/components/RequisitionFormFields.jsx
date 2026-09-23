import { formatUgx, lineTotalUgx, requisitionTotalUgx } from "../lib/money.js";

const emptyItem = () => ({
  description: "",
  quantity: "1",
  unit: "box",
  unitCost: "0",
});

export function emptyRequisitionForm(departmentId = "") {
  return {
    facility: "",
    district: "",
    departmentId,
    description: "",
    requiredAt: "",
    items: [emptyItem()],
  };
}

export function buildRequisitionPayload(form) {
  const items = (form.items || [])
    .map((it) => ({
      description: String(it.description || "").trim(),
      quantity: Math.trunc(Number(it.quantity)),
      unit: String(it.unit || "unit").trim() || "unit",
      unitCost: Math.max(0, Math.trunc(Number(it.unitCost) || 0)),
    }))
    .filter((it) => it.description && Number.isFinite(it.quantity) && it.quantity > 0);

  const payload = {
    facility: String(form.facility || "").trim(),
    district: String(form.district || "").trim(),
    departmentId: form.departmentId,
    description: String(form.description || "").trim(),
    items,
  };

  if (form.requiredAt) {
    // HTML date → ISO datetime for Zod datetime()
    payload.requiredAt = new Date(`${form.requiredAt}T12:00:00.000Z`).toISOString();
  }

  return payload;
}

export function validateRequisitionForm(form) {
  if (!form.facility?.trim()) return "Facility is required.";
  if (!form.district?.trim()) return "District is required.";
  if (!form.departmentId) return "Department is required.";
  if (!form.description?.trim()) return "Description / purpose is required.";
  const items = form.items || [];
  if (!items.length) return "At least one line item is required.";
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!String(it.description || "").trim()) return `Item ${i + 1}: description is required.`;
    const qty = Number(it.quantity);
    if (!Number.isFinite(qty) || qty < 1) return `Item ${i + 1}: quantity must be at least 1.`;
    const cost = Number(it.unitCost);
    if (!Number.isFinite(cost) || cost < 0) return `Item ${i + 1}: unit cost must be zero or greater.`;
  }
  return null;
}

/**
 * Multi-line-item requisition editor used by New Requisition (and draft edit).
 * Fields match the API/Prisma model — facility, district, department, description,
 * required date, line items — not an invented procurement schema.
 */
export default function RequisitionFormFields({ form, setForm, departments, formId = "createRequisitionForm" }) {
  const total = requisitionTotalUgx(
    (form.items || []).map((it) => ({
      quantity: Number(it.quantity),
      unitCost: Number(it.unitCost),
    }))
  );

  function updateItem(index, patch) {
    const items = form.items.map((it, i) => (i === index ? { ...it, ...patch } : it));
    setForm({ ...form, items });
  }

  function addItem() {
    setForm({ ...form, items: [...form.items, emptyItem()] });
  }

  function removeItem(index) {
    if (form.items.length <= 1) return;
    setForm({ ...form, items: form.items.filter((_, i) => i !== index) });
  }

  return (
    <div id={formId} data-testid="requisition-form-fields">
      <div className="form-row">
        <div className="form-group col-md-6">
          <label htmlFor="crFacility">Facility</label>
          <input
            id="crFacility"
            className="form-control"
            value={form.facility}
            onChange={(e) => setForm({ ...form, facility: e.target.value })}
            required
          />
        </div>
        <div className="form-group col-md-6">
          <label htmlFor="crDistrict">District</label>
          <input
            id="crDistrict"
            className="form-control"
            value={form.district}
            onChange={(e) => setForm({ ...form, district: e.target.value })}
            required
          />
        </div>
      </div>
      <div className="form-row">
        <div className="form-group col-md-6">
          <label htmlFor="crDept">Department</label>
          <select
            id="crDept"
            className="form-control"
            value={form.departmentId}
            onChange={(e) => setForm({ ...form, departmentId: e.target.value })}
            required
          >
            <option value="">Select department</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
        <div className="form-group col-md-6">
          <label htmlFor="crRequired">Required date</label>
          <input
            id="crRequired"
            type="date"
            className="form-control"
            value={form.requiredAt}
            onChange={(e) => setForm({ ...form, requiredAt: e.target.value })}
          />
        </div>
      </div>
      <div className="form-group">
        <label htmlFor="crDesc">Description / purpose</label>
        <textarea
          id="crDesc"
          className="form-control"
          rows={3}
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          required
        />
      </div>

      <div className="d-flex justify-content-between align-items-center mb-2">
        <div className="detail-section-title mb-0">Line items</div>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={addItem} data-testid="add-line-item">
          Add item
        </button>
      </div>

      <div className="table-responsive mb-2">
        <table className="table table-sm" data-testid="line-items-table">
          <thead>
            <tr>
              <th>Description</th>
              <th style={{ width: 80 }}>Qty</th>
              <th style={{ width: 90 }}>Unit</th>
              <th style={{ width: 120 }}>Unit cost</th>
              <th style={{ width: 120 }}>Line total</th>
              <th style={{ width: 70 }} />
            </tr>
          </thead>
          <tbody>
            {form.items.map((item, index) => (
              <tr key={index}>
                <td>
                  <input
                    className="form-control form-control-sm"
                    aria-label={`Item ${index + 1} description`}
                    value={item.description}
                    onChange={(e) => updateItem(index, { description: e.target.value })}
                    required
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="1"
                    className="form-control form-control-sm"
                    aria-label={`Item ${index + 1} quantity`}
                    value={item.quantity}
                    onChange={(e) => updateItem(index, { quantity: e.target.value })}
                    required
                  />
                </td>
                <td>
                  <input
                    className="form-control form-control-sm"
                    aria-label={`Item ${index + 1} unit`}
                    value={item.unit}
                    onChange={(e) => updateItem(index, { unit: e.target.value })}
                  />
                </td>
                <td>
                  <input
                    type="number"
                    min="0"
                    className="form-control form-control-sm"
                    aria-label={`Item ${index + 1} unit cost`}
                    value={item.unitCost}
                    onChange={(e) => updateItem(index, { unitCost: e.target.value })}
                  />
                </td>
                <td className="small align-middle">
                  {formatUgx(lineTotalUgx({ quantity: Number(item.quantity), unitCost: Number(item.unitCost) }))}
                </td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline-danger"
                    disabled={form.items.length <= 1}
                    onClick={() => removeItem(index)}
                    aria-label={`Remove item ${index + 1}`}
                  >
                    Remove
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th colSpan={4} className="text-right">
                Total
              </th>
              <th data-testid="requisition-form-total">{formatUgx(total)}</th>
              <th />
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="small text-muted mb-0">Totals are recalculated on the server from quantity × unit cost (UGX).</p>
    </div>
  );
}
