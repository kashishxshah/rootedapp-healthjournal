export const FACTORS = [
  { id: "oiling", label: "Champi / Scalp oiling", short: "Scalp oiling", icon: "droplets", effect: "scalpDryness", min: 0.5, suggestion: "Compare weeks with and without your usual scalp-oiling routine." },
  { id: "hard-water", label: "Hard water wash", short: "Hard water", icon: "waves", effect: "scalpDryness", min: -0.5, suggestion: "Observe a few washes with the same routine to compare their softness." },
  { id: "humidity", label: "Monsoon humidity", short: "Humidity", icon: "cloud-rain", effect: "scalpComfort", min: 0.5, suggestion: "Notice how scalp comfort shifts on different humidity days." },
  { id: "heat-styling", label: "Heat styling", short: "Heat styling", icon: "flame", effect: "scalpComfort", min: -0.5, suggestion: "Compare days with and without your usual heat styling routine." },
  { id: "outdoor", label: "Metro / outdoor exposure", short: "Outdoor exposure", icon: "train-front", effect: "scalpComfort", min: 0.5, suggestion: "Observe whether indoor and outdoor days feel different in your own logs." },
  { id: "late-dinner", label: "Late dinner", short: "Late dinner", icon: "utensils", effect: "skinFeel", min: -0.45, suggestion: "Compare morning skin observations after earlier and later dinners." },
  { id: "new-product", label: "New product", short: "New product", icon: "flask-conical", effect: "scalpComfort", min: 0.5, suggestion: "Make a note of how familiar and newly introduced routines compare." },
  { id: "stress", label: "High-stress / work surge", short: "Work stress", icon: "briefcase-business", effect: "scalpComfort", min: 0.5, suggestion: "Observe your logged comfort around busy and slower workdays." },
] as const;

export const HAIR_FEELS = ["Calm & balanced", "Mild itchy spots", "Oily roots / Dry ends", "Soft & hydrated"] as const;
export const SKIN_FEELS = ["Grounded / Calm", "Cheek tightness", "T-zone shine", "Fresh & dewy"] as const;
export const FACTOR_BY_ID = Object.fromEntries(FACTORS.map((factor) => [factor.id, factor])) as Record<string, (typeof FACTORS)[number] | undefined>;

export type FactorId = (typeof FACTORS)[number]["id"];
export type OutcomeKey = "scalpComfort" | "scalpDryness" | "skinFeel";
export type DailyLog = {
  date: string;
  dayNumber: number;
  scalpComfort: number;
  scalpDryness: number;
  skinFeel: number;
  scalpFeel: string | null;
  skinState: string | null;
  sleepHours: number | null;
  stressScore: number | null;
  factors: string[];
  routines: string[];
  note: string;
};
export type Experiment = {
  id: string;
  name: string;
  patternId: string;
  factorLabel: string;
  outcomeLabel: string;
  lag: number;
  durationDays: number;
  startDate: string;
  startDay: number;
  status: "active" | "paused" | "completed" | "stopped";
  dailyNotes: { dayNumber: number; date: string; note: string; comfort: number | null }[];
};
export type RootedData = {
  version: 1;
  mode: "demo" | "fresh" | "personal";
  profile: { name: string; startDate: string };
  logs: DailyLog[];
  experiments: Experiment[];
};
export type Pattern = {
  id: string;
  factorId: string;
  factorLabel: string;
  outcome: OutcomeKey;
  outcomeLabel: string;
  lag: number;
  observations: number;
  after: number;
  baseline: number;
  difference: number;
  status: "observed" | "emerging";
};

