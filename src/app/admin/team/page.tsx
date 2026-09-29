"use client";
import { toast } from "sonner";
import { Copy } from "lucide-react";
import { PageHeader, Panel, fmtDate, useAdmin } from "@/components/admin/ui";

const SQL = `insert into public.staff (user_id, full_name, title, email)
select id, 'Full Name', 'Job title', email
from auth.users
where email = 'their-email@example.com';`;

export default function TeamPage() {
  const { user, staff } = useAdmin();
  const copy = () => navigator.clipboard?.writeText(SQL).then(() => toast.success("Copied"));
  return (
    <>
      <PageHeader title="Team" subtitle="People who can open this admin area and see every client's data." />
      <Panel title={`Team members (${staff.length})`} bodyClass="p-0">
        <ul className="divide-y divide-gray-100">
          {staff.map((s) => (
            <li key={s.user_id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3.5">
              <div>
                <p className="font-medium text-brand-navy">
                  {s.full_name}
                  {s.user_id === user.id && <span className="ml-2 rounded bg-brand-tint px-1.5 py-0.5 text-xs text-primary">You</span>}
                </p>
                <p className="text-sm text-gray-500">{[s.title, s.email].filter(Boolean).join(" · ")}</p>
              </div>
              <span className="text-xs text-gray-400">Added {fmtDate(s.created_at)}</span>
            </li>
          ))}
        </ul>
      </Panel>
      <Panel title="Add a team member">
        <ol className="list-decimal space-y-2 pl-5 text-sm text-brand-navy">
          <li>Ask them to sign up to Navigator with their work email and confirm it.</li>
          <li>
            In Supabase, open <b>SQL Editor → New query</b>, paste the lines below, replace the name, title and email, and click <b>Run</b>.
          </li>
          <li>They log in and open navigator.xplorevietnam.org/admin (or Admin in their avatar menu).</li>
        </ol>
        <div className="relative mt-4">
          <pre className="overflow-x-auto rounded-lg bg-brand-navy p-4 pr-12 text-xs leading-relaxed text-white">{SQL}</pre>
          <button onClick={copy} className="absolute right-2 top-2 rounded-md p-2 text-white/70 hover:bg-white/10 hover:text-white" aria-label="Copy SQL">
            <Copy className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-3 text-xs text-gray-500">
          Team access is added in Supabase on purpose: nobody can make themselves staff from inside the app. To remove someone, delete their row in
          Table Editor → staff.
        </p>
      </Panel>
    </>
  );
}
