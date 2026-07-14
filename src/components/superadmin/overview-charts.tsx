// src/components/superadmin/overview-charts.tsx
"use client";

import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import { formatCurrency } from "@/lib/utils";

const PLAN_COLORS: Record<string, string> = {
  FREE: "#5F5E5A",
  STARTER: "#378ADD",
  PROFESSIONAL: "#BA7517",
  ENTERPRISE: "#534AB7",
};

interface OverviewChartsProps {
  revenueData: Array<{ month: string; mrr: number }>;
  signupData: Array<{ month: string; signups: number }>;
  planDistribution: Array<{ plan: string; count: number; percentage: number }>;
}

const shortMonth = (m: string) => {
  const [year, month] = m.split("-");
  const d = new Date(Number(year), Number(month) - 1);
  return d.toLocaleString("default", { month: "short" });
};

const darkTooltipStyle = {
  backgroundColor: "#1e2231",
  border: "1px solid #2a2f3a",
  borderRadius: "8px",
  color: "#f0f0f0",
  fontSize: 12,
};

export function OverviewCharts({ revenueData, signupData, planDistribution }: OverviewChartsProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* MRR trend */}
      <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-1">MRR Growth</p>
        <p className="text-xs text-muted-foreground mb-4">Monthly recurring revenue — last 12 months</p>
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={revenueData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={shortMonth}
              tick={{ fontSize: 11, fill: "#8892a4" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tickFormatter={(v) => `$${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              tick={{ fontSize: 11, fill: "#8892a4" }}
              axisLine={false}
              tickLine={false}
              width={48}
            />
            <Tooltip
              contentStyle={darkTooltipStyle}
              formatter={(v) => [formatCurrency(Number(v ?? 0)), "MRR"]}
              labelFormatter={(m) => shortMonth(String(m ?? ""))}
            />
            <Line
              type="monotone"
              dataKey="mrr"
              stroke="#f5c84c"
              strokeWidth={2.5}
              dot={false}
              activeDot={{ r: 4, fill: "#f5c84c" }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Plan distribution */}
      <div className="bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-1">Plan Distribution</p>
        <p className="text-xs text-muted-foreground mb-4">Active subscriptions by tier</p>
        <ResponsiveContainer width="100%" height={160}>
          <PieChart>
            <Pie
              data={planDistribution}
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={72}
              paddingAngle={3}
              dataKey="count"
            >
              {planDistribution.map((entry) => (
                <Cell
                  key={entry.plan}
                  fill={PLAN_COLORS[entry.plan] ?? "#5F5E5A"}
                />
              ))}
            </Pie>
            <Tooltip
              contentStyle={darkTooltipStyle}
              formatter={(v, _, props) => [
  `${Number(v ?? 0)} (${(props as { payload?: { plan?: string } }).payload?.plan ?? ""})`,
  "Subscribers",
]}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="space-y-1.5 mt-2">
          {planDistribution.map((p) => (
            <div key={p.plan} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: PLAN_COLORS[p.plan] ?? "#5F5E5A" }}
                />
                <span className="text-muted-foreground">{p.plan}</span>
              </div>
              <span className="font-medium text-foreground">
                {p.count} ({p.percentage.toFixed(0)}%)
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* New signups */}
      <div className="lg:col-span-3 bg-card border border-border rounded-xl p-5">
        <p className="text-sm font-semibold text-foreground mb-1">New Business Sign-ups</p>
        <p className="text-xs text-muted-foreground mb-4">New businesses per month — last 12 months</p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={signupData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#2a2f3a" vertical={false} />
            <XAxis
              dataKey="month"
              tickFormatter={shortMonth}
              tick={{ fontSize: 11, fill: "#8892a4" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "#8892a4" }}
              axisLine={false}
              tickLine={false}
              width={32}
              allowDecimals={false}
            />
            <Tooltip
              contentStyle={darkTooltipStyle}
              formatter={(v) => [Number(v ?? 0), "New businesses"]}
             labelFormatter={(m) => shortMonth(String(m ?? ""))}
            />
            <Bar dataKey="signups" fill="#1a5fa8" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
