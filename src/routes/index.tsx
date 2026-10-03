import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import {
  ArrowDownToLine, ArrowLeft, ArrowRight, BadgeCheck, BedDouble, BookOpen,
  CalendarDays, ChartNoAxesColumnIncreasing, Check, CheckCircle2, Circle,
  CircleAlert, ClipboardCheck, CloudRain, Droplets, Fingerprint, FlaskConical,
  Flower2, Heart, Lightbulb, Leaf, LockKeyhole, Menu, Moon, Pencil, Plus,
  RotateCcw, ShieldCheck, Sparkles, Sprout, Sun, Trash2, TrainFront, Utensils,
  Waves, Wind, X, type LucideIcon,
} from "lucide-react";
import rootedEmblem from "@/assets/rooted-emblem.png";
import { Button } from "@/components/ui/button";
import {
  addDays, clearSavedData, currentDay, dateDay, describePattern, discoverPatterns,
  experimentComparison, experimentProgress, FACTOR_BY_ID, FACTORS, HAIR_FEELS,
  journeyStats, makeExperiment, makeFresh, makePrintableSummary, persistData,
  readSavedData, SKIN_FEELS, toLocalISO, type DailyLog, type Experiment, type FactorId,
  type OutcomeKey, type Pattern, type RootedData,
} from "@/lib/rooted";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROOTED — Find what works for you." },
      { name: "description", content: "A gentle personal wellness journal to discover everyday patterns in how your hair, scalp and skin feel over time." },
      { property: "og:title", content: "ROOTED — Find what works for you." },
      { property: "og:description", content: "Notice what your everyday routines share with how you feel, one thoughtful check-in at a time." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RootedApp,
});

const iconMap: Record<string, LucideIcon> = {
  "droplets": Droplets, "waves": Waves, "cloud-rain": CloudRain, "flame": Sun,
  "train-front": TrainFront, "utensils": Utensils, "flask-conical": FlaskConical, "briefcase-business": Wind,
};

type Tab = "today" | "patterns" | "experiments" | "journey";
const navigation: { id: Tab; label: string; Icon: LucideIcon; verb: string }[] = [
  { id: "today", label: "Today", Icon: Sprout, verb: "Log" },
  { id: "patterns", label: "Patterns", Icon: Flower2, verb: "Understand" },
  { id: "experiments", label: "Experiments", Icon: FlaskConical, verb: "Test" },
  { id: "journey", label: "Journey", Icon: BookOpen, verb: "Learn" },
];

const initialDraft = () => ({ scalpFeel: "", skinState: "", factors: [] as string[], sleep: 7.5, stress: 4, note: "" });
const comfortFromFeel = (feel: string) => feel === "Mild itchy spots" ? 4.5 : feel === "Oily roots / Dry ends" ? 5.5 : feel === "Soft & hydrated" ? 9 : 8;
const drynessFromFeel = (feel: string) => feel === "Mild itchy spots" ? 7 : feel === "Oily roots / Dry ends" ? 6 : feel === "Soft & hydrated" ? 2 : 3;
const skinScoreFromFeel = (feel: string) => feel === "Cheek tightness" ? 4.5 : feel === "T-zone shine" ? 5.5 : feel === "Fresh & dewy" ? 9 : 8;

function RootedApp() {
  const [data, setData] = useState<RootedData | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("today");
  const [draft, setDraft] = useState(initialDraft);
  const [storageWarning, setStorageWarning] = useState(false);
  const [checkedIn, setCheckedIn] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [selectedPattern, setSelectedPattern] = useState<Pattern | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const [freshConfirm, setFreshConfirm] = useState(false);
  const [experimentDuration, setExperimentDuration] = useState(7);
  const today = toLocalISO(new Date());

  useEffect(() => {
    const saved = readSavedData();
    if (saved) setData(saved);
    setIsReady(true);
  }, []);

  const day = data ? currentDay(data, today) : 1;
  const todayLog = data?.logs.find((log) => log.date === today);
  const loggedToday = Boolean(todayLog);
  const patterns = useMemo(() => data ? discoverPatterns(data) : [], [data]);
  const observedPatterns = patterns.filter((pattern) => pattern.status === "observed");
  const emergingPatterns = patterns.filter((pattern) => pattern.status === "emerging");
  const selectedActiveExperiment = data?.experiments.find((experiment) => experiment.status === "active");

  useEffect(() => {
    if (!data) return;
    const log = data.logs.find((entry) => entry.date === today);
    if (log) {
      setDraft({ scalpFeel: log.scalpFeel ?? "", skinState: log.skinState ?? "", factors: [...log.factors], sleep: log.sleepHours ?? 7.5, stress: log.stressScore ?? 4, note: log.note });
    } else {
      setDraft(initialDraft());
    }
    setCheckedIn(false);
  }, [data?.profile.startDate, today, loggedToday, data?.logs.length]);

  const updateData = useCallback((next: RootedData, message?: string) => {
    setData(next);
    setStorageWarning(!persistData(next));
    if (message) setFeedback(message);
  }, []);

  function begin(mode: "demo" | "fresh") {
    const starting: RootedData = mode === "demo"
      ? (() => {
          const { buildDemoData } = demoBuilder;
          return buildDemoData();
        })()
      : makeFresh();
    updateData(starting);
    setActiveTab("today");
    setFeedback(mode === "demo" ? "Your sample journal is ready." : "Your new 28-day journey has begun.");
  }

  function toggleFactor(factor: string) {
    setDraft((previous) => ({ ...previous, factors: previous.factors.includes(factor) ? previous.factors.filter((id) => id !== factor) : [...previous.factors, factor] }));
  }

  function saveCheckin(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!data || !draft.scalpFeel || !draft.skinState) {
      setFeedback("Choose how your scalp and skin feel to complete today’s check-in.");
      return;
    }
    const log: DailyLog = {
      date: today,
      dayNumber: dateDay(data.profile.startDate, today),
      scalpFeel: draft.scalpFeel,
      scalpComfort: comfortFromFeel(draft.scalpFeel),
      scalpDryness: drynessFromFeel(draft.scalpFeel),
      skinState: draft.skinState,
      skinFeel: skinScoreFromFeel(draft.skinState),
      sleepHours: draft.sleep,
      stressScore: draft.stress,
      factors: draft.factors,
      routines: draft.factors.includes("oiling") ? ["Champi / scalp oiling"] : [],
      note: draft.note.trim(),
    };
    const existing = data.logs.some((entry) => entry.date === today);
    const next = { ...data, mode: existing ? data.mode : "personal" as const, logs: [...data.logs.filter((entry) => entry.date !== today), log].sort((a, b) => a.dayNumber - b.dayNumber) };
    updateData(next, existing ? "Today’s check-in has been updated." : "Today’s check-in is saved — thank you for noticing.");
    setCheckedIn(true);
  }

function addExperiment(pattern: Pattern, duration = 7) {
  if (!data) return;

  const experimentStartDay = currentDay(data, today);

  const newExperiment = makeExperiment(
    pattern,
    duration,
    experimentStartDay,
    today
  );

  updateData(
    { ...data, experiments: [newExperiment, ...data.experiments] },
    "Your experiment has begun. You can note an observation each day."
  );

  setActiveTab("experiments");
  setSelectedPattern(null);
}

