"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  AlertCircle, Calendar as CalendarIcon, Check, CheckCircle2, ExternalLink, Eye, FileText, Info, Minus, Pencil, Plus,
  Shield, Trash2, Upload, X,
} from "lucide-react";
import { toast } from "sonner";
import { backend, type Dependent, type ServiceRequest, type UploadedDoc } from "@/lib/backend";
import { readCheckoutReturn, startCheckout } from "@/lib/checkout";
import { formatLongDate, VISA_TYPES } from "@/lib/journey";
import { cn } from "@/lib/utils";
import {
  ACCEPT_ATTR, ACCEPTED, CHECKLISTS, CITIES, MAX_FILE_BYTES, MAX_FILES_PER_DOC, REVIEW, type VisaDoc,
} from "@/lib/visa-docs";
import { usePortal } from "@/components/portal-context";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input, Select } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

const MAIN = "main";
const REVIEW_SERVICE = "visa_review" as const;

export default function VisaPage() {
  const { user, profile, saveProfile } = usePortal();
  const visa = profile?.visa_type || "";
  const checklist = CHECKLISTS[visa];

  const [deps, setDeps] = useState<Dependent[]>([]);
  const [docs, setDocs] = useState<UploadedDoc[]>([]);
  const [requests, setRequests] = useState<ServiceRequest[]>([]);
  const [active, setActive] = useState<string>(MAIN);
  const [editing, setEditing] = useState<string | null>(null);

  useEffect(() => {
    readCheckoutReturn();
    Promise.all([backend.listDependents(user.id), backend.listDocs(user.id), backend.listRequests(user.id)]).then(
      ([d, f, r]) => {
        setDeps(d);
        setDocs(f);
        setRequests(r);
      },
    );
  }, [user.id]);

  const review = requests.find((r) => r.service === REVIEW_SERVICE && r.status !== "cancelled");
  const locked = !!review;

  const applicants = useMemo(
    () => [
      { id: MAIN, label: `Main Applicant${profile?.first_name ? ` (${profile.first_name})` : ""}` },
      ...deps.map((d) => ({ id: d.id, label: d.full_name })),
    ],
    [deps, profile?.first_name],
  );

  if (!checklist) return <ChooseRoute onPick={(v) => saveProfile({ visa_type: v })} />;

  const listFor = (applicant: string) => (applicant === MAIN ? checklist.docs : checklist.dependentDocs);
  const filesFor = (applicant: string, key: string) =>
    docs.filter((d) => (d.applicant_id || MAIN) === applicant && d.doc_key === key);

  const uploadable = applicants.flatMap((a) => listFor(a.id).filter((d) => d.upload !== false).map((d) => [a.id, d.key] as const));
  const complete = uploadable.filter(([a, k]) => filesFor(a, k).length > 0).length;

  const upload = async (applicant: string, doc: VisaDoc, files: File[]) => {
    const room = MAX_FILES_PER_DOC - filesFor(applicant, doc.key).length;
    if (files.length > room) {
      toast.error(`You can upload ${room} more file${room === 1 ? "" : "s"} for this document.`);
      files = files.slice(0, room);
    }
    for (const f of files) {
      if (!ACCEPTED.includes(f.type)) {
        toast.error(`${f.name}: only PDF, JPG, JPEG and PNG files are accepted.`);
        continue;
      }
      if (f.size > MAX_FILE_BYTES) {
        toast.error(`${f.name} is larger than 4MB.`);
        continue;
      }
      const res = await backend.uploadDoc(user.id, applicant === MAIN ? null : applicant, doc.key, f);
      if (res.error || !res.doc) toast.error(`${f.name}: ${res.error || "upload failed"}`);
      else setDocs((cur) => [...cur, res.doc!]);
    }
  };

  const remove = async (d: UploadedDoc) => {
    await backend.removeDoc(user.id, d);
    setDocs((cur) => cur.filter((x) => x.id !== d.id));
  };

  const view = async (d: UploadedDoc) => {
    const url = await backend.docUrl(d);
    if (url) window.open(url, "_blank", "noopener");
    else toast("Preview isn't available in demo mode after a page reload.");
  };

  const addDependent = async () => {
    const d = await backend.addDependent(user.id, `Dependent ${deps.length + 1}`);
    if (!d) return toast.error("Couldn't add a dependent. Try again.");
    setDeps((cur) => [...cur, d]);
    setActive(d.id);
    setEditing(d.id);
  };

  const rename = async (id: string, name: string) => {
    setEditing(null);
    const clean = name.trim();
    if (!clean) return;
    if (id === MAIN) await saveProfile({ first_name: clean });
    else {
      await backend.renameDependent(user.id, id, clean);
      setDeps((cur) => cur.map((d) => (d.id === id ? { ...d, full_name: clean } : d)));
    }
  };

  const removeDependent = async (id: string) => {
    if (!window.confirm("Remove this dependent and their uploaded documents?")) return;
    await backend.removeDependent(user.id, id);
    setDeps((cur) => cur.filter((d) => d.id !== id));
    setDocs((cur) => cur.filter((d) => d.applicant_id !== id));
    setActive(MAIN);
    setEditing(null);
  };

  const list = listFor(active);

  return (
    <div className="space-y-8">
      <Header title={checklist.title} subtitle={checklist.subtitle} />

      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <StatCard title="Document Progress">
          <p className="text-3xl text-primary">
            {complete}/{uploadable.length}
          </p>
          <p className="text-sm text-brand-navy">Documents Complete</p>
        </StatCard>
        <MoveDateCard />
        <CityCard />
      </div>

      <SecurityNote />

      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="space-y-3">
            <div className="inline-flex flex-wrap items-center gap-1 rounded-md bg-muted p-1 text-muted-foreground">
              {applicants.map((a) =>
                editing === a.id ? (
                  <RenameInput
                    key={a.id}
                    initial={a.id === MAIN ? profile?.first_name || "" : a.label}
                    onDone={(v) => rename(a.id, v)}
                    onRemove={a.id === MAIN || locked ? undefined : () => removeDependent(a.id)}
                  />
                ) : (
                  <div
                    key={a.id}
                    className={cn(
                      "inline-flex items-center gap-2 rounded-sm px-3 py-1.5 text-sm font-medium transition-all",
                      active === a.id ? "bg-background text-foreground shadow-sm" : "hover:text-foreground",
                    )}
                  >
                    <button type="button" onClick={() => setActive(a.id)}>
                      {a.label}
                    </button>
                    <button type="button" aria-label={`Rename ${a.label}`} onClick={() => { setActive(a.id); setEditing(a.id); }}>
                      <Pencil className="h-3.5 w-3.5 opacity-60 hover:opacity-100" />
                    </button>
                  </div>
                ),
              )}
            </div>
            {!locked && (
              <div>
                <Button variant="outline" size="sm" onClick={addDependent} className="gap-2">
                  <Plus className="h-4 w-4" /> Add Dependent
                </Button>
              </div>
            )}
          </div>

          {locked && (
            <div className="flex items-start gap-3 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
              <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Your documents were submitted for expert review on {formatLongDate(new Date(review!.created_at))}. To change a
                document, reply to our email or contact us.
              </span>
            </div>
          )}

          {list.map((doc, i) => (
            <DocCard
              key={`${active}-${doc.key}`}
              index={i + 1}
              doc={doc}
              files={filesFor(active, doc.key)}
              locked={locked}
              onUpload={(files) => upload(active, doc, files)}
              onRemove={remove}
              onView={view}
            />
          ))}

          <p className="text-caption text-gray-600">
            Vietnamese immigration rules change often. This checklist reflects the rules as we understand them in 2026;
            always confirm the current requirements before you apply.
          </p>
        </div>

        <ReviewCard
          uploaded={docs.length > 0}
          dependentsDefault={deps.length}
          request={review}
          onRequest={async (n) => {
            if (await startCheckout(user.id, REVIEW_SERVICE, 1, n)) setRequests(await backend.listRequests(user.id));
          }}
        />
      </div>
    </div>
  );
}

