// src/features/dashboard/components/charts.tsx — Dashboard recharts widgets
// Author: Sudarshan Sonawane

"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from "recharts";

const COLORS = {
  DRAFT: "#a1a1aa", // zinc-400
  PLACED: "#3b82f6", // blue-500
  RECEIVED: "#10b981", // emerald-500
  CANCELLED: "#ef4444", // red-500
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: COLORS.DRAFT,
  PLACED: COLORS.PLACED,
  RECEIVED: COLORS.RECEIVED,
  CANCELLED: COLORS.CANCELLED,
};

// ─── Spend Trend (area chart) ──────────────────────────────────

export function SpendTrendChart({ data }: { data: Array<{ day: string; totalCents: string }> }) {
  const formatted = data.map((d) => ({
    day: d.day.slice(5), // MM-DD
    total: Number(d.totalCents) / 100,
  }));

  if (formatted.length === 0) {
    return <EmptyChart label="No spend in the last 30 days" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={formatted} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
            <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" />
        <XAxis
          dataKey="day"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            fontSize: 12,
          }}
        />
        <Area
          type="monotone"
          dataKey="total"
          stroke="#10b981"
          strokeWidth={2}
          fill="url(#spendGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─── Status Mix (donut chart) ───────────────────────────────────

export function StatusMixChart({
  data,
}: {
  data: Array<{ status: string; count: number }>;
}) {
  const formatted = data.map((d) => ({
    name: d.status,
    value: d.count,
    color: STATUS_COLORS[d.status] ?? "#a1a1aa",
  }));

  if (formatted.length === 0 || formatted.every((f) => f.value === 0)) {
    return <EmptyChart label="No purchase orders yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <PieChart>
        <Pie
          data={formatted}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          label={(e) => e.name}
        >
          {formatted.map((entry, i) => (
            <Cell key={i} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            fontSize: 12,
          }}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ─── Top Suppliers (bar chart) ──────────────────────────────────

export function TopSuppliersChart({
  data,
}: {
  data: Array<{ supplierName: string; spendFormatted: string; spendCents: string }>;
}) {
  const formatted = data.map((d) => ({
    name: d.supplierName.length > 14 ? d.supplierName.slice(0, 12) + "…" : d.supplierName,
    spend: Number(d.spendCents) / 100,
  }));

  if (formatted.length === 0) {
    return <EmptyChart label="No supplier spend yet" />;
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={formatted} layout="vertical" margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e4e4e7" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `$${v.toLocaleString()}`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 11, fill: "#71717a" }}
          tickLine={false}
          axisLine={false}
          width={110}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, "Spend"]}
          contentStyle={{
            borderRadius: 8,
            border: "1px solid #e4e4e7",
            fontSize: 12,
          }}
        />
        <Bar dataKey="spend" fill="#3b82f6" radius={[0, 6, 6, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ label }: { label: string }) {
  return (
    <div className="flex items-center justify-center h-[240px] text-sm text-zinc-500 dark:text-zinc-500">
      {label}
    </div>
  );
}