const DAY = 86_400_000;
export function toLocalISO(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
export function addDays(iso: string, days: number) {
  const [year, month, day] = iso.split("-").map(Number);
  return toLocalISO(new Date(year, month - 1, day + days));
}
export function dateDay(startDate: string, date: string) {
  return Math.round((new Date(`${date}T12:00:00`).getTime() - new Date(`${startDate}T12:00:00`).getTime()) / DAY) + 1;
}
export function currentDay(data: RootedData, today = toLocalISO(new Date())) {
  return Math.min(28, Math.max(1, dateDay(data.profile.startDate, today)));
}
function average(values: number[]) {
  return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
}

function makeDemo(): RootedData {
  const startDate = addDays(toLocalISO(new Date()), -17);
  const sleepByDay: Record<number, number> = { 2: 5.1, 6: 5.6, 10: 5.4, 14: 4.9 };
  const targetLowComfort = new Set([4, 8, 12, 16]);
  const logs: DailyLog[] = Array.from({ length: 18 }, (_, index) => {
    const dayNumber = index + 1;
    const shortSleep = sleepByDay[dayNumber] != null;
    const comfort = targetLowComfort.has(dayNumber)
      ? [4.5, 5.0, 4.1, 4.8][[...targetLowComfort].indexOf(dayNumber)]
      : [7.5, 7.2, 8.0, 7.0, 7.7, 7.4, 8.2][dayNumber % 7];
    const factors: string[] = [];
    const routines: string[] = [];
    if (dayNumber % 6 === 0 || dayNumber === 17) factors.push("hard-water");
    if (dayNumber % 4 === 0 || dayNumber === 15) { factors.push("oiling"); routines.push("Scalp oil massage"); }
    if ([3, 9, 15].includes(dayNumber)) factors.push("humidity");
    if ([5, 11, 17].includes(dayNumber)) factors.push("late-dinner");
    if ([7, 14].includes(dayNumber)) factors.push("stress");
    if ([2, 8, 13].includes(dayNumber)) factors.push("outdoor");
    const scalpFeel = comfort >= 7.5 ? "Calm & balanced" : comfort <= 5 ? "Mild itchy spots" : "Oily roots / Dry ends";
    return {
      date: addDays(startDate, index), dayNumber, scalpComfort: comfort,
      scalpDryness: factors.includes("oiling") ? 3 + dayNumber % 2 : factors.includes("hard-water") ? 7 + dayNumber % 2 : 4 + dayNumber % 3,
      skinFeel: [6.1, 7.2, 5.8, 7.6, 6.6][dayNumber % 5], scalpFeel,
      skinState: dayNumber % 4 === 0 ? "Cheek tightness" : dayNumber % 3 === 0 ? "Fresh & dewy" : "Grounded / Calm",
      sleepHours: sleepByDay[dayNumber] ?? [7.7, 6.8, 8.1, 7.3, 6.1, 7.9, 7.0][dayNumber % 7],
      stressScore: dayNumber % 5 === 2 ? 7 : dayNumber % 4,
      factors, routines: factors.includes("hard-water") ? [...routines, "Gentle cleanser"] : routines,
      note: dayNumber === 16 ? "Softer feeling after my regular wash." : "",
    };
  });
  const demo: RootedData = { version: 1, mode: "demo", profile: { name: "Ananya", startDate }, logs, experiments: [] };
  const discovered = discoverPatterns(demo);
  const sleepPattern = discovered.find((pattern) => pattern.factorId === "short-sleep" && pattern.outcome === "scalpComfort" && pattern.status === "observed");
  if (sleepPattern) {
    demo.experiments.push({
      id: `demo-experiment-${sleepPattern.id}`, name: "A more consistent sleep window",
      patternId: sleepPattern.id, factorLabel: sleepPattern.factorLabel, outcomeLabel: sleepPattern.outcomeLabel,
      lag: sleepPattern.lag, durationDays: 10, startDate: addDays(toLocalISO(new Date()), -5),
      startDay: Math.max(1, currentDay(demo) - 5), status: "active",
      dailyNotes: [{ dayNumber: currentDay(demo) - 3, date: addDays(toLocalISO(new Date()), -3), note: "A calmer wind-down tonight.", comfort: 7.5 }],
    });
  }
  return demo;
}

export function makeFresh(): RootedData {
  return { version: 1, mode: "fresh", profile: { name: "Ananya", startDate: toLocalISO(new Date()) }, logs: [], experiments: [] };
}

export function discoverPatterns(data: RootedData): Pattern[] {
  const byDay = new Map(data.logs.map((log) => [log.dayNumber, log]));
  const observations: { factorId: string; factorLabel: string; outcome: OutcomeKey; outcomeLabel: string; exposedDays: number[] }[] = [
    { factorId: "short-sleep", factorLabel: "Shorter sleep (< 6.5 hours)", outcome: "scalpComfort", outcomeLabel: "scalp comfort", exposedDays: data.logs.filter((log) => log.sleepHours != null && log.sleepHours < 6.5).map((log) => log.dayNumber) },
    { factorId: "steady-sleep", factorLabel: "Restful sleep (7+ hours)", outcome: "scalpComfort", outcomeLabel: "scalp comfort", exposedDays: data.logs.filter((log) => log.sleepHours != null && log.sleepHours >= 7).map((log) => log.dayNumber) },
    ...FACTORS.map((factor) => ({ factorId: factor.id, factorLabel: factor.label, outcome: factor.effect, outcomeLabel: factor.effect === "scalpComfort" ? "scalp comfort" : factor.effect === "scalpDryness" ? "scalp dryness" : "skin comfort", exposedDays: data.logs.filter((log) => log.factors.includes(factor.id)).map((log) => log.dayNumber) })),
  ];
  const results: Pattern[] = [];
  for (const candidate of observations) {
    if (!candidate.exposedDays.length) continue;
    const matches: Pattern[] = [];
    for (let lag = 0; lag <= 5; lag++) {
      const afterValues = candidate.exposedDays.map((day) => byDay.get(day + lag)?.[candidate.outcome]).filter((score): score is number => score != null);
      if (afterValues.length < 2) continue;
      const exposedDays = new Set(candidate.exposedDays);
      const controlValues = data.logs.filter((log) => !exposedDays.has(log.dayNumber)).map((log) => log[candidate.outcome]);
      if (controlValues.length < 2) continue;
      const after = average(afterValues);
      const baseline = average(controlValues);
      const difference = after - baseline;
      matches.push({ id: `${candidate.factorId}-${candidate.outcome}-${lag}`, factorId: candidate.factorId, factorLabel: candidate.factorLabel,
        outcome: candidate.outcome, outcomeLabel: candidate.outcomeLabel, lag, observations: afterValues.length, after, baseline, difference, status: "emerging" });
    }
    const plausible = matches.filter((match) => Math.abs(match.difference) >= (candidate.outcome === "scalpComfort" ? 0.9 : 0.85));
    plausible.sort((a, b) => b.observations * Math.abs(b.difference) - a.observations * Math.abs(a.difference));
    if (plausible.length) {
      const best = plausible[0];
      const distinctiveLag = best != null && plausible.filter((candidateMatch) => candidateMatch.lag !== best.lag && Math.abs(candidateMatch.difference) > Math.abs(best.difference) - 0.15).length < Math.ceil(plausible.length * 0.5);
      const pattern = best ?? null;
      if (pattern) {
        const isObserved = pattern.observations >= 3 && Math.abs(pattern.difference) >= 1.0 && distinctiveLag;
        results.push({ ...pattern, status: isObserved ? "observed" : "emerging" });
      }
    } else if (matches.length >= 2) {
      matches.sort((a, b) => b.observations * Math.abs(b.difference) - a.observations * Math.abs(a.difference));
      const early = matches[0];
      if (early) results.push(early);
    }
  }
  return results.sort((a, b) => Number(b.status === "observed") - Number(a.status === "observed") || b.observations * Math.abs(b.difference) - a.observations * Math.abs(a.difference));
}

export function describePattern(pattern: Pattern) {
  const isLower = pattern.difference < 0;
  const lag = pattern.lag === 0 ? "the same day" : `~${pattern.lag} ${pattern.lag === 1 ? "day" : "days"} later`;
  const headline = `${pattern.factorLabel} tended to precede ${isLower ? "lower" : "higher"} ${pattern.outcomeLabel} ${lag}.`;
  const factor = pattern.factorId === "short-sleep" ? "nights under 6.5 hours of sleep" : pattern.factorId === "steady-sleep" ? "nights with 7 or more hours of sleep" : `${pattern.factorLabel.toLowerCase()} being logged`;
  const direction = isLower ? "lower" : "higher";
  return { headline, supporting: `Your data suggests ${factor} has often been followed by ${direction} ${pattern.outcomeLabel} about ${pattern.lag} ${pattern.lag === 1 ? "day" : "days"} later. This reflects your own logs, not a cause.`, lagLabel: pattern.lag === 0 ? "Same day" : `${pattern.lag}–${pattern.lag + 1} day lag` };
}

export function makeExperiment(pattern: Pattern, durationDays: number, dayNumber: number, today = toLocalISO(new Date())): Experiment {
  const lagLabel = pattern.lag > 0 ? ` (~${pattern.lag}-day lag)` : "";
  return { id: `${pattern.id}-${Date.now()}`, name: pattern.factorId.includes("sleep") ? "A more consistent sleep window" : `Notice your ${pattern.factorLabel.toLowerCase()} routine`,
    patternId: pattern.id, factorLabel: pattern.factorLabel, outcomeLabel: pattern.outcomeLabel, lag: pattern.lag,
    durationDays, startDate: today, startDay: dayNumber, status: "active", dailyNotes: [],
  };
}
export function experimentProgress(experiment: Experiment, day: number) { return Math.min(experiment.durationDays, Math.max(1, day - experiment.startDay + 1)); }
export function experimentComparison(experiment: Experiment, data: RootedData) {
  const end = experiment.startDay + experiment.durationDays - 1;
  const experimental = data.logs.filter((log) => log.dayNumber >= experiment.startDay && log.dayNumber <= end && log.scalpComfort > 0).map((log) => log.scalpComfort);
  const comparable = experiment.factorLabel.includes("sleep")
    ? data.logs.filter((log) => log.sleepHours != null && log.sleepHours < 6.5 && log.dayNumber < experiment.startDay).map((log) => log.scalpComfort)
    : data.logs.filter((log) => log.dayNumber < experiment.startDay).map((log) => log.scalpComfort);
  return { experimental: average(experimental), experimentalCount: experimental.length, baseline: average(comparable), baselineCount: comparable.length, complete: end <= day };
}

export function journeyStats(data: RootedData) {
  const patterns = discoverPatterns(data);
  const regularity = data.logs.filter((log) => log.factors.includes("hard-water") || log.factors.includes("oiling")).map((log) => log.dayNumber);
  const intervals = regularity.slice(1).map((day, index) => day - (regularity[index] ?? day));
  const mostCommonInterval = intervals.length ? Math.max(...new Set(intervals.map((value) => [value, intervals.filter((item) => item === value).length] as const)).map((item) => item[1])) : null;
  const routines = new Map<string, number>();
  for (const log of data.logs) for (const routine of log.routines) routines.set(routine, (routines.get(routine) ?? 0) + 1);
  for (const log of data.logs) for (const factorId of log.factors) {
    const factor = FACTOR_BY_ID[factorId];
    if (factor && factorId === "oiling") routines.set("Champi / scalp oiling", (routines.get("Champi / scalp oiling") ?? 0) + 1);
  }
  return { patterns, topFactors: patterns.slice(0, 3), routines: Array.from(routines, ([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count), mostCommonInterval };
}

export function serializeData(data: RootedData) { return JSON.stringify(data); }
export function readSavedData() {
  try {
    const raw = window.localStorage.getItem("rooted-wellness-data-v1");
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || !("version" in parsed) || parsed.version !== 1 || !("logs" in parsed) || !Array.isArray(parsed.logs)) return null;
    return parsed as RootedData;
  } catch { return null; }
}
export function persistData(data: RootedData) {
  try {
    window.localStorage.setItem("rooted-wellness-data-v1", serializeData(data));
    return true;
  } catch { return false; }
}
export function clearSavedData() {
  try { window.localStorage.removeItem("rooted-wellness-data-v1"); return true; } catch { return false; }
}
export function makePrintableSummary(data: RootedData) {
  const stats = journeyStats(data);
  return `ROOTED — PERSONAL WELLNESS SUMMARY\nFind what works for you.\n\n${data.logs.length} check-ins • ${data.profile.startDate} to ${data.logs.at(-1)?.date ?? data.profile.startDate}\n\nOBSERVED PATTERNS\n${stats.patterns.filter((pattern) => pattern.status === "observed").map((pattern) => `• ${describePattern(pattern).headline} Observed across ${pattern.observations} instances.`).join("\n") || "No observed patterns yet."}\n\nEMERGING CLUES\n${stats.patterns.filter((pattern) => pattern.status === "emerging").map((pattern) => `• ${describePattern(pattern).headline} ${pattern.observations} observations.`).join("\n") || "No emerging clues yet."}\n\nLOGGED ROUTINES\n${stats.routines.map((item) => `• ${item.name}: ${item.count} ${item.count === 1 ? "log" : "logs"}`).join("\n") || "No routines recorded yet."}\n\nPERSONAL BASELINE\n${data.logs.length ? `Average scalp comfort: ${(average(data.logs.map((log) => log.scalpComfort))).toFixed(1)} / 10. Average skin feel: ${average(data.logs.map((log) => log.skinFeel)).toFixed(1)} / 10.` : "More daily check-ins will help build your baseline."}\n\nROOTED reflects patterns in your logged observations. These relationships do not establish that any factor caused a change. This personal wellness summary is not medical advice.`;
}