function saveExperimentNote(experiment: Experiment, note: string) {
  const trimmed = note.trim();
  if (!trimmed || !data) return;

  const currentDay = currentDay(data, today);

  const entry = {
    dayNumber: currentDay,
    date: today,
    note: trimmed,
    comfort: todayLog?.scalpComfort ?? null,
  };

  patchExperiment(
    experiment.id,
    (item) => ({
      ...item,
      dailyNotes: [
        ...item.dailyNotes.filter(
          (existing) => existing.dayNumber !== currentDay
        ),
        entry,
      ],
    }),
    "Your experiment note is saved."
  );
}

  function downloadSummary() {
    if (!data) return;
    const text = makePrintableSummary(data);
    const escaped = text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
    const printable = `<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>ROOTED · Your personal wellness summary</title><link rel="preconnect" href="https://fonts.googleapis.com"><link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@500;600&family=Plus+Jakarta+Sans:wght@400;500;600&display=swap" rel="stylesheet"><style>body{max-width:46rem;margin:4rem auto;padding:1.5rem;font:16px/1.8 'Plus Jakarta Sans',sans-serif;color:#253b2b}h1{font:600 2rem 'Playfair Display',serif}pre{white-space:pre-wrap;font:inherit}.print{position:fixed;right:1.25rem;top:1.25rem;padding:.8rem 1.2rem;border:0;border-radius:1rem;background:#183b1e;color:white;font:600 14px 'Plus Jakarta Sans',sans-serif;cursor:pointer}@media print{.print{display:none}body{margin:0}}</style><button class="print" onclick="window.print()">Print or save as PDF</button><h1>ROOTED</h1><pre>${escaped}</pre></html>`;
    const address = URL.createObjectURL(new Blob([printable], { type: "text/html;charset=utf-8" }));
    window.open(address, "_blank", "noopener,noreferrer");
    setFeedback("Your private, printable summary is ready in a new tab.");
    window.setTimeout(() => URL.revokeObjectURL(address), 60_000);
  }

  useEffect(() => {
    if (!selectedPattern) return;
    function closeOnEscape(event: KeyboardEvent) { if (event.key === "Escape") setSelectedPattern(null); }
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [selectedPattern]);

  if (!isReady) return <main className="rooted-shell grid min-h-screen place-items-center"><span className="text-sm text-muted-foreground" role="status">Opening your journal…</span></main>;
  if (!data) return <Welcome onBegin={begin} />;

  const name = data.profile.name.trim().split(/\s+/)[0] || "friend";
  const tabs = activeTab === "today" ? <TodayScreen data={data} day={day} todayLog={todayLog} draft={draft} setDraft={setDraft} toggleFactor={toggleFactor} saveCheckin={saveCheckin} feedback={feedback} loggedToday={loggedToday} checkedIn={checkedIn} name={name} />
    : activeTab === "patterns" ? <PatternsScreen data={data} patterns={patterns} observed={observedPatterns} emerging={emergingPatterns} onExplore={setSelectedPattern} onExperiment={addExperiment} />
    : activeTab === "experiments" ? <ExperimentsScreen data={data} patterns={patterns} day={day} todayLog={todayLog} onStart={addExperiment} onUpdate={patchExperiment} onSaveNote={saveExperimentNote} feedback={feedback} duration={experimentDuration} setDuration={setExperimentDuration} />
    : <JourneyScreen data={data} day={day} patterns={patterns} onDownload={downloadSummary} />;

  return (
    <main className="rooted-shell rooted-grain min-h-svh">
      <div className="mx-auto flex min-h-svh w-full max-w-[720px] flex-col border-border/50 sm:border-x">
        <AppHeader data={data} day={day} onProfile={() => setProfileOpen((current) => !current)} profileOpen={profileOpen} onProfileChange={(nameValue) => updateData({ ...data, profile: { ...data.profile, name: nameValue } }, "Your name has been updated.")} onDemo={() => begin("demo")} onFresh={() => setFreshConfirm(true)} onClear={() => { clearSavedData(); setData(null); setProfileOpen(false); setFeedback(""); }} />
        <div className="rooted-safe-bottom flex-1 px-4 pb-32 pt-6 sm:px-8 sm:pt-8">
          {storageWarning && <div role="status" className="mb-5 flex items-start gap-2.5 rounded-2xl border border-border bg-card/90 p-3 text-sm leading-5 text-muted-foreground"><LockKeyhole className="mt-0.5 size-4 shrink-0 text-secondary" />Your journal is available in this tab, but this browser can’t save changes between visits.</div>}
          {tabs}
        </div>
        <BottomNav activeTab={activeTab} onChange={(tab) => { setActiveTab(tab); setFeedback(""); setSelectedPattern(null); }} />
      </div>
      {selectedPattern && <PatternDialog pattern={selectedPattern} data={data} onClose={() => setSelectedPattern(null)} onExperiment={addExperiment} />}
      {freshConfirm && <ConfirmationDialog title="Start a fresh journey?" description="This replaces your current saved journal with an empty 28-day journey. You can load the sample journal again any time." confirmLabel="Start fresh" onCancel={() => setFreshConfirm(false)} onConfirm={() => { setFreshConfirm(false); begin("fresh"); }} />}
    </main>
  );
}

/* Demo lives behind its own import-free wrapper so all derived cards use the same data engine as personal entries. */
import { buildDemoData } from "@/lib/rooted-demo";
const demoBuilder = { buildDemoData };

function Welcome({ onBegin }: { onBegin: (mode: "demo" | "fresh") => void }) {
  return (
    <main className="rooted-shell rooted-grain grid min-h-svh place-items-center px-6 py-12">
      <section aria-labelledby="welcome-title" className="mx-auto flex w-full max-w-md flex-col items-center text-center">
        <div className="mb-5 grid size-[4.5rem] place-items-center rounded-[1.6rem] border border-primary/10 bg-card shadow-sm"><img src={rootedEmblem} alt="" className="size-12 object-contain" /></div>
        <p className="mb-2 text-[0.7rem] font-semibold uppercase tracking-[0.15em] text-secondary">A gentle journal for getting to know you</p>
        <h1 id="welcome-title" className="rooted-title text-6xl font-semibold text-primary sm:text-7xl">Rooted</h1>
        <p className="rooted-title mt-3 text-xl italic leading-8 text-secondary">Find what works for you.</p>
        <p className="mt-5 max-w-sm text-[0.92rem] leading-7 text-muted-foreground">Notice everyday patterns between your routines and how your hair, scalp, and skin feel over time.</p>
        <div className="mt-10 flex w-full flex-col gap-3">
          <Button onClick={() => onBegin("demo")} size="lg" className="h-14 w-full rounded-full text-base shadow-sm"><Sparkles aria-hidden="true" />Explore the journal</Button>
          <Button onClick={() => onBegin("fresh")} variant="outline" size="lg" className="h-12 w-full rounded-full">Start fresh</Button>
        </div>
        <div className="mt-12 flex items-center justify-center gap-2.5 text-xs text-muted-foreground"><ShieldCheck className="size-4 shrink-0 text-primary" /><p>Your notes stay in this browser. No account needed.</p></div>
        <p className="mt-7 text-xs leading-5 text-muted-foreground">A personal wellness journal, not a diagnostic tool or medical advice.</p>
      </section>
    </main>
  );
}

function AppHeader({ data, day, profileOpen, onProfile, onProfileChange, onDemo, onFresh, onClear }: { data: RootedData; day: number; profileOpen: boolean; onProfile: () => void; onProfileChange: (name: string) => void; onDemo: () => void; onFresh: () => void; onClear: () => void }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/45 bg-background/95 px-4 py-3 backdrop-blur-md sm:px-8">
      <div className="flex min-h-11 items-center justify-between">
        <a href="#today" aria-label="ROOTED today" className="flex items-center gap-3" onClick={(event) => { event.preventDefault(); document.querySelector<HTMLButtonElement>('[data-tab="today"]')?.click(); }}>
          <img src={rootedEmblem} alt="" className="size-10 rounded-[0.85rem] bg-card object-contain p-1.5" />
          <span><span className="rooted-title block text-[1.45rem] font-semibold leading-6 text-primary">Rooted</span><span className="block text-[0.7rem] font-medium text-secondary">Day {day} of 28</span></span>
        </a>
        <details open={profileOpen} className="group/profile relative" onToggle={(event) => { if (!event.currentTarget.open && profileOpen) onProfile(); }}>
          <summary onClick={(event) => { event.preventDefault(); onProfile(); }} className="grid size-11 cursor-pointer list-none place-items-center rounded-full border border-primary/10 bg-secondary/75 text-sm font-semibold text-primary transition-colors hover:bg-secondary"><span aria-label={`Profile settings for ${data.profile.name}`}>{(data.profile.name.trim().charAt(0) || "A").toUpperCase()}</span><span className="sr-only">Profile and journal settings</span></summary>
          <div className="absolute right-0 top-14 z-50 w-[min(19rem,calc(100vw-2rem))] rounded-2xl border border-border bg-popover p-4 text-popover-foreground shadow-lg shadow-foreground/5">
            <ProfileSettings data={data} onName={onProfileChange} onDemo={onDemo} onFresh={onFresh} onClear={onClear} />
          </div>
        </details>
      </div>
    </header>
  );
}

