"use client";

import { useMemo, useState } from "react";
import type { PlatformSettings } from "@prisma/client";
import { ToggleSwitch } from "@/components/superadmin/toggle-switch";

type ProviderKey = "openrouter" | "openai" | "gemini";

function getProviderKeyName(provider: ProviderKey) {
  if (provider === "openrouter") return "OPENROUTER_API_KEY";
  if (provider === "openai") return "OPENAI_API_KEY";
  return "GEMINI_API_KEY";
}

export function AiSettingsCard({ settings }: { settings: PlatformSettings }) {
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testResult, setTestResult] = useState<null | { ok: boolean; message: string }>(null);

  const [aiEnabled, setAiEnabled] = useState(settings.aiEnabled);
  const [aiAllowAiAssisted, setAiAllowAiAssisted] = useState(settings.aiAllowAiAssisted);
  const [aiAllowHybrid, setAiAllowHybrid] = useState(settings.aiAllowHybrid);
  const [aiWebsiteFetchEnabled, setAiWebsiteFetchEnabled] = useState(settings.aiWebsiteFetchEnabled);

  const [aiProvider, setAiProvider] = useState<ProviderKey>((settings.aiProvider as ProviderKey) ?? "openrouter");
  const [aiModel, setAiModel] = useState(settings.aiModel);

  const providerKeyName = useMemo(() => getProviderKeyName(aiProvider), [aiProvider]);

  const save = async () => {
    setLoading(true);
    setTestResult(null);
    const res = await fetch("/api/superadmin/ai-settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        aiEnabled,
        aiProvider,
        aiModel,
        aiAllowAiAssisted,
        aiAllowHybrid,
        aiWebsiteFetchEnabled,
      }),
    });
    setLoading(false);
    setSaved(res.ok);
    setTimeout(() => setSaved(false), 2000);
  };

  const testConnection = async () => {
    setTesting(true);
    setTestResult(null);
    const res = await fetch("/api/superadmin/ai/test", { method: "POST" });
    const json = (await res.json().catch(() => null)) as any;
    setTesting(false);
    if (!res.ok || !json?.success) {
      setTestResult({ ok: false, message: json?.error ?? "Test failed" });
      return;
    }
    const msg = `ok (provider=${json.data.provider}, model=${json.data.model}, ${json.data.latencyMs}ms)`;
    setTestResult({ ok: true, message: msg });
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground">AI Settings</h3>
        <p className="text-xs text-muted-foreground mt-0.5">
          API keys are managed via environment variables. Provider + model + feature toggles are configured here.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2 flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Enable AI</p>
            <p className="text-xs text-muted-foreground">Turns on AI Assisted + Hybrid onboarding options (manual always remains available)</p>
          </div>
          <ToggleSwitch checked={aiEnabled} onChange={setAiEnabled} />
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Provider</label>
          <select
            value={aiProvider}
            onChange={(e) => setAiProvider(e.target.value as ProviderKey)}
            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground focus:outline-none focus:ring-1 focus:ring-accent"
          >
            <option value="openrouter">OpenRouter</option>
            <option value="openai">OpenAI</option>
            <option value="gemini">Gemini</option>
          </select>
          <p className="mt-1.5 text-xs text-muted-foreground">Required env var: {providerKeyName} (or AI_API_KEY)</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-muted-foreground mb-1.5">Model</label>
          <input
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-secondary border border-border rounded-lg text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-accent"
            placeholder={aiProvider === "openrouter" ? "openai/gpt-4o-mini" : aiProvider === "openai" ? "gpt-4o-mini" : "gemini-1.5-flash"}
          />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">AI Assisted option</p>
            <p className="text-xs text-muted-foreground">Show the dedicated AI setup option</p>
          </div>
          <ToggleSwitch checked={aiAllowAiAssisted} onChange={setAiAllowAiAssisted} />
        </div>

        <div className="flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Hybrid option</p>
            <p className="text-xs text-muted-foreground">Show AI-generated starting point + review/edit flow</p>
          </div>
          <ToggleSwitch checked={aiAllowHybrid} onChange={setAiAllowHybrid} />
        </div>

        <div className="sm:col-span-2 flex items-center justify-between p-4 bg-secondary rounded-lg border border-border">
          <div>
            <p className="text-sm font-medium text-foreground">Website analysis</p>
            <p className="text-xs text-muted-foreground">Allow server-side fetch of website URL to improve AI suggestions</p>
          </div>
          <ToggleSwitch checked={aiWebsiteFetchEnabled} onChange={setAiWebsiteFetchEnabled} />
        </div>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={loading}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-accent text-primary rounded-lg hover:bg-accent/90 disabled:opacity-50 transition-colors"
        >
          {loading ? "Saving..." : saved ? "✓ Saved" : "Save AI Settings"}
        </button>

        <button
          type="button"
          onClick={testConnection}
          disabled={testing}
          className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium bg-secondary border border-border rounded-lg text-foreground hover:bg-secondary/70 disabled:opacity-50 transition-colors"
        >
          {testing ? "Testing..." : "Test Connection"}
        </button>

        {testResult && (
          <div className={`text-sm ${testResult.ok ? "text-foreground" : "text-destructive"}`}>{testResult.message}</div>
        )}
      </div>
    </div>
  );
}

