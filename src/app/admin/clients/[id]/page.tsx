"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { ArrowLeft, CheckCircle2, Circle, Copy, ExternalLink, FileText, Mail, Trash2 } from "lucide-react";
import { Requests } from "@/components/admin/requests";
import { Avatar } from "@/components/avatar";
import {
  Empty, Loading, Panel, Pill, clientName, daysUntil, fmtDate, fmtDateTime, moveStageLabel, selectCls, timeAgo, useAdmin, usd, visaLabel,
} from "@/components/admin/ui";
import { STAGES, admin, type ClientDetail, type Stage } from "@/lib/admin";
import { DEFAULTS, calculate } from "@/lib/cost-calc";
import { LOCATIONS, ACCOMMODATION, BEDROOMS } from "@/lib/cost-data";
import { buildJourney } from "@/lib/journey";
import { TOTAL as CHECKLIST_TOTAL } from "@/lib/pre-arrival";
import { CHECKLISTS, type VisaDoc } from "@/lib/visa-docs";
import { cn } from "@/lib/utils";

export default function ClientPage() {
  const { id } = useParams<{ id: string }>();
  const { user, staff } = useAdmin();
  const [d, setD] = useState<ClientDetail | null | undefined>(undefined);

  const load = useCallback(() => admin.getClient(id).then(setD), [id]);
  useEffect(() => {
    load();
  }, [load]);

  if (d === undefined) return <Loading />;
  if (d === null)
    return (
      <div className="rounded-xl bg-white p-10 text-center shadow-sm">
        <p className="text-brand-navy">This client doesn&apos;t exist or was deleted.</p>
        <Link href="/admin/clients" className="mt-4 inline-block text-sm text-primary hover:underline">
          Back to clients
        </Link>
      </div>
    );

  const c = d.client;
  const setPipeline = async (patch: { stage?: Stage; assigned_to?: string | null }) => {
    setD({ ...d, client: { ...c, ...patch } });
    const r = await admin.setPipeline(c.user_id, patch);
    if (r.error) {
      toast.error("Couldn't save: " + r.error);
      load();
    } else toast.success("Saved");
  };
  const copyEmail = () => {
    if (!c.email) return;
    navigator.clipboard?.writeText(c.email).then(() => toast.success("Email copied"));
  };

  return (
    <>
      <Link href="/admin/clients" className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-primary">
        <ArrowLeft className="h-4 w-4" /> All clients
      </Link>

      {/* Header */}
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <Avatar profile={c} email={c.email || ""} className="h-16 w-16 text-xl" />
            <div className="min-w-0">
              <h1 className="truncate text-2xl font-bold text-brand-navy">{clientName(c)}</h1>
              <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600">
                <span className="truncate">{c.email}</span>
                {c.email && (
                  <>
                    <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Mail className="h-3.5 w-3.5" /> Email
                    </a>
                    <button onClick={copyEmail} className="inline-flex items-center gap-1 text-primary hover:underline">
                      <Copy className="h-3.5 w-3.5" /> Copy
                    </button>
                  </>
                )}
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {c.onboarded_at ? (
                  <>
                    <Pill tone="bg-brand-tint text-primary ring-primary/20">{visaLabel(c.visa_type)}</Pill>
                    {c.destination_city && <Pill tone="bg-gray-50 text-gray-700 ring-gray-200">{c.destination_city}</Pill>}
                  </>
                ) : (
                  <Pill tone="bg-amber-50 text-amber-800 ring-amber-200">Hasn&apos;t finished onboarding</Pill>
                )}
                {!c.email_confirmed_at && <Pill tone="bg-amber-50 text-amber-800 ring-amber-200">Email unconfirmed</Pill>}
              </div>
              <p className="mt-3 text-xs text-gray-500">
                Signed up {fmtDateTime(c.created_at)} · Last sign-in {timeAgo(c.last_sign_in_at)}
              </p>
            </div>
          </div>
          <div className="grid w-full grid-cols-2 gap-3 lg:w-auto lg:min-w-[340px]">
            <label className="text-xs font-medium text-gray-500">
              Pipeline stage
              <select value={c.stage} onChange={(e) => setPipeline({ stage: e.target.value as Stage })} className={cn(selectCls, "mt-1 w-full")}>
                {STAGES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-medium text-gray-500">
              Owner
              <select
                value={c.assigned_to || ""}
                onChange={(e) => setPipeline({ assigned_to: e.target.value || null })}
                className={cn(selectCls, "mt-1 w-full")}
              >
                <option value="">Unassigned</option>
                {staff.map((s) => (
                  <option key={s.user_id} value={s.user_id}>
                    {s.full_name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <MoveProfile d={d} />
          <Documents d={d} />
          <Requests reqs={c.requests} onChange={load} />
        </div>
        <div className="space-y-6">
          <Notes d={d} meId={user.id} staffNames={new Map(staff.map((s) => [s.user_id, s.full_name]))} onChange={(notes) => setD({ ...d, notes })} />
          <Progress d={d} />
          <Budget d={d} />
        </div>
      </div>
    </>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-5 gap-3 py-2 text-sm">
      <dt className="col-span-2 text-gray-500">{label}</dt>
      <dd className="col-span-3 text-brand-navy">{children || "—"}</dd>
    </div>
  );
}

function MoveProfile({ d }: { d: ClientDetail }) {
  const c = d.client;
  const days = daysUntil(c.anticipated_move_date);
  return (
    <Panel title="Move profile">
      <dl className="grid grid-cols-1 divide-y divide-gray-100 sm:grid-cols-2 sm:gap-x-8 sm:divide-y-0">
        <div className="divide-y divide-gray-100">
          <Row label="Nationality">{c.nationality}</Row>
          <Row label="Lives in">{c.country_of_residence}</Row>
          <Row label="Visa route">{c.visa_type ? visaLabel(c.visa_type) : null}</Row>
          <Row label="Sponsor">{c.has_sponsor ? c.sponsor_type || "Yes" : c.has_sponsor === false ? "None yet" : null}</Row>
        </div>
        <div className="divide-y divide-gray-100">
          <Row label="Destination">{c.destination_city}</Row>
          <Row label="Stage">{c.move_stage ? moveStageLabel(c.move_stage) : null}</Row>
          <Row label={c.move_stage === "moved" ? "Arrived" : "Move date"}>
            {c.anticipated_move_date ? (
              <>
                {fmtDate(c.anticipated_move_date)}
                {days != null && days >= 0 && c.move_stage !== "moved" && <span className="text-gray-500"> · in {days} days</span>}
              </>
            ) : null}
          </Row>
          <Row label="Family">
            {d.dependentsList.length ? d.dependentsList.map((x) => x.full_name).join(", ") : c.onboarded_at ? "No dependents added" : null}
          </Row>
        </div>
      </dl>
    </Panel>
  );
}

function Documents({ d }: { d: ClientDetail }) {
  const c = d.client;
  const list = c.visa_type ? CHECKLISTS[c.visa_type] : undefined;
  const open = async (path: string) => {
    const url = await admin.fileUrl(path);
    if (url) window.open(url, "_blank", "noopener");
    else toast.error("File preview isn't available in demo mode.");
  };
  const applicants = [{ id: null as string | null, name: `${clientName(c)} (main applicant)`, docs: list?.docs || [] }].concat(
    d.dependentsList.map((x) => ({ id: x.id as string | null, name: x.full_name, docs: list?.dependentDocs || [] })),
  );
  const uploadable = (docs: VisaDoc[]) => docs.filter((x) => x.upload !== false);
  const required = applicants.reduce((n, a) => n + uploadable(a.docs).filter((x) => x.required).length, 0);
  const have = applicants.reduce(
    (n, a) => n + uploadable(a.docs).filter((x) => x.required && d.docsList.some((f) => f.doc_key === x.key && f.applicant_id === a.id)).length,
    0,
  );

  return (
    <Panel
      title={`Visa documents (${d.docsList.length} file${d.docsList.length === 1 ? "" : "s"})`}
      action={list && required > 0 && <span className="text-xs text-gray-500">{have} of {required} required uploaded</span>}
    >
      {!list ? (
        d.docsList.length ? (
          <FileList files={d.docsList} onOpen={open} />
        ) : (
          <Empty>{c.visa_type === "unsure" ? "Visa route not chosen yet, so there's no checklist." : "No documents uploaded."}</Empty>
        )
      ) : (
        <div className="space-y-6">
          {applicants.map((a) => (
            <div key={a.id || "main"}>
              {applicants.length > 1 && <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-500">{a.name}</p>}
              <ul className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {uploadable(a.docs).map((doc) => {
                  const files = d.docsList.filter((f) => f.doc_key === doc.key && f.applicant_id === a.id);
                  return (
                    <li key={doc.key} className="flex flex-col gap-2 px-3 py-2.5 sm:flex-row sm:items-start">
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {files.length ? (
                          <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-emerald-600" />
                        ) : (
                          <Circle className={cn("h-4 w-4 flex-shrink-0", doc.required ? "text-gray-300" : "text-gray-200")} />
                        )}
                        <span className={cn("text-sm", files.length ? "text-brand-navy" : "text-gray-500")}>
                          {doc.title}
                          {!doc.required && <span className="text-gray-400"> · optional</span>}
                        </span>
                      </div>
                      {files.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 pl-6 sm:pl-0">
                          {files.map((f) => (
                            <button
                              key={f.id}
                              onClick={() => open(f.file_path)}
                              title={`${f.file_name} · ${fmtDateTime(f.created_at)}`}
                              className="inline-flex max-w-[200px] items-center gap-1 rounded-md bg-gray-50 px-2 py-1 text-xs text-primary ring-1 ring-inset ring-gray-200 hover:bg-brand-tint"
                            >
                              <FileText className="h-3 w-3 flex-shrink-0" />
                              <span className="truncate">{f.file_name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Panel>
  );
}

function FileList({ files, onOpen }: { files: ClientDetail["docsList"]; onOpen: (p: string) => void }) {
  return (
    <ul className="space-y-1.5">
      {files.map((f) => (
        <li key={f.id}>
          <button onClick={() => onOpen(f.file_path)} className="inline-flex items-center gap-2 text-sm text-primary hover:underline">
            <FileText className="h-4 w-4" /> {f.file_name}
            <span className="text-xs text-gray-500">· {f.doc_key}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function Notes({ d, meId, staffNames, onChange }: { d: ClientDetail; meId: string; staffNames: Map<string, string>; onChange: (n: ClientDetail["notes"]) => void }) {
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const add = async () => {
    const text = body.trim();
    if (!text) return;
    setBusy(true);
    const r = await admin.addNote(d.client.user_id, text);
    setBusy(false);
    if (r.error || !r.note) return toast.error("Couldn't add the note: " + r.error);
    setBody("");
    onChange([r.note, ...d.notes]);
  };
  const remove = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const r = await admin.deleteNote(id);
    if (r.error) return toast.error(r.error);
    onChange(d.notes.filter((n) => n.id !== id));
  };
  return (
    <Panel title="Internal notes" action={<span className="text-xs text-gray-400">Only your team sees these</span>}>
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        onKeyDown={(e) => (e.metaKey || e.ctrlKey) && e.key === "Enter" && add()}
        rows={3}
        maxLength={5000}
        placeholder="Call summary, next step, anything the team should know..."
        className="w-full resize-y rounded-md border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
      />
      <div className="mt-2 flex justify-end">
        <button
          onClick={add}
          disabled={busy || !body.trim()}
          className="h-9 rounded-md bg-primary px-4 text-sm font-medium text-white hover:bg-primary/90 disabled:opacity-50"
        >
          {busy ? "Adding..." : "Add note"}
        </button>
      </div>
      {d.notes.length > 0 && (
        <ul className="mt-4 space-y-3 border-t border-gray-100 pt-4">
          {d.notes.map((n) => (
            <li key={n.id} className="group rounded-lg bg-gray-50 p-3">
              <p className="whitespace-pre-wrap text-sm text-brand-navy">{n.body}</p>
              <div className="mt-2 flex items-center justify-between text-xs text-gray-500">
                <span>
                  {(n.author_id && staffNames.get(n.author_id)) || "Team"} · {fmtDateTime(n.created_at)}
                </span>
                {n.author_id === meId && (
                  <button onClick={() => remove(n.id)} className="text-gray-400 opacity-0 hover:text-red-600 group-hover:opacity-100" aria-label="Delete note">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

function Meter({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total ? Math.min(100, Math.round((value / total) * 100)) : 0;
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-brand-navy">{label}</span>
        <span className="tabular-nums text-gray-600">
          {value} / {total}
        </span>
      </div>
      <div className="mt-1.5 h-2 rounded-full bg-gray-100">
        <div className="h-2 rounded-full bg-primary" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Progress({ d }: { d: ClientDetail }) {
  const c = d.client;
  const journeyTotal = useMemo(() => buildJourney(c.visa_type, c.anticipated_move_date).length, [c.visa_type, c.anticipated_move_date]);
  return (
    <Panel title="Progress in Navigator">
      <div className="space-y-4">
        <Meter label="Journey steps done" value={d.journeyIds.length} total={journeyTotal} />
        <Meter label="Pre-arrival checklist" value={d.checklistKeys.length} total={CHECKLIST_TOTAL} />
      </div>
    </Panel>
  );
}

function Budget({ d }: { d: ClientDetail }) {
  if (!d.cost) {
    return (
      <Panel title="Cost of living">
        <Empty>Hasn&apos;t used the calculator yet.</Empty>
      </Panel>
    );
  }
  const { total, groups } = calculate({ ...DEFAULTS, ...d.cost });
  const label = <T extends { value: string; label: string }>(list: T[], v?: string) => list.find((x) => x.value === v)?.label;
  const people = [d.cost.adults && `${d.cost.adults} adult${d.cost.adults === "1" ? "" : "s"}`, Number(d.cost.children) > 0 && `${d.cost.children} child${d.cost.children === "1" ? "" : "ren"}`]
    .filter(Boolean)
    .join(", ");
  return (
    <Panel title="Cost of living" action={<span className="text-xs text-gray-400">Saved {timeAgo(d.costUpdatedAt)}</span>}>
      <p className="text-xs uppercase tracking-wider text-gray-500">Estimated monthly budget</p>
      <p className="mt-1 text-3xl font-bold tabular-nums text-brand-navy">{usd(Math.round(total))}</p>
      <ul className="mt-3 space-y-1 text-sm text-gray-600">
        {label(LOCATIONS, d.cost.location) && <li>{label(LOCATIONS, d.cost.location)}</li>}
        {(label(BEDROOMS, d.cost.bedrooms) || label(ACCOMMODATION, d.cost.accommodation)) && (
          <li>{[label(BEDROOMS, d.cost.bedrooms), label(ACCOMMODATION, d.cost.accommodation)].filter(Boolean).join(" · ")}</li>
        )}
        {people && <li>{people}</li>}
      </ul>
      {total > 0 && (
        <details className="mt-3 text-sm">
          <summary className="cursor-pointer text-primary">Breakdown</summary>
          <ul className="mt-2 space-y-1">
            {groups
              .filter(([, v]) => v > 0)
              .map(([k, v]) => (
                <li key={k} className="flex justify-between text-gray-600">
                  <span>{k}</span>
                  <span className="tabular-nums">{usd(Math.round(v))}</span>
                </li>
              ))}
          </ul>
        </details>
      )}
      <Link href="/vietnam/cost-of-living" target="_blank" className="mt-3 inline-flex items-center gap-1 text-xs text-gray-500 hover:text-primary">
        Open the calculator <ExternalLink className="h-3 w-3" />
      </Link>
    </Panel>
  );
}