function ProfileSettings({ data, onName, onDemo, onFresh, onClear }: { data: RootedData; onName: (name: string) => void; onDemo: () => void; onFresh: () => void; onClear: () => void }) {
  const [name, setName] = useState(data.profile.name);
  useEffect(() => { setName(data.profile.name); }, [data.profile.name]);
  return (
    <div className="space-y-4" onClick={(event) => event.stopPropagation()}>
      <div><p className="text-sm font-semibold text-foreground">Your journal</p><p className="mt-0.5 text-xs text-muted-foreground">{data.mode === "demo" ? "Exploring a sample journal" : `${data.logs.length} saved check-in${data.logs.length === 1 ? "" : "s"}`} · saved only on this device</p></div>
      <form onSubmit={(event) => { event.preventDefault(); if (name.trim()) onName(name.trim().slice(0, 36)); }} className="space-y-2">
        <label htmlFor="profile-name" className="text-xs font-medium text-muted-foreground">Your name</label>
        <input id="profile-name" maxLength={36} value={name} onChange={(event) => setName(event.target.value)} className="h-10 w-full rounded-xl border border-input bg-background px-3 text-sm focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/30" />
        <Button type="submit" size="sm" variant="secondary" className="w-full rounded-full">Save name</Button>
      </form>
      <div className="grid gap-2 border-t border-border pt-3"><Button variant="ghost" onClick={onDemo} size="sm" className="justify-start rounded-xl"><RotateCcw />Load 28-day demo data</Button><Button variant="ghost" onClick={onFresh} size="sm" className="justify-start rounded-xl"><Sprout />Start a fresh journey</Button><Button variant="ghost" onClick={onClear} size="sm" className="justify-start rounded-xl text-destructive"><Trash2 />Clear my saved journal</Button></div>
    </div>
  );
}

function BottomNav({ activeTab, onChange }: { activeTab: Tab; onChange: (tab: Tab) => void }) {
  return (
    <nav aria-label="Main navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-border/65 bg-background/95 px-2 pb-[max(env(safe-area-inset-bottom),0.45rem)] pt-2 shadow-[0_-8px_28px_-23px_var(--foreground)] backdrop-blur-md">
      <div className="mx-auto grid w-full max-w-[720px] grid-cols-4 gap-1">
        {navigation.map(({ id, label, verb, Icon }) => <Button key={id} data-tab={id} variant="ghost" aria-current={activeTab === id ? "page" : undefined} aria-label={`${label} · ${verb}`} onClick={() => onChange(id)} className={`flex h-[3.6rem] flex-col gap-0.5 rounded-[1.15rem] px-1 py-1.5 text-[0.67rem] font-medium ${activeTab === id ? "bg-secondary/85 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground"}`}><Icon aria-hidden="true" className="size-[1.12rem]" strokeWidth={activeTab === id ? 2.2 : 1.8} /><span>{label}</span></Button>)}
      </div>
    </nav>
  );
}

function TodayScreen({ data, day, todayLog, draft, setDraft, toggleFactor, saveCheckin, feedback, loggedToday, checkedIn, name }: { data: RootedData; day: number; todayLog: DailyLog | undefined; draft: ReturnType<typeof initialDraft>; setDraft: React.Dispatch<React.SetStateAction<ReturnType<typeof initialDraft>>>; toggleFactor: (id: string) => void; saveCheckin: (event: FormEvent<HTMLFormElement>) => void; feedback: string; loggedToday: boolean; checkedIn: boolean; name: string }) {
  return (
    <div className="mx-auto w-full max-w-[590px] space-y-7">
      <section aria-labelledby="today-heading" className="pt-1">
        <p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.15em] text-primary">{toLocalISO(new Date()).slice(0, 7).replace("-", " / ")} <span aria-hidden="true">·</span> {loggedToday ? "Your day, noticed" : "A moment for yourself"}</p>
        <h1 id="today-heading" className="rooted-title text-[2rem] font-semibold leading-[1.17] text-primary">Good evening, {name}</h1>
        <p className="mt-2 text-[0.91rem] leading-7 text-muted-foreground">{loggedToday && !checkedIn ? "You’ve already logged today. Adjust your reflections whenever you like." : "20 seconds to reflect on your day. Find what works for you."}</p>
      </section>
      <form onSubmit={saveCheckin} className="space-y-7" aria-label="Today’s personal check-in">
        <section aria-labelledby="daily-feel-heading" className="rounded-[1.7rem] border border-border/55 bg-card p-4 shadow-sm shadow-primary/[0.025] sm:p-6">
          <div className="mb-4 flex items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-background text-secondary"><Sparkles className="size-5" aria-hidden="true" /></span><div><p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-secondary">Daily feel</p><h2 id="daily-feel-heading" className="rooted-title text-xl font-medium text-primary">Hair &amp; Scalp Feel</h2></div></div>
          <ChoiceGroup legend="Choose one description of your hair and scalp" options={HAIR_FEELS} selected={draft.scalpFeel} onChange={(value) => setDraft((old) => ({ ...old, scalpFeel: value }))} />
          <div className="my-5 h-px bg-border/70" />
          <p className="mb-3 flex items-center gap-2 text-sm font-medium text-foreground"><Heart className="size-4 text-primary" aria-hidden="true" />Skin barrier state</p>
          <ChoiceGroup legend="Choose one description of your skin" options={SKIN_FEELS} selected={draft.skinState} onChange={(value) => setDraft((old) => ({ ...old, skinState: value }))} />
        </section>
        <section aria-labelledby="factors-heading">
          <SectionHeading icon={<Flower2 />} title="Today’s factors & routines" side="Tap to note" headingId="factors-heading" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:gap-2.5">
            {FACTORS.map((factor, index) => <FactorButton key={factor.id} factor={factor} index={index} selected={draft.factors.includes(factor.id)} onClick={() => toggleFactor(factor.id)} />)}
          </div>
        </section>
        <section aria-labelledby="flow-heading" className="rounded-[1.7rem] border border-border/55 bg-card p-4 sm:p-6">
          <SectionHeading icon={<ChartNoAxesColumnIncreasing />} title="Daily flow" side="How it felt" headingId="flow-heading" />
          <div className="mt-4 space-y-3">
            <RangeCard label="Sleep quality" icon={<Moon />} value={draft.sleep} onChange={(value) => setDraft((old) => ({ ...old, sleep: value }))} min={0} max={10} step={0.5} display={`${draft.sleep.toFixed(1)} hours`} leftLabel="Restless" middleLabel="As usual" rightLabel="Deep & restful" />
            <RangeCard label="Stress pulse" icon={<Heart />} value={draft.stress} onChange={(value) => setDraft((old) => ({ ...old, stress: value }))} min={0} max={10} step={1} display={`${draft.stress} / 10`} leftLabel="Quiet" middleLabel="Focused" rightLabel="A lot to hold" terracotta />
          </div>
        </section>
        <section aria-labelledby="note-heading">
          <SectionHeading icon={<Pencil />} title="A gentle note" side="Optional" headingId="note-heading" />
          <div className="mt-3 rounded-[1.4rem] border border-border/50 bg-card p-4">
            <label htmlFor="daily-note" className="sr-only">Anything you noticed today?</label>
            <textarea id="daily-note" value={draft.note} maxLength={280} onChange={(event) => setDraft((old) => ({ ...old, note: event.target.value }))} placeholder="A wash, a little shift, or something on your mind…" className="min-h-[6rem] w-full resize-y bg-transparent text-[0.93rem] leading-7 text-foreground placeholder:text-muted-foreground/70 focus:outline-none" />
            <p className="mt-1 text-right text-xs tabular-nums text-muted-foreground">{draft.note.length} / 280</p>
          </div>
        </section>
        <div className="space-y-3">
          <Button type="submit" size="lg" className="h-[3.6rem] w-full rounded-2xl text-base shadow-md shadow-primary/10"><CheckCircle2 aria-hidden="true" />{loggedToday ? "Save today’s changes" : "Complete today’s check-in"}</Button>
          <div className="min-h-[1.5rem] text-center" aria-live="polite" aria-atomic="true">{feedback ? <p className={`inline-flex items-center justify-center gap-2 text-sm ${checkedIn ? "text-primary" : "text-muted-foreground"}`}>{checkedIn && <CheckCircle2 className="size-4" />} {feedback}</p> : <p className="rooted-title text-sm italic leading-6 text-muted-foreground">Keep checking in. Your patterns will become clearer.</p>}</div>
        </div>
      </form>
      {todayLog && <aside className="rounded-2xl border border-border/50 bg-accent/40 px-4 py-3 text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Already reflected today.</span> Your entries contribute to personal patterns only as more observations build up.</aside>}
    </div>
  );
}