/* ───────────────────────── pieces ───────────────────────── */

function Header({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="flex items-start gap-4">
      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-2xl bg-brand-tint">
        <Shield className="h-7 w-7 text-primary" />
      </div>
      <div>
        <h1 className="text-3xl font-bold text-brand-navy">{title}</h1>
        <p className="mt-2 max-w-3xl text-base leading-relaxed text-gray-600">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-white shadow-sm">
      <div className="p-6">
        <h3 className="text-2xl font-bold leading-tight text-brand-navy">{title}</h3>
      </div>
      <div className="space-y-2 px-6 pb-6 text-center">{children}</div>
    </div>
  );
}

function MoveDateCard() {
  const { profile, saveProfile } = usePortal();
  const [open, setOpen] = useState(false);
  const date = profile?.anticipated_move_date || null;
  const moved = profile?.move_stage === "moved";

  const pick = async (v: string) => {
    setOpen(false);
    if (await saveProfile({ anticipated_move_date: v })) toast.success(moved ? "Arrival date saved" : "Move date saved");
  };

  return (
    <StatCard title={moved ? "Arrival Date" : "Planned Move Date"}>
      {date ? (
        <p className="text-lg text-brand-navy">{formatLongDate(new Date(date + "T00:00:00"))}</p>
      ) : (
        <>
          <p className="text-lg text-brand-navy">{moved ? "No arrival date set" : "No move date set"}</p>
          <p className="text-sm text-brand-navy">Click to set the date your timeline is built on</p>
        </>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button size="sm" className="mt-2 gap-2">
            <CalendarIcon className="h-4 w-4" /> {date ? "Change Date" : "Set Date"}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="center">
          <Calendar value={date} onSelect={pick} />
        </PopoverContent>
      </Popover>
      {!date && (
        <Link href="/vietnam/consultation" className="block pt-2 text-sm text-primary hover:underline">
          Not sure when you&apos;ll move? Book a free consultation
        </Link>
      )}
    </StatCard>
  );
}

function CityCard() {
  const { profile, saveProfile } = usePortal();
  const city = profile?.destination_city || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(city);

  const save = async () => {
    if (await saveProfile({ destination_city: draft })) {
      setEditing(false);
      toast.success("City saved");
    }
  };

  return (
    <StatCard title="Destination City">
      {editing ? (
        <div className="space-y-3 text-left">
          <Select value={draft} onChange={(e) => setDraft(e.target.value)} className={cn(!draft && "text-gray-500")}>
            <option value="" disabled>
              Select city
            </option>
            {CITIES.map((c) => (
              <option key={c} className="text-foreground">
                {c}
              </option>
            ))}
          </Select>
          <div className="flex gap-2">
            <Button size="sm" onClick={save} disabled={!draft} className="flex-1 gap-2">
              <Check className="h-4 w-4" /> Save
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)} className="flex-1">
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg text-brand-navy">{city || "No city set"}</p>
          <p className="text-sm text-brand-navy">
            {city ? "Where you'll live and file your application" : "Click to set where you'll live and file your application"}
          </p>
          <Button
            size="sm"
            className="mt-2 gap-2"
            onClick={() => {
              setDraft(city);
              setEditing(true);
            }}
          >
            <Pencil className="h-4 w-4" /> {city ? "Change City" : "Set City"}
          </Button>
        </>
      )}
    </StatCard>
  );
}

