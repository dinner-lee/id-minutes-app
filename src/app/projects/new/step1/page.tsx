"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { postJSON } from "@/lib/api";

export default function Step1Page() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [purpose, setPurpose] = useState("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [members, setMembers] = useState<string>(""); // comma-separated
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setSubmitting(true);
      const memberList = members
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const data = await postJSON<{ ok: true; project: { id: string } }>(
        "/api/projects",
        { title, purpose, startDate, endDate, members: memberList }
      );

      const projectId = data.project.id;
      router.replace(`/projects/new/step2?projectId=${projectId}`);
    } catch (err: any) {
      alert(err.message || "Failed to create project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-semibold mb-4">Step 1 — Basics</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <input className="w-full border rounded p-2" placeholder="Project title"
               value={title} onChange={(e) => setTitle(e.target.value)} required />
        <textarea className="w-full border rounded p-2" placeholder="Purpose"
               value={purpose} onChange={(e) => setPurpose(e.target.value)} required />
        <div className="grid grid-cols-2 gap-3">
          <input type="date" className="border rounded p-2" value={startDate}
                 onChange={(e) => setStartDate(e.target.value)} required />
          <input type="date" className="border rounded p-2" value={endDate}
                 onChange={(e) => setEndDate(e.target.value)} required />
        </div>
        <input className="w-full border rounded p-2"
               placeholder="Member emails (comma-separated)"
               value={members} onChange={(e) => setMembers(e.target.value)} />
        <button disabled={submitting}
                className="rounded bg-black text-white px-4 py-2">
          {submitting ? "Creating…" : "Create & continue"}
        </button>
      </form>
    </div>
  );
}