function ChoiceGroup<T extends string>({ legend, options, selected, onChange }: { legend: string; options: readonly T[]; selected: string; onChange: (value: T) => void }) {
  return <fieldset><legend className="sr-only">{legend}</legend><div className="grid grid-cols-2 gap-2">{options.map((option, index) => { const active = selected === option; const terracotta = active && index === 2; return <button type="button" key={option} aria-pressed={active} onClick={() => onChange(option)} className={`flex min-h-[2.65rem] items-center justify-start gap-2 rounded-full border px-3 py-2 text-left text-[0.77rem] font-medium leading-5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${active ? terracotta ? "border-secondary bg-secondary text-secondary-foreground shadow-sm" : "border-primary bg-primary text-primary-foreground shadow-sm" : "border-border/70 bg-background text-foreground hover:border-primary/40 hover:bg-accent/70"}`}><span className={`size-2 shrink-0 rounded-full ${active ? "bg-primary-foreground/80" : "bg-muted-foreground/35"}`} aria-hidden="true" />{option}</button>; })}</div><p className="sr-only" aria-live="polite">{selected ? `Selected: ${selected}` : "Please choose one option"}</p></fieldset>;
}

function SectionHeading({ icon, title, side, headingId }: { icon: React.ReactNode; title: string; side?: string; headingId: string }) {
  return <div className="flex items-end justify-between gap-2"><h2 id={headingId} className="rooted-title flex min-w-0 items-center gap-2 text-[1.22rem] font-medium leading-7 text-primary sm:text-[1.35rem]"><span className="shrink-0 text-secondary">{icon}</span>{title}</h2>{side && <span className="shrink-0 pb-0.5 text-xs font-medium text-muted-foreground">{side}</span>}</div>;
}

function FactorButton({ factor, index, selected, onClick }: { factor: (typeof FACTORS)[number]; index: number; selected: boolean; onClick: () => void }) {
  const Icon = iconMap[factor.icon] ?? Leaf;
  const tint = index === 2 ? "bg-secondary/10 text-secondary" : index === 0 || index === 4 ? "bg-accent text-primary" : "bg-muted text-muted-foreground";
  return <Button type="button" variant="ghost" aria-pressed={selected} onClick={onClick} className={`group flex min-h-[4.35rem] items-start justify-start gap-2.5 whitespace-normal rounded-2xl border px-2.5 py-3 text-left shadow-sm transition-all sm:gap-3 sm:px-3 ${selected ? "border-primary/30 bg-accent ring-1 ring-primary/15" : "border-border/35 bg-card hover:border-primary/30 hover:bg-background"}`}>
    <span className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-full transition-colors ${selected ? "bg-primary text-primary-foreground" : tint}`}><Icon aria-hidden="true" className="size-[1.05rem]" /></span>
    <span className="min-w-0 flex-1"><span className="block truncate text-[0.76rem] font-medium leading-[1.17rem] text-foreground sm:text-[0.82rem]">{factor.label}</span><span className="mt-0.5 block truncate text-[0.66rem] leading-4 text-muted-foreground">{factor.id === "oiling" ? "Warm oil routine" : factor.id === "hard-water" ? "A tap-water wash" : factor.id === "humidity" ? "Humid conditions" : factor.id === "late-dinner" ? "An evening meal" : factor.id === "stress" ? "A busy day" : "Part of today"}</span></span>
    <span aria-label={selected ? "Noted today" : "Not noted"} className={`mt-1.5 grid size-[1.08rem] shrink-0 place-items-center rounded-full border ${selected ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground/65"}`}>{selected ? <Check aria-hidden="true" className="size-3" /> : <Plus aria-hidden="true" className="size-3" />}</span>
  </Button>;
}

function RangeCard({ label, icon, value, onChange, min, max, step, display, leftLabel, middleLabel, rightLabel, terracotta = false }: { label: string; icon: React.ReactNode; value: number; onChange: (value: number) => void; min: number; max: number; step: number; display: string; leftLabel: string; middleLabel: string; rightLabel: string; terracotta?: boolean }) {
  const controlId = `range-${label.toLowerCase().replaceAll(" ", "-")}`;
  return <div className="rounded-[1.3rem] border border-border/45 bg-background p-3.5 sm:p-4"><div className="mb-3 flex items-center justify-between gap-2"><label htmlFor={controlId} className="flex min-w-0 items-center gap-2 text-[0.83rem] font-medium text-foreground"><span className={terracotta ? "text-secondary" : "text-primary"}>{icon}</span>{label}</label><output htmlFor={controlId} className={`text-right text-[0.75rem] font-semibold tabular-nums ${terracotta ? "text-secondary" : "text-primary"}`}>{display}</output></div><input id={controlId} className="rooted-range block w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-4" type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} aria-valuetext={display} /><div className="mt-2 flex items-center justify-between gap-2 text-[0.64rem] text-muted-foreground sm:text-[0.71rem]"><span>{leftLabel}</span><span>{middleLabel}</span><span className="text-right">{rightLabel}</span></div></div>;
}

