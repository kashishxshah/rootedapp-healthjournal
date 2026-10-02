import { addDays, currentDay, discoverPatterns, toLocalISO, type DailyLog, type RootedData } from "@/lib/rooted";

export function buildDemoData(): RootedData {
  const startDate = addDays(toLocalISO(new Date()), -17);
  const shortSleep: Record<number, number> = { 2: 5.1, 6: 5.6, 10: 5.4, 14: 4.9 };
  const lowerComfort = new Map([[4, 4.5], [8, 5.0], [12, 4.1], [16, 4.8]]);
  const logs: DailyLog[] = Array.from({ length: 18 }, (_, index) => {
    const dayNumber = index + 1;
    const factors: string[] = [];
    const routines: string[] = [];
    if (dayNumber % 6 === 0 || dayNumber === 17) factors.push("hard-water");
    if (dayNumber % 4 === 0 || dayNumber === 15) { factors.push("oiling"); routines.push("Scalp oil massage"); }
    if ([3, 9, 15].includes(dayNumber)) factors.push("humidity");
    if ([5, 11, 17].includes(dayNumber)) factors.push("late-dinner");
    if ([7, 14].includes(dayNumber)) factors.push("stress");
    if ([2, 8, 13].includes(dayNumber)) factors.push("outdoor");
    const scalpComfort = lowerComfort.get(dayNumber) ?? [7.5, 7.2, 8, 7, 7.7, 7.4, 8.2][dayNumber % 7] ?? 7.2;
    const scalpFeel = scalpComfort >= 7.5 ? "Calm & balanced" : scalpComfort <= 5 ? "Mild itchy spots" : "Oily roots / Dry ends";
    const log: DailyLog = {
      date: addDays(startDate, index), dayNumber, scalpComfort, scalpFeel,
      scalpDryness: factors.includes("oiling") ? 3 + dayNumber % 2 : factors.includes("hard-water") ? 7 + dayNumber % 2 : 4 + dayNumber % 3,
      skinFeel: [6.1, 7.2, 5.8, 7.6, 6.6][dayNumber % 5] ?? 6.6,
      skinState: dayNumber % 4 === 0 ? "Cheek tightness" : dayNumber % 3 === 0 ? "Fresh & dewy" : "Grounded / Calm",
      sleepHours: shortSleep[dayNumber] ?? [7.7, 6.8, 8.1, 7.3, 6.1, 7.9, 7.0][dayNumber % 7] ?? 7,
      stressScore: dayNumber % 5 === 2 ? 7 : dayNumber % 4,
      factors, routines: factors.includes("hard-water") ? [...routines, "Gentle cleanser"] : routines,
      note: dayNumber === 16 ? "Softer feeling after my regular wash." : "",
    };
    return log;
  });
  const data: RootedData = { version: 1, mode: "demo", profile: { name: "Ananya", startDate }, logs, experiments: [] };
  const pattern = discoverPatterns(data).find((item) => item.factorId === "short-sleep" && item.outcome === "scalpComfort" && item.status === "observed");
  if (pattern) {
    data.experiments.push({
      id: `demo-experiment-${pattern.id}`, name: "A steadier sleep window", patternId: pattern.id,
      factorLabel: pattern.factorLabel, outcomeLabel: pattern.outcomeLabel, lag: pattern.lag,
      durationDays: 10, startDate: addDays(toLocalISO(new Date()), -5), startDay: Math.max(1, currentDay(data) - 5),
      status: "active",
      dailyNotes: [{ dayNumber: currentDay(data) - 3, date: addDays(toLocalISO(new Date()), -3), note: "A calmer wind-down tonight.", comfort: 7.5 }],
    });
  }
  return data;
}
