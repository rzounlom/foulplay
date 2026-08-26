"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminMetrics, MetricsRange } from "@/lib/admin/metrics";
import { Button } from "@/components/ui/button";

const RANGES: { id: MetricsRange; label: string }[] = [
  { id: "24h", label: "24h" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
];

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-neutral-500 dark:text-neutral-400">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-foreground tabular-nums">{value}</p>
      {hint ? (
        <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">{hint}</p>
      ) : null}
    </div>
  );
}

function MiniBarChart({
  title,
  rows,
  valueKey,
  colorClass = "bg-primary",
}: {
  title: string;
  rows: { date: string; [key: string]: string | number }[];
  valueKey: string;
  colorClass?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => Number(r[valueKey] ?? 0)));

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No data in this range yet.</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {rows.map((row) => {
            const value = Number(row[valueKey] ?? 0);
            const height = `${Math.max(4, (value / max) * 100)}%`;
            return (
              <div
                key={row.date}
                className="flex-1 flex flex-col items-center justify-end gap-1 min-w-0"
                title={`${row.date}: ${value}`}
              >
                <div
                  className={`w-full rounded-t ${colorClass} opacity-90`}
                  style={{ height }}
                />
                <span className="text-[9px] text-neutral-500 truncate w-full text-center">
                  {row.date.slice(5)}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function DualBarChart({
  title,
  rows,
}: {
  title: string;
  rows: { date: string; started: number; ended: number }[];
}) {
  const max = Math.max(
    1,
    ...rows.flatMap((r) => [r.started, r.ended]),
  );

  return (
    <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-3">{title}</h3>
      {rows.length === 0 ? (
        <p className="text-sm text-neutral-500">No data in this range yet.</p>
      ) : (
        <div className="flex items-end gap-1 h-32">
          {rows.map((row) => (
            <div
              key={row.date}
              className="flex-1 flex items-end justify-center gap-0.5 min-w-0"
              title={`${row.date}: ${row.started} started, ${row.ended} ended`}
            >
              <div
                className="w-[42%] rounded-t bg-primary opacity-90"
                style={{ height: `${Math.max(4, (row.started / max) * 100)}%` }}
              />
              <div
                className="w-[42%] rounded-t bg-accent opacity-90"
                style={{ height: `${Math.max(4, (row.ended / max) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      )}
      <div className="mt-2 flex gap-4 text-xs text-neutral-500">
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-primary" /> Started
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="inline-block w-2 h-2 rounded-sm bg-accent" /> Ended
        </span>
      </div>
    </div>
  );
}

export function AdminDashboard({ adminName }: { adminName: string }) {
  const [range, setRange] = useState<MetricsRange>("7d");
  const [metrics, setMetrics] = useState<AdminMetrics | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = useCallback(async (selected: MetricsRange) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/metrics?range=${selected}`, {
        credentials: "include",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          typeof data.error === "string" ? data.error : "Failed to load metrics",
        );
      }
      setMetrics(await res.json());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load metrics");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load(range);
  }, [range, load]);

  useEffect(() => {
    const interval = setInterval(() => void load(range), 60_000);
    return () => clearInterval(interval);
  }, [range, load]);

  const o = metrics?.overview;

  return (
    <div className="container mx-auto px-4 py-6 md:py-8 max-w-7xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-1">
            Signed in as {adminName}. Live stats refresh every 60s.
          </p>
        </div>
        <div className="flex gap-2">
          {RANGES.map((r) => (
            <Button
              key={r.id}
              type="button"
              size="sm"
              variant={range === r.id ? "primary" : "secondary"}
              onClick={() => setRange(r.id)}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="mb-4 rounded-lg bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-200 px-4 py-3 text-sm">
          {error}
        </div>
      ) : null}

      {isLoading && !metrics ? (
        <p className="text-neutral-500">Loading metrics…</p>
      ) : metrics && o ? (
        <div className="space-y-6">
          <section>
            <h2 className="text-lg font-semibold mb-3">Right now</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricCard label="Live games" value={o.liveGames} />
              <MetricCard label="Live players" value={o.livePlayers} />
              <MetricCard label="Signups today" value={o.signupsToday} />
              <MetricCard
                label="Active users"
                value={o.activeUsersPeriod}
                hint={`In selected ${range} window`}
              />
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Growth &amp; funnel</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
              <MetricCard label="New signups" value={o.signupsPeriod} />
              <MetricCard label="Total users" value={o.totalUsers} />
              <MetricCard label="Rooms created" value={o.roomsCreatedPeriod} />
              <MetricCard label="Room joins" value={o.roomsJoinedPeriod} />
              <MetricCard label="Games started" value={o.gamesStartedPeriod} />
              <MetricCard label="Games ended" value={o.gamesEndedPeriod} />
              <MetricCard
                label="Completion rate"
                value={o.completionRate != null ? `${o.completionRate}%` : "—"}
                hint="Ended / started"
              />
              <MetricCard label="Drop-in matches" value={o.dropInPeriod} />
              <MetricCard label="Submissions" value={o.submissionsPeriod} />
              <MetricCard label="Age gate done" value={o.ageGateCompleted} />
              <MetricCard label="Confirmed 21+" value={o.is21PlusCount} />
            </div>
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <MiniBarChart
              title="Signups by day"
              rows={metrics.signupsByDay}
              valueKey="count"
            />
            <DualBarChart title="Games by day" rows={metrics.gamesByDay} />
          </section>

          <section className="grid md:grid-cols-2 gap-4">
            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Product mix (rooms created)
              </h3>
              <div className="space-y-2 text-sm">
                <p>
                  <span className="text-neutral-500">Public:</span>{" "}
                  {metrics.productMix.publicVsPrivate.public}
                </p>
                <p>
                  <span className="text-neutral-500">Private:</span>{" "}
                  {metrics.productMix.publicVsPrivate.private}
                </p>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-neutral-500 mb-1">Modes</p>
                  {Object.entries(metrics.productMix.modes).map(([mode, count]) => (
                    <p key={mode}>
                      {mode}: {count}
                    </p>
                  ))}
                </div>
                <div className="pt-2 border-t border-border">
                  <p className="text-xs font-medium text-neutral-500 mb-1">Sports</p>
                  {Object.entries(metrics.productMix.sports).map(([sport, count]) => (
                    <p key={sport}>
                      {sport}: {count}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-surface p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Events ({range})
              </h3>
              <div className="max-h-64 overflow-y-auto space-y-1 text-sm">
                {metrics.eventCounts.length === 0 ? (
                  <p className="text-neutral-500">No events recorded yet.</p>
                ) : (
                  metrics.eventCounts.map((e) => (
                    <div
                      key={e.name}
                      className="flex justify-between gap-2 py-0.5 border-b border-border/50 last:border-0"
                    >
                      <span className="font-mono text-xs">{e.name}</span>
                      <span className="tabular-nums">{e.count}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-lg font-semibold mb-3">Live games</h2>
            <div className="rounded-xl border border-border bg-surface overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-neutral-50 dark:bg-neutral-800/80 text-left">
                  <tr>
                    <th className="px-4 py-2 font-medium">Code</th>
                    <th className="px-4 py-2 font-medium">Players</th>
                    <th className="px-4 py-2 font-medium">Mode</th>
                    <th className="px-4 py-2 font-medium">Sport</th>
                    <th className="px-4 py-2 font-medium">Type</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.liveRooms.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-neutral-500"
                      >
                        No active games right now.
                      </td>
                    </tr>
                  ) : (
                    metrics.liveRooms.map((room) => (
                      <tr
                        key={room.code}
                        className="border-t border-border"
                      >
                        <td className="px-4 py-2 font-mono">{room.code}</td>
                        <td className="px-4 py-2">{room.playerCount}</td>
                        <td className="px-4 py-2">{room.mode ?? "—"}</td>
                        <td className="px-4 py-2">{room.sport ?? "—"}</td>
                        <td className="px-4 py-2">
                          {room.isPublicChaos ? "Public" : "Private"}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <p className="text-xs text-neutral-500">
            Generated {new Date(metrics.generatedAt).toLocaleString()}
          </p>
        </div>
      ) : null}
    </div>
  );
}