function PatternsScreen({ data, patterns, observed, emerging, onExplore, onExperiment }: { data: RootedData; patterns: Pattern[]; observed: Pattern[]; emerging: Pattern[]; onExplore: (pattern: Pattern) => void; onExperiment: (pattern: Pattern, duration?: number) => void }) {
  const unavailable = FACTORS.filter((factor) => data.logs.filter((log) => log.factors.includes(factor.id)).length < 3);
  return (
    <div className="mx-auto w-full max-w-[590px] space-y-7">
      <section className="pt-1"><p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">Patterns from your data</p><h1 className="rooted-title text-[2rem] font-semibold leading-tight text-primary">What we’re noticing</h1><p className="rooted-title mt-2 text-[0.98rem] italic leading-7 text-secondary">“It looks like your data is starting to tell you something.”</p><p className="mt-2 text-sm leading-6 text-muted-foreground">Rooted compares your own daily reflections across up to five days. More check-ins make for more thoughtful comparisons.</p></section>
      {patterns.length > 0 && <div className="flex flex-wrap items-center justify-between gap-2 text-xs"><span className="inline-flex items-center gap-2 font-semibold uppercase tracking-[0.08em] text-foreground"><Fingerprint className="size-4 text-primary" />Observed patterns</span><span className="rounded-full bg-accent px-3 py-1 font-medium text-primary">{observed.length ? `${observed.length} observed` : "Still collecting observations"}</span></div>}
      {observed.length ? <div className="space-y-4">{observed.map((pattern) => <PatternCard key={pattern.id} pattern={pattern} data={data} onExplore={() => onExplore(pattern)} onExperiment={() => onExperiment(pattern, 7)} />)}</div> : <EmptyInsight title={data.logs.length ? "Your first patterns are taking shape" : "A pattern begins with a check-in"} detail={data.logs.length ? `You’ve logged ${data.logs.length} ${data.logs.length === 1 ? "day" : "days"}. Keep recording what feels ordinary and different; comparisons need several observations.` : "Record a few ordinary days on Today. Rooted will look for delayed relationships in your own check-ins."} icon={<Sparkles />} />}
      {emerging.length > 0 && <section><SectionHeading icon={<Lightbulb />} title="Emerging clues" side="Still collecting data" headingId="emerging-heading" /><div className="mt-3 grid gap-3">{emerging.map((pattern) => <EmergingCard key={pattern.id} pattern={pattern} onExplore={() => onExplore(pattern)} />)}</div></section>}
      {unavailable.length > 0 && <section className="rounded-[1.35rem] border border-border/55 bg-card/85 p-4"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground"><CircleAlert className="size-4" />Not enough observations yet</p><p className="mt-2 text-[0.83rem] leading-6 text-muted-foreground">{unavailable.slice(0, 3).map((factor) => factor.short).join(", ")}{unavailable.length > 3 ? ` and ${unavailable.length - 3} more` : ""} {unavailable.length === 1 ? "has" : "have"} fewer than three logged occurrences. We’re waiting to compare before highlighting anything.</p><div className="mt-3 flex flex-wrap gap-2">{unavailable.slice(0, 4).map((factor) => <span key={factor.id} className="rounded-full border border-border/60 bg-background px-2.5 py-1 text-[0.68rem] text-muted-foreground">{factor.short}</span>)}</div></section>}
      {data.logs.length > 0 && <section className="rounded-2xl border border-border/65 bg-background px-4 py-3.5"><p className="rooted-title text-[0.84rem] italic leading-6 text-muted-foreground"><span className="mr-2 inline-flex align-middle text-primary"><ShieldCheck className="size-4" /></span>Rooted finds patterns in your logged data. A pattern doesn’t mean one factor caused another.</p></section>}
      {observed.length === 0 && emerging.length === 0 && unavailable.length === 0 && patterns.length === 0 && <EmptyInsight title="A pattern begins with a check-in" detail="Your daily reflections stay together in your private, device-only journal." icon={<Sprout />} />}
    </div>
  );
}

function EmptyInsight({ title, detail, icon }: { title: string; detail: string; icon: React.ReactNode }) {
  return <div className="rounded-[1.55rem] border border-border/60 bg-card p-6 sm:p-7"><span className="grid size-10 place-items-center rounded-full bg-accent text-primary">{icon}</span><h2 className="rooted-title mt-3 text-[1.25rem] font-medium text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{detail}</p></div>;
}

function PatternCard({ pattern, data, onExplore, onExperiment }: { pattern: Pattern; data: RootedData; onExplore: () => void; onExperiment: () => void }) {
  const description = describePattern(pattern);
  return <article className="overflow-hidden rounded-[1.55rem] border border-border/55 bg-card shadow-sm shadow-foreground/[0.025]">
    <div className="px-4 pb-4 pt-4 sm:px-5"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-1.5 rounded-full bg-secondary/15 px-2.5 py-1 text-[0.67rem] font-semibold text-secondary"><Sparkles className="size-3" />Observed · {description.lagLabel}</span><span className="ml-auto text-xs font-medium text-muted-foreground">{pattern.observations} observed instances</span></div><p className="rooted-title mt-4 text-[1.23rem] font-medium leading-8 text-foreground">{description.headline}</p><div className="mt-3 rounded-2xl border border-border/45 bg-background px-3 pt-3"><div className="mb-1 flex items-center gap-2 text-[0.68rem] text-muted-foreground"><span className="size-2 rounded-full bg-secondary" aria-hidden="true" />Average rating after each logged factor · /10</div><LagChart pattern={pattern} data={data} /><div className="-mt-1 grid grid-cols-6 text-center text-[0.61rem] tabular-nums text-muted-foreground">{Array.from({ length: 6 }, (_, index) => <span key={index}>{index === 0 ? "Day 0" : `+${index}d`}</span>)}</div></div><div className="mt-3 flex gap-2 rounded-xl bg-accent/65 p-3"><span className="mt-0.5 shrink-0 text-primary"><Lightbulb className="size-4" /></span><p className="text-[0.77rem] leading-6 text-foreground">{description.supporting}</p></div></div>
    <div className="grid grid-cols-1 gap-2 border-t border-border/50 p-3 sm:grid-cols-2"><Button variant="ghost" onClick={onExplore} className="min-h-10 rounded-xl text-[0.79rem]">Explore this pattern <ArrowRight /></Button><Button onClick={onExperiment} className="min-h-10 rounded-xl text-[0.75rem]">Test with a 7-day experiment <ArrowRight /></Button></div>
  </article>;
}

function EmergingCard({ pattern, onExplore }: { pattern: Pattern; onExplore: () => void }) {
  const descriptor = describePattern(pattern);
  const progress = Math.min(100, (pattern.observations / 6) * 100);
  return <button onClick={onExplore} className="w-full rounded-[1.35rem] border border-border/45 bg-card p-4 text-left transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-2"><h3 className="rooted-title text-base font-medium leading-6 text-foreground">{descriptor.headline}</h3><span className="shrink-0 rounded-full bg-secondary/12 px-2 py-1 text-[0.66rem] font-semibold text-secondary">Early signal</span></div><p className="mt-2 text-xs text-muted-foreground">{pattern.observations} observed {pattern.observations === 1 ? "instance" : "instances"} · {descriptor.lagLabel.toLowerCase()}</p><div className="mt-3 h-1.5 overflow-hidden rounded-full bg-background"><span className="block h-full rounded-full bg-secondary/80 transition-all" style={{ width: `${progress}%` }} /></div><p className="mt-2 text-[0.68rem] text-muted-foreground">{Math.max(0, 6 - pattern.observations)} more {6 - pattern.observations === 1 ? "observation" : "observations"} to explore</p></button>;
}

function lagValues(pattern: Pattern, data: RootedData) {
  const exposures = pattern.factorId === "short-sleep" ? data.logs.filter((log) => log.sleepHours != null && log.sleepHours < 6.5) : pattern.factorId === "steady-sleep" ? data.logs.filter((log) => log.sleepHours != null && log.sleepHours >= 7) : data.logs.filter((log) => log.factors.includes(pattern.factorId));
  return Array.from({ length: 6 }, (_, lag) => {
    const readings = exposures.map((log) => data.logs.find((entry) => entry.dayNumber === log.dayNumber + lag)?.[pattern.outcome]).filter((score): score is number => score != null);
    return readings.length ? { lag, score: readings.reduce((sum, value) => sum + value, 0) / readings.length, count: readings.length } : null;
  });
}

function LagChart({ pattern, data }: { pattern: Pattern; data: RootedData }) {
  const values = lagValues(pattern, data);
  const baseline = pattern.baseline;
  const y = (score: number) => 13 + ((10 - score) / 10) * 65;
  const x = (index: number) => 16 + index * 49;
  const plotted = values.flatMap((value, index) => value ? [`${x(index)},${y(value.score)}`] : []);
  return <svg className="pattern-chart h-[94px] w-full overflow-visible" viewBox="0 0 285 96" role="img" aria-label={`${pattern.outcomeLabel} scores at actual logged days zero through five after ${pattern.factorLabel}; typical score ${baseline.toFixed(1)}, at the strongest lag ${pattern.after.toFixed(1)}`}>
    <line x1="8" x2="277" y1={y(baseline)} y2={y(baseline)} className="chart-baseline" />
    <text x="275" y={y(baseline) - 4} textAnchor="end" fontSize="7.4">Typical {baseline.toFixed(1)}</text>
    {plotted.length > 1 && <polyline points={plotted.join(" ")} fill="none" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" className="chart-series" />}
    {values.map((value, index) => value ? <g key={index}><title>{`Day ${index}: observed average ${value.score.toFixed(1)} of 10 across ${value.count} log${value.count === 1 ? "" : "s"}`}</title><circle cx={x(index)} cy={y(value.score)} r={pattern.lag === index ? 5 : 3.5} className="chart-point" /></g> : null)}
  </svg>;
}

function PatternDialog({ pattern, data, onClose, onExperiment }: { pattern: Pattern; data: RootedData; onClose: () => void; onExperiment: (pattern: Pattern, duration: number) => void }) {
  const description = describePattern(pattern);
  const outcomeTitle = pattern.outcome === "scalpComfort" ? "Scalp comfort" : pattern.outcome === "scalpDryness" ? "Scalp dryness" : "Skin comfort";
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} className="fixed inset-0 z-[70] grid place-items-end bg-foreground/30 p-0 backdrop-blur-[3px] sm:place-items-center sm:p-5">
    <section role="dialog" aria-modal="true" aria-labelledby="pattern-dialog-title" className="max-h-[88svh] w-full max-w-lg overflow-y-auto rounded-t-[1.8rem] border border-border bg-background p-5 shadow-2xl shadow-foreground/15 sm:rounded-[1.65rem] sm:p-7">
      <div className="flex items-start justify-between gap-3"><div><span className="inline-flex items-center gap-1.5 rounded-full bg-accent px-2.5 py-1 text-[0.67rem] font-semibold text-primary"><Fingerprint className="size-3" />Personal pattern</span><h2 id="pattern-dialog-title" className="rooted-title mt-3 text-[1.45rem] font-medium leading-8 text-primary">{description.headline}</h2></div><Button aria-label="Close pattern details" onClick={onClose} variant="ghost" size="icon" className="shrink-0 rounded-full"><X /></Button></div>
      <dl className="mt-5 grid grid-cols-2 gap-2.5"><Metric label="Observed lag" value={description.lagLabel} /><Metric label="Observed instances" value={`${pattern.observations}`} /><Metric label={`Average ${outcomeTitle.toLowerCase()} after exposure`} value={`${pattern.after.toFixed(1)} / 10`} /><Metric label="Your typical average" value={`${pattern.baseline.toFixed(1)} / 10`} /></dl>
      <div className="mt-4 flex items-center justify-between rounded-xl bg-accent/70 px-3.5 py-3"><span className="text-sm font-medium text-foreground">Observed difference</span><span className="text-sm font-semibold text-primary">{pattern.difference > 0 ? "+" : "−"}{Math.abs(pattern.difference).toFixed(1)} / 10</span></div>
      <section aria-labelledby="chart-details-heading" className="mt-5"><h3 id="chart-details-heading" className="mb-2 text-sm font-medium text-foreground">Your actual logged ratings</h3><div className="rounded-2xl border border-border bg-card p-3"><LagChart pattern={pattern} data={data} /><div className="grid grid-cols-6 text-center text-[0.6rem] text-muted-foreground">{Array.from({ length: 6 }, (_, index) => <span key={index}>{index === 0 ? "Same day" : `+${index}d`}</span>)}</div></div></section>
      <p className="mt-4 text-[0.78rem] leading-6 text-muted-foreground">Rooted compared your logged {outcomeTitle.toLowerCase()} on days following {pattern.factorLabel.toLowerCase()} with your usual recorded ratings. The observations don’t show that one factor caused another.</p>
      <div className="mt-5 flex flex-col gap-2 sm:flex-row"><Button onClick={() => onExperiment(pattern, 7)} className="h-12 flex-1 rounded-2xl">Test with a 7-day experiment <ArrowRight /></Button><Button variant="outline" onClick={onClose} className="h-12 rounded-2xl">Close</Button></div>
    </section>
  </div>;
}

function Metric({ label, value }: { label: string; value: string }) { return <div className="rounded-xl border border-border/45 bg-card px-3 py-3"><dt className="text-[0.65rem] leading-5 text-muted-foreground">{label}</dt><dd className="mt-1 text-sm font-semibold text-primary">{value}</dd></div>; }

function ExperimentsScreen({ data, patterns, day, todayLog, onStart, onUpdate, onSaveNote, feedback, duration, setDuration }: { data: RootedData; patterns: Pattern[]; day: number; todayLog?: DailyLog; onStart: (pattern: Pattern, duration?: number) => void; onUpdate: (id: string, update: (experiment: Experiment) => Experiment, message: string) => void; onSaveNote: (experiment: Experiment, note: string) => void; feedback: string; duration: number; setDuration: (duration: number) => void }) {
  const ongoing = data.experiments.filter((experiment) => experiment.status === "active" || experiment.status === "paused");
  const archived = data.experiments.filter((experiment) => experiment.status === "completed" || experiment.status === "stopped");
  const suggested = patterns.filter((pattern) => pattern.status === "observed" || pattern.status === "emerging");
  const patternFor = (experiment: Experiment) => patterns.find((pattern) => pattern.id === experiment.patternId);
  return (
    <div className="mx-auto w-full max-w-[590px] space-y-7">
      <section className="pt-1"><p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-secondary">A gentle way to explore</p><h1 className="rooted-title text-[1.95rem] font-semibold leading-tight text-primary">Routine experiments</h1><p className="rooted-title mt-2 text-[0.95rem] italic leading-7 text-muted-foreground">“See what happens when you test an observation. Low pressure, 7 to 14 days.”</p></section>
      {ongoing.map((experiment) => <ActiveExperiment key={experiment.id} experiment={experiment} pattern={patternFor(experiment)} data={data} day={day} todayLog={todayLog} onUpdate={onUpdate} onSaveNote={onSaveNote} />)}
      {ongoing.length === 0 && <div className="rounded-[1.55rem] border border-border/55 bg-card p-5"><span className="grid size-10 place-items-center rounded-full bg-secondary/15 text-secondary"><FlaskConical /></span><h2 className="rooted-title mt-3 text-xl font-medium text-primary">No active experiments yet</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">When a personal pattern appears, choose a small comparison to explore. Experiments are invitations to notice, not instructions to change a routine.</p></div>}
      {feedback && <p role="status" aria-live="polite" className="flex items-center gap-2 text-sm text-primary"><CheckCircle2 className="size-4 shrink-0" />{feedback}</p>}
      <section><div className="flex items-end justify-between gap-3"><div><h2 className="rooted-title text-xl font-medium text-primary">Experiments suggested by your data</h2><p className="mt-1 text-[0.76rem] leading-5 text-muted-foreground">Thoughtful comparisons based only on your own logged observations.</p></div>{suggested.length > 0 && <Sparkles className="mb-1 size-5 shrink-0 text-secondary" />}</div>
        <div className="mt-3 flex items-center justify-between rounded-2xl border border-border/55 bg-card/75 px-3.5 py-3"><span className="text-xs font-medium text-foreground">Try one gentle observation</span><div className="flex gap-1.5">{[7, 10, 14].map((days) => <Button key={days} size="sm" variant={duration === days ? "default" : "outline"} onClick={() => setDuration(days)} aria-pressed={duration === days} className="h-8 min-w-11 rounded-full px-2.5 text-[0.68rem]">{days} days</Button>)}</div></div>
        {suggested.length ? <div className="mt-3 space-y-3">{suggested.map((pattern) => <SuggestionCard key={pattern.id} pattern={pattern} duration={duration} onStart={() => onStart(pattern, duration)} />)}</div> : <div className="mt-3 rounded-[1.35rem] border border-border/45 bg-card p-4 text-sm leading-6 text-muted-foreground">Your personal observations will inform possible experiments here. Start with a few days of gentle check-ins.</div>}
      </section>
      {archived.length > 0 && <section><SectionHeading icon={<BadgeCheck />} title="Past experiments" side={`${archived.length} saved`} headingId="past-experiments-heading" /><div className="mt-3 space-y-3">{archived.map((experiment) => { const comparison = experimentComparison(experiment, data); const completed = experiment.status === "completed"; const detail = patternFor(experiment); return <article key={experiment.id} className="rounded-[1.4rem] border border-border/55 bg-card p-4"><div className="flex items-center justify-between gap-2"><span className="rounded-full bg-accent px-2.5 py-1 text-[0.65rem] font-semibold text-primary">{completed ? "Completed" : "Ended early"}</span><span className="text-[0.68rem] text-muted-foreground">{experiment.durationDays} days</span></div><h3 className="rooted-title mt-2 text-lg font-medium text-primary">{experiment.name}</h3>{completed && comparison.experimentalCount > 0 && comparison.baselineCount > 0 ? <p className="mt-2 text-sm leading-6 text-muted-foreground">During the experiment, recorded scalp comfort averaged {comparison.experimental.toFixed(1)} / 10, compared with {comparison.baseline.toFixed(1)} / 10 across {comparison.baselineCount} baseline observations.</p> : <p className="mt-2 text-sm leading-6 text-muted-foreground">{detail ? describePattern(detail).supporting : "Your daily observations remain together in your personal journal."}</p>}<p className="mt-2 text-xs text-muted-foreground">{experiment.dailyNotes.length} reflection{experiment.dailyNotes.length === 1 ? "" : "s"} saved</p></article>; })}</div></section>}
      <section className="rounded-[1.4rem] border border-border/50 bg-accent/35 px-4 py-5 text-center"><Sprout aria-hidden="true" className="mx-auto size-6 text-primary" /><h2 className="rooted-title mt-2 text-lg font-medium text-primary">No test is a failure</h2><p className="rooted-title mx-auto mt-1 max-w-xs text-[0.81rem] italic leading-6 text-muted-foreground">“Finding that a routine shift makes no noticeable difference is useful to learn, too.”</p></section>
    </div>
  );
}

function SuggestionCard({ pattern, duration, onStart }: { pattern: Pattern; duration: number; onStart: () => void }) {
  const detail = describePattern(pattern);
  return <article className="rounded-[1.35rem] border border-border/55 bg-card px-4 py-4"><div className="flex flex-wrap items-center gap-2"><span className={`rounded-full px-2.5 py-1 text-[0.65rem] font-semibold ${pattern.status === "observed" ? "bg-accent text-primary" : "bg-secondary/12 text-secondary"}`}>{pattern.observations} personal observation{pattern.observations === 1 ? "" : "s"}</span><span className="text-[0.68rem] text-muted-foreground">{detail.lagLabel}</span></div><h3 className="rooted-title mt-3 text-[1.04rem] font-medium leading-7 text-foreground">{detail.headline}</h3><p className="mt-1.5 text-[0.79rem] leading-6 text-muted-foreground">{pattern.factorId.includes("sleep") ? "Compare a steady wind-down window for a week and notice how your personal ratings change." : FACTOR_BY_ID[pattern.factorId]?.suggestion ?? "Notice and compare days when this routine is part of your life."}</p><div className="mt-3 flex flex-wrap items-center justify-between gap-3"><span className="text-xs text-muted-foreground">{duration}-day observation</span><Button onClick={onStart} size="sm" className="min-h-10 rounded-full px-4">Start a gentle test <ArrowRight /></Button></div></article>;
}

function ActiveExperiment({ experiment, pattern, data, day, todayLog, onUpdate, onSaveNote }: { experiment: Experiment; pattern?: Pattern; data: RootedData; day: number; todayLog?: DailyLog; onUpdate: (id: string, update: (experiment: Experiment) => Experiment, message: string) => void; onSaveNote: (experiment: Experiment, note: string) => void }) {
  const [note, setNote] = useState(experiment.dailyNotes.find((entry) => entry.dayNumber === day)?.note ?? "");
  const elapsed = experimentProgress(experiment, day);
  const comparison = experimentComparison(experiment, data);
  const finished = comparison.complete;
  const percentage = Math.round((elapsed / experiment.durationDays) * 100);
  const conclusion = pattern ? describePattern(pattern) : null;
  return <article className="overflow-hidden rounded-[1.55rem] border border-border/55 bg-card shadow-sm">
    <div className="p-4 sm:p-5"><div className="flex flex-wrap items-center gap-2"><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[0.67rem] font-semibold uppercase tracking-[0.03em] ${experiment.status === "paused" ? "bg-muted text-muted-foreground" : "bg-primary text-primary-foreground"}`}><span className="size-1.5 rounded-full bg-primary-foreground/80" />{experiment.status === "paused" ? "Paused" : `Day ${elapsed} of ${experiment.durationDays}`}</span><span className="text-[0.73rem] text-secondary">{experiment.lag ? `Your ${experiment.lag}-day observation` : "A personal observation"}</span></div><h2 className="rooted-title mt-4 text-[1.38rem] font-medium leading-8 text-primary">{experiment.name}</h2><p className="mt-1 text-[0.8rem] leading-6 text-muted-foreground">{conclusion?.supporting ?? `Notice your own ${experiment.outcomeLabel} as you compare ordinary days.`}</p>
      <div className="mt-4 rounded-xl border border-border/45 bg-background p-3.5"><div className="flex justify-between gap-3 text-xs"><span className="font-medium text-foreground">Your observation window</span><span className="text-secondary">{finished ? "Window complete" : `${Math.max(0, experiment.durationDays - elapsed)} days remaining`}</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-muted"><span className="block h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} /></div><div className="mt-2 flex justify-between text-[0.68rem] text-muted-foreground"><span>Day {experiment.startDay}</span><span>{percentage}%</span><span>Day {experiment.startDay + experiment.durationDays - 1}</span></div></div>
      {finished && comparison.experimentalCount > 0 && comparison.baselineCount > 0 && <div className="mt-3 rounded-xl border border-border/50 bg-accent/50 p-3.5"><span className="inline-flex items-center gap-1.5 text-[0.67rem] font-semibold uppercase tracking-[0.04em] text-primary"><ChartNoAxesColumnIncreasing className="size-3.5" />Personal comparison</span><p className="mt-2 text-[0.79rem] leading-6 text-foreground">During this experiment, your logged scalp-comfort ratings averaged <strong>{comparison.experimental.toFixed(1)} / 10</strong>, compared with <strong>{comparison.baseline.toFixed(1)} / 10</strong> across {comparison.baselineCount} earlier {comparison.baselineCount === 1 ? "reading" : "readings"}.</p></div>}
      <label htmlFor={`experiment-note-${experiment.id}`} className="mt-4 block text-sm font-medium text-foreground">Today’s gentle observation <span className="text-xs font-normal text-muted-foreground">· optional</span></label><textarea id={`experiment-note-${experiment.id}`} maxLength={240} value={note} onChange={(event) => setNote(event.target.value)} placeholder="How did today feel in your own words?" className="mt-2 min-h-[5rem] w-full resize-y rounded-xl border border-input bg-background p-3 text-sm leading-6 placeholder:text-muted-foreground/65 focus-visible:border-primary" /><p className="mt-1 text-right text-[0.68rem] tabular-nums text-muted-foreground">{note.length} / 240</p>
      <div className="mt-2 flex flex-wrap gap-2">{note.trim() && <Button size="sm" onClick={() => onSaveNote(experiment, note)} className="min-h-10 rounded-full px-4"><Pencil />Save today’s note</Button>}<Button size="sm" variant="outline" onClick={() => onUpdate(experiment.id, (item) => ({ ...item, status: item.status === "active" ? "paused" : "active" }), experiment.status === "active" ? "Experiment paused; your notes remain safe." : "Experiment resumed.")} className="min-h-10 rounded-full px-3">{experiment.status === "active" ? "Pause" : "Resume"}</Button><Button size="sm" variant="ghost" onClick={() => onUpdate(experiment.id, (item) => ({ ...item, status: "completed" }), "Your experiment is complete; your observations are saved.")} className="min-h-10 rounded-full px-3"><BadgeCheck />Finish</Button><Button size="sm" variant="ghost" onClick={() => onUpdate(experiment.id, (item) => ({ ...item, status: "stopped" }), "Experiment ended early; your saved notes remain in your journal.")} className="min-h-10 rounded-full px-3 text-muted-foreground">End early</Button></div>
    </div>
  </article>;
}

function JourneyScreen({ data, day, patterns, onDownload }: { data: RootedData; day: number; patterns: Pattern[]; onDownload: () => void }) {
  const stats = journeyStats(data);
  const stages = [
    { week: 1, name: "Build your baseline", description: "Get to know how an ordinary day feels.", end: 7 },
    { week: 2, name: "Notice first shifts", description: "Record routines, wash days, and feelings.", end: 14 },
    { week: 3, name: "Find connections", description: "Notice how factors and feelings shift over days.", end: 21 },
    { week: 4, name: "Understand your patterns", description: "Look back at the rhythms in your own logs.", end: 28 },
  ];
  const loggedDays = new Set(data.logs.map((log) => log.dayNumber));
  const unavailableFactorNames = FACTORS.filter((factor) => data.logs.filter((log) => log.factors.includes(factor.id)).length > 0);
  const averageComfort = data.logs.length ? data.logs.reduce((sum, log) => sum + log.scalpComfort, 0) / data.logs.length : 0;
  const averageSkin = data.logs.length ? data.logs.reduce((sum, log) => sum + log.skinFeel, 0) / data.logs.length : 0;
  return (
    <div className="mx-auto w-full max-w-[590px] space-y-7">
      <section className="pt-1"><p className="mb-2 text-[0.68rem] font-semibold uppercase tracking-[0.14em] text-primary">The picture grows, one day at a time</p><h1 className="rooted-title text-[2rem] font-semibold leading-tight text-primary">Your journey</h1><p className="rooted-title mt-2 text-[0.98rem] italic leading-7 text-secondary">“Over time, your routine becomes more personal.”</p></section>
      <section aria-labelledby="journey-map-title" className="rounded-[1.5rem] border border-border/55 bg-card p-4 sm:p-5"><div className="flex items-start justify-between gap-2"><h2 id="journey-map-title" className="flex items-center gap-2 text-[0.86rem] font-semibold text-foreground"><CalendarDays className="size-[1.05rem] text-primary" />28-day pattern roadmap</h2><span className="shrink-0 rounded-full bg-accent px-3 py-1 text-[0.67rem] font-semibold text-primary">Day {day} of 28</span></div><div className="mt-3 rounded-[1.2rem] border border-border/50 bg-background p-3.5"><div className="mb-3 flex justify-between gap-2 text-[0.72rem]"><span className="font-medium text-foreground">Your daily check-ins</span><span className="tabular-nums text-secondary">{data.logs.length} logged</span></div><div className="grid grid-cols-7 gap-1.5 sm:gap-2">{Array.from({ length: 28 }, (_, index) => { const n = index + 1; const isLogged = loggedDays.has(n); const isCurrent = n === day; const isFuture = n > day; return <div key={n} aria-label={`Day ${n}${isCurrent ? ", today" : ""}${isLogged ? ", check-in saved" : isFuture ? ", upcoming" : ", not logged"}`} title={`Day ${n}${isLogged ? " · check-in saved" : ""}`} className={`grid aspect-square min-h-8 place-items-center rounded-full text-[0.68rem] font-medium tabular-nums ${isCurrent ? "bg-secondary text-secondary-foreground ring-2 ring-secondary/25 ring-offset-2 ring-offset-background" : isLogged ? "bg-primary text-primary-foreground" : isFuture ? "bg-muted/75 text-muted-foreground/70" : "bg-card text-muted-foreground"}`}>{n}</div>; })}</div><div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[0.67rem] text-muted-foreground"><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-primary" />Logged</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-secondary" />Today</span><span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-muted-foreground/30" />Coming up</span></div></div>
        <div className="mt-3 space-y-2">{stages.map((stage) => { const complete = day > stage.end; const current = day >= stage.week * 7 - 6 && day <= stage.end; return <div key={stage.week} className={`flex items-start gap-3 rounded-xl border px-3.5 py-3 ${current ? "border-secondary/15 bg-secondary/10" : complete ? "border-primary/10 bg-background" : "border-border/35 bg-background/55 opacity-80"}`}><span className={`mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ${complete ? "bg-accent text-primary" : current ? "bg-secondary/15 text-secondary" : "bg-muted text-muted-foreground"}`}>{complete ? <Check className="size-4" /> : <span className="text-[0.66rem] font-semibold">{stage.week}</span>}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><h3 className="text-[0.79rem] font-semibold text-foreground">Week {stage.week}: {stage.name}</h3><span className="text-[0.65rem] text-muted-foreground">{complete ? "Completed" : current ? `Day ${day} · Current` : "Coming up"}</span></div><p className="mt-0.5 text-[0.72rem] leading-5 text-muted-foreground">{stage.description}</p></div></div>; })}</div>
      </section>
      <section aria-labelledby="baseline-title"><SectionHeading icon={<Fingerprint />} title="Your observed baseline" side="From your own logs" headingId="baseline-title" /><div className="mt-3 rounded-[1.45rem] border border-border/55 bg-card p-4"><p className="text-xs text-muted-foreground">Your personal ratings so far</p><div className="mt-3 grid grid-cols-2 gap-2.5"><Metric label={`Average scalp comfort · ${data.logs.length} ${data.logs.length === 1 ? "day" : "days"}`} value={data.logs.length ? `${averageComfort.toFixed(1)} / 10` : "More days will help"} /><Metric label={`Average skin comfort · ${data.logs.length} ${data.logs.length === 1 ? "day" : "days"}`} value={data.logs.length ? `${averageSkin.toFixed(1)} / 10` : "More days will help"} /></div><div className="mt-3 rounded-xl border border-border/35 bg-background px-3 py-3"><p className="text-[0.78rem] font-medium text-foreground">Your recorded washes &amp; scalp care</p><p className="mt-1.5 text-[0.77rem] leading-6 text-muted-foreground">{stats.mostCommonInterval != null ? `Your most common interval between logged scalp-care or wash days is approximately ${stats.mostCommonInterval} ${stats.mostCommonInterval === 1 ? "day" : "days"}, based on ${data.logs.filter((log) => log.factors.includes("hard-water") || log.factors.includes("oiling")).length} logged days.` : "Keep noting your real wash or scalp-care days; Rooted will calculate your personal interval as a rhythm emerges."}</p></div></div></section>
      <section aria-labelledby="factors-title"><SectionHeading icon={<Leaf />} title="Factors in your logs" side={stats.topFactors.length ? "From the pattern finder" : "Still collecting"} headingId="factors-title" /><div className="mt-3 space-y-2">{stats.topFactors.length ? stats.topFactors.map((pattern) => <div key={pattern.id} className="flex items-center gap-3 rounded-xl border border-border/45 bg-card px-3.5 py-3"><span className={`grid size-8 shrink-0 place-items-center rounded-full ${pattern.status === "observed" ? "bg-accent text-primary" : "bg-secondary/12 text-secondary"}`}>{pattern.status === "observed" ? <ChartNoAxesColumnIncreasing className="size-4" /> : <Lightbulb className="size-4" />}</span><span className="min-w-0 flex-1"><span className="block truncate text-[0.79rem] font-medium text-foreground">{pattern.factorLabel}</span><span className="block mt-0.5 text-[0.66rem] text-muted-foreground">{pattern.observations} observations · {describePattern(pattern).lagLabel}</span></span><span className="shrink-0 text-[0.66rem] text-secondary">{pattern.status === "observed" ? "Observed" : "Early clue"}</span></div>) : <p className="rounded-xl border border-border/45 bg-card p-3.5 text-[0.78rem] leading-6 text-muted-foreground">{unavailableFactorNames.length ? `${unavailableFactorNames.slice(0, 3).map((factor) => factor.short).join(", ")} is appearing in your notes; we’re still waiting for comparisons to emerge.` : "Add everyday factors to your check-ins; patterns appear when enough observations exist."}</p>}</div></section>
      <section aria-labelledby="routine-title"><SectionHeading icon={<Droplets />} title="Routines & products" side="Only what you’ve logged" headingId="routine-title"/><div className="mt-3 space-y-2">{stats.routines.length ? stats.routines.map(({ name, count }) => <div key={name} className="flex items-center justify-between gap-3 rounded-xl border border-border/40 bg-card px-3.5 py-3"><div className="flex min-w-0 items-center gap-3"><span className="grid size-8 shrink-0 place-items-center rounded-xl bg-accent text-primary"><Sprout className="size-4" /></span><span className="truncate text-[0.81rem] font-medium text-foreground">{name}</span></div><span className="rounded-full bg-background px-2.5 py-1 text-[0.66rem] text-muted-foreground">{count} {count === 1 ? "entry" : "entries"}</span></div>) : <p className="rounded-xl border border-border/45 bg-card p-3.5 text-[0.78rem] leading-6 text-muted-foreground">Only routines you personally record will appear here.</p>}</div></section>
      <section className="rounded-[1.5rem] border border-border/50 bg-card p-4 sm:p-5"><div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary/12 text-secondary"><ArrowDownToLine /></span><div><h2 className="rooted-title text-lg font-medium text-primary">Your personal wellness summary</h2><p className="mt-1 text-[0.76rem] leading-6 text-muted-foreground">Your check-ins, personal comparisons, emerging clues, and routines — all in one printable page.</p></div></div><p className="mt-3 rounded-xl border border-border/45 bg-background px-3 py-2.5 text-[0.73rem] leading-5 text-muted-foreground">Includes your personal ratings and dates from your own journal. It’s for reflection, not a medical assessment.</p><Button onClick={onDownload} size="lg" className="mt-4 h-12 w-full rounded-2xl"><ArrowDownToLine />Download personal pattern summary</Button></section>
    </div>
  );
}

function ConfirmationDialog({ title, description, confirmLabel, onCancel, onConfirm }: { title: string; description: string; confirmLabel: string; onCancel: () => void; onConfirm: () => void }) {
  useEffect(() => { function escape(event: KeyboardEvent) { if (event.key === "Escape") onCancel(); } window.addEventListener("keydown", escape); return () => window.removeEventListener("keydown", escape); }, [onCancel]);
  return <div onMouseDown={(event) => { if (event.target === event.currentTarget) onCancel(); }} className="fixed inset-0 z-[75] grid place-items-center bg-foreground/30 p-4 backdrop-blur-[3px]"><section role="alertdialog" aria-modal="true" aria-labelledby="confirm-title" className="w-full max-w-sm rounded-[1.6rem] border border-border bg-background p-5 shadow-xl sm:p-6"><h2 id="confirm-title" className="rooted-title text-xl font-medium text-primary">{title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><div className="mt-5 flex gap-2"><Button variant="outline" onClick={onCancel} className="h-11 flex-1 rounded-xl">Keep this journal</Button><Button variant="destructive" onClick={onConfirm} className="h-11 flex-1 rounded-xl">{confirmLabel}</Button></div></section></div>;
}
