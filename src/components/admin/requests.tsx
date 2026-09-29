"use client";
import { useState } from "react";
import { toast } from "sonner";
import { Empty, Panel, StatusPill, fmtDateTime, selectCls, serviceName, usd } from "@/components/admin/ui";
import { REQUEST_STATUSES, admin, type AdminRequest, type RequestStatus } from "@/lib/admin";

export function Requests({ reqs, onChange }: { reqs: AdminRequest[]; onChange: () => void }) {
  return (
    <Panel title={`Service requests (${reqs.length})`} bodyClass="p-0">
      {reqs.length === 0 ? (
        <Empty>No services requested yet.</Empty>
      ) : (
        <ul className="divide-y divide-gray-100">
          {reqs.map((r) => (
            <RequestRow key={r.id} r={r} onChange={onChange} />
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function RequestRow({ r, onChange, client }: { r: AdminRequest; onChange: () => void; client?: React.ReactNode }) {
  const [note, setNote] = useState(r.note || "");
  const [status, setStatus] = useState<RequestStatus>(r.status);
  const save = async (patch: { status?: RequestStatus; note?: string | null }) => {
    const res = await admin.updateRequest(r.id, patch);
    if (res.error) toast.error("Couldn't save: " + res.error);
    else {
      toast.success("Request updated");
      onChange();
    }
  };
  return (
    <li className="space-y-3 px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-brand-navy">{serviceName(r.service)}</p>
          {client}
          <p className="mt-0.5 text-xs text-gray-500">
            {usd(r.amount_usd)}
            {r.dependents > 0 && ` · includes ${r.dependents} dependent${r.dependents === 1 ? "" : "s"}`} · requested {fmtDateTime(r.created_at)}
            {r.stripe_session_id && " · paid by card"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <StatusPill status={status} />
          <select
            value={status}
            onChange={(e) => {
              const v = e.target.value as RequestStatus;
              setStatus(v);
              save({ status: v });
            }}
            className={selectCls}
            aria-label="Change status"
          >
            {REQUEST_STATUSES.map((s) => (
              <option key={s.value} value={s.value}>
                {s.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        onBlur={() => note !== (r.note || "") && save({ note: note.trim() || null })}
        rows={2}
        placeholder="Internal note for this request (saves when you click away)"
        className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
    </li>
  );
}