function SecurityNote() {
  const rules = [
    "Each document must not exceed 4MB.",
    "We accept the following formats: PNG, JPG, JPEG, PDF.",
    `You can upload a maximum of ${MAX_FILES_PER_DOC} files per document.`,
    "You can only submit your documents once.",
    "If you have dependents, please ensure all documents are uploaded for each dependent before submission.",
  ];
  return (
    <div className="rounded-xl border bg-white p-5 shadow-sm">
      <div className="flex items-start gap-2 border-b pb-3">
        <Shield className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <p className="text-sm text-brand-navy">
          Your documents are secure. Files are encrypted in transit and at rest, stored on GDPR-compliant infrastructure, and
          only ever accessed by the XploreVietnam team handling your application.
        </p>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-gray-500">
        {rules.map((r) => (
          <li key={r} className="flex gap-2">
            <span className="text-gray-400">•</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function RenameInput({ initial, onDone, onRemove }: { initial: string; onDone: (v: string) => void; onRemove?: () => void }) {
  const [v, setV] = useState(initial);
  return (
    <div className="flex items-center gap-1 rounded-sm bg-background px-1 py-0.5 shadow-sm">
      <Input
        autoFocus
        value={v}
        onChange={(e) => setV(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") onDone(v);
          if (e.key === "Escape") onDone(initial);
        }}
        className="h-8 w-44 text-sm"
        placeholder="Full name"
      />
      <button type="button" aria-label="Save name" onClick={() => onDone(v)} className="rounded p-1 text-primary hover:bg-accent">
        <Check className="h-4 w-4" />
      </button>
      {onRemove && (
        <button type="button" aria-label="Remove dependent" onClick={onRemove} className="rounded p-1 text-red-600 hover:bg-red-50">
          <Trash2 className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

const kb = (n: number) => (n > 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

function DocCard({
  index, doc, files, locked, onUpload, onRemove, onView,
}: {
  index: number;
  doc: VisaDoc;
  files: UploadedDoc[];
  locked: boolean;
  onUpload: (files: File[]) => Promise<void>;
  onRemove: (d: UploadedDoc) => void;
  onView: (d: UploadedDoc) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const done = files.length > 0;
  const slots = MAX_FILES_PER_DOC - files.length;

  const take = useCallback(
    async (list: FileList | null) => {
      if (!list?.length) return;
      setBusy(true);
      await onUpload(Array.from(list));
      setBusy(false);
      if (input.current) input.current.value = "";
    },
    [onUpload],
  );

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <div className="flex gap-4">
        <div
          className={cn(
            "flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold",
            done ? "border-[#10B981] bg-[#10B981] text-white" : "border-blue-200 bg-blue-50 text-primary",
          )}
        >
          {done ? <Check className="h-4 w-4" /> : index}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold leading-snug text-brand-navy">
              {doc.title}
              {doc.required && <span className="ml-1 text-red-500">*</span>}
            </h3>
            {doc.required && (
              <span className="flex-shrink-0 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-700">Required</span>
            )}
          </div>
          {doc.text && <p className="mt-1 text-sm leading-5 text-gray-700">{doc.text}</p>}
          {doc.bullets && (
            <ul className="mt-1 space-y-1.5 text-sm leading-5 text-gray-700">
              {doc.bullets.map((b) => (
                <li key={b} className="flex gap-2">
                  <span>•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}

          {doc.upload === false ? (
            <div className="mt-4 flex items-start gap-3 rounded-lg border border-brand-tint-line bg-brand-tint p-4 text-sm text-brand-ink2">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              {doc.note}
            </div>
          ) : (
            <>
              {files.length > 0 && (
                <ul className="mt-4 space-y-2">
                  {files.map((f) => (
                    <li key={f.id} className="flex items-center gap-3 rounded-lg border bg-white px-3 py-2 text-sm">
                      <FileText className="h-4 w-4 flex-shrink-0 text-primary" />
                      <span className="min-w-0 flex-1 truncate text-brand-navy">{f.file_name}</span>
                      <span className="flex-shrink-0 text-xs text-gray-500">{kb(f.size_bytes)}</span>
                      <button type="button" aria-label={`View ${f.file_name}`} onClick={() => onView(f)} className="rounded p-1 text-gray-500 hover:bg-gray-100 hover:text-brand-navy">
                        <Eye className="h-4 w-4" />
                      </button>
                      {!locked && (
                        <button type="button" aria-label={`Remove ${f.file_name}`} onClick={() => onRemove(f)} className="rounded p-1 text-gray-500 hover:bg-red-50 hover:text-red-600">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
              {!locked && slots > 0 && (
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setOver(true);
                  }}
                  onDragLeave={() => setOver(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setOver(false);
                    take(e.dataTransfer.files);
                  }}
                  className={cn(
                    "mt-4 flex flex-col items-center rounded-lg border-2 border-dashed px-6 py-6 text-center transition-colors",
                    over ? "border-primary bg-blue-50" : "border-[#D3DDE8] bg-[#F0F5FA]",
                  )}
                >
                  <Upload className="h-7 w-7 text-gray-700" />
                  <p className="mt-3 text-base text-brand-ink2">{busy ? "Uploading..." : "Drag and drop your files here, or"}</p>
                  <input ref={input} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => take(e.target.files)} />
                  <Button variant="outline" className="mt-3 bg-white" disabled={busy} onClick={() => input.current?.click()}>
                    Choose File
                  </Button>
                  <p className="mt-3 text-sm text-gray-600">
                    PDF, JPG, JPEG, PNG — max 4MB per file • {slots} slot{slots === 1 ? "" : "s"} remaining
                  </p>
                </div>
              )}
            </>
          )}

          {doc.links && (
            <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
              {doc.links.map((l) => {
                const external = l.href.startsWith("http");
                return (
                  <Link
                    key={l.href}
                    href={l.href}
                    target={external ? "_blank" : undefined}
                    rel={external ? "noopener" : undefined}
                    className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" /> {l.label}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewCard({
  uploaded, dependentsDefault, request, onRequest,
}: {
  uploaded: boolean;
  dependentsDefault: number;
  request?: ServiceRequest;
  onRequest: (dependents: number) => Promise<void>;
}) {
  const [n, setN] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const count = n ?? dependentsDefault;
  const total = REVIEW.price + REVIEW.perDependent * count;
  const features = [
    "Complete written review within 3 business days",
    "30-minute review call with a Vietnam visa expert",
    "Expert feedback and recommendations",
  ];
  const step = "flex h-6 w-6 items-center justify-center rounded-full border text-gray-600 hover:bg-gray-50 disabled:opacity-40";

  return (
    <div className="overflow-hidden rounded-xl border-2 border-primary bg-white shadow-lg ring-4 ring-primary/10 lg:sticky lg:top-8">
      <div className="bg-primary px-6 py-5 text-center">
        <h3 className="text-2xl font-bold leading-tight text-white">Visa Packet Review</h3>
      </div>
      <div className="space-y-5 p-6">
        <div className="space-y-1 text-center">
          <p className="text-4xl text-brand-navy">${total.toLocaleString("en-US")}</p>
          <p className="text-sm text-gray-700">
            ${REVIEW.price} + ${REVIEW.perDependent} per dependent
          </p>
          <p className="text-sm text-gray-700">Get Your Visa Application Packet Reviewed by an Expert</p>
        </div>

        <div className="flex items-center justify-between rounded-lg border px-3 py-3">
          <span className="text-sm text-primary">Dependents</span>
          <div className="flex items-center gap-3">
            <button type="button" aria-label="Fewer dependents" className={step} disabled={count === 0 || !!request} onClick={() => setN(Math.max(0, count - 1))}>
              <Minus className="h-3 w-3" />
            </button>
            <span className="w-4 text-center font-bold text-brand-navy">{count}</span>
            <button type="button" aria-label="More dependents" className={step} disabled={count >= 10 || !!request} onClick={() => setN(count + 1)}>
              <Plus className="h-3 w-3" />
            </button>
          </div>
        </div>

        <ul className="space-y-2.5 text-sm text-gray-700">
          {features.map((f) => (
            <li key={f} className="flex gap-2">
              <CheckCircle2 className="mt-1 h-3 w-3 flex-shrink-0 text-primary" />
              {f}
            </li>
          ))}
        </ul>

        <div className="border-t pt-4">
          <Link href="/vietnam/relocation-packages" className="text-sm text-primary hover:underline">
            Need someone to handle the entire process? From ${REVIEW.fullServiceFrom} →
          </Link>
        </div>

        {request ? (
          <div className="flex gap-2 rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0" />
            <span>
              {request.status === "requested"
                ? `Review requested on ${formatLongDate(new Date(request.created_at))}. We'll be in touch by email to confirm and arrange payment.`
                : `Paid on ${formatLongDate(new Date(request.created_at))}. We'll email you the next steps.`}
            </span>
          </div>
        ) : uploaded ? (
          <Button
            className="h-11 w-full"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onRequest(count);
              setBusy(false);
            }}
          >
            {busy ? "Please wait..." : `Get Expert Review · $${total.toLocaleString("en-US")}`}
          </Button>
        ) : (
          <>
            <div className="flex gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm text-gray-700">
              <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Upload at least one document to enable expert review
            </div>
            <Button disabled className="h-10 w-full bg-gray-100 text-gray-400 disabled:opacity-100">
              Upload Documents First
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

function ChooseRoute({ onPick }: { onPick: (v: string) => void }) {
  return (
    <div className="space-y-8">
      <Header title="Visa Checklists" subtitle="Choose your visa route to see the exact documents you need. You can change this later in your profile settings." />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {VISA_TYPES.filter((v) => v.value !== "unsure").map((v) => (
          <button
            key={v.value}
            onClick={() => onPick(v.value)}
            className="rounded-xl border-2 border-gray-200 bg-white p-6 text-left shadow-sm transition-colors hover:border-primary"
          >
            <p className="text-lg font-semibold text-brand-navy">{v.label}</p>
            <p className="mt-1 text-sm text-gray-600">{v.sub}</p>
          </button>
        ))}
      </div>
      <p className="text-sm text-gray-600">
        Remote workers and retirees don&apos;t have a dedicated long-stay visa yet.{" "}
        <Link href="/vietnam/consultation" className="text-primary hover:underline">
          Book a free consultation
        </Link>{" "}
        and we&apos;ll walk you through what is realistic.
      </p>
    </div>
  );
}
