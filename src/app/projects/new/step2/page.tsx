"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { PRESETS } from "@/lib/model-presets";
import { postJSON } from "@/lib/api";

export default function Step2Page() {
  const router = useRouter();
  const sp = useSearchParams();
  const projectId = sp.get("projectId");
  const [selected, setSelected] = useState<("ADDIE" | "DCC" | "RPISD" | "CUSTOM")[]>([]);
  const [customStages, setCustomStages] = useState<string>("");

  if (!projectId) return <div className="p-6">Missing projectId</div>;

  function toggle(key: "ADDIE" | "DCC" | "RPISD" | "CUSTOM") {
    setSelected((arr) => (arr.includes(key) ? arr.filter((k) => k !== key) : [...arr, key]));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const models: any[] = [];

    for (const key of selected) {
      if (key === "CUSTOM") {
        const stages = customStages
          .split("\n")
          .map((s) => s.trim())
          .filter(Boolean);
        models.push({ name: "Custom", config: { stages } });
      } else {
        const p = PRESETS[key];
        models.push({ name: p.name, config: { stages: p.stages } });
      }
    }

    if (models.length === 0) {
      alert("Choose at least one model (or add a Custom list).");
      return;
    }

    try {
      await postJSON(`/api/projects/${projectId}/models`, { models });
      router.replace(`/projects/new/step3?projectId=${projectId}`);
    } catch (err: any) {
      alert(err.message || "Failed to save models");
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-semibold">Step 2 — Choose model(s)</h1>

      <form onSubmit={onSubmit} className="space-y-4">
        <PresetBox
          title="ADDIE"
          stages={PRESETS.ADDIE.stages}
          checked={selected.includes("ADDIE")}
          onChange={() => toggle("ADDIE")}
        />
        <PresetBox
          title="Dick, Carey & Carey"
          stages={PRESETS.DCC.stages}
          checked={selected.includes("DCC")}
          onChange={() => toggle("DCC")}
        />
        <PresetBox
          title="RPISD"
          stages={PRESETS.RPISD.stages}
          checked={selected.includes("RPISD")}
          onChange={() => toggle("RPISD")}
        />

        <div className="border rounded p-3">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={selected.includes("CUSTOM")}
              onChange={() => toggle("CUSTOM")}
            />
            <span className="font-medium">Custom</span>
          </label>
          {selected.includes("CUSTOM") && (
            <textarea
              className="w-full border rounded p-2 mt-2"
              placeholder={"One stage per line"}
              rows={6}
              value={customStages}
              onChange={(e) => setCustomStages(e.target.value)}
            />
          )}
        </div>

        <button className="rounded bg-black text-white px-4 py-2">Save & continue</button>
      </form>
    </div>
  );
}

function PresetBox({
  title,
  stages,
  checked,
  onChange,
}: {
  title: string;
  stages: string[];
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <div className="border rounded p-3">
      <label className="flex items-center gap-2 mb-2">
        <input type="checkbox" checked={checked} onChange={onChange} />
        <span className="font-medium">{title}</span>
      </label>
      <ul className="list-disc ml-6 text-sm text-muted-foreground">
        {stages.map((s, i) => (
          <li key={i}>{s}</li>
        ))}
      </ul>
    </div>
  );
}
