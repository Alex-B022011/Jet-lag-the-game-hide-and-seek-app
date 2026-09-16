import { useEffect, useMemo, useState } from "react";
import { BRAND } from "./config";
import { MODES, MODE_ORDER } from "./game/modes";
import type { GuessRow, ModeId } from "./game/types";
import { activeSession, activeStats, useGame, yesterdayAnswer } from "./state/useGame";
import { EndPanel } from "./components/EndPanel";
import { GuessInput } from "./components/GuessInput";
import { GuessTable } from "./components/GuessTable";
import { HintTiles } from "./components/HintTiles";
import { HousePanel, InfoPanel, StatsPanel } from "./components/Panels";
import {
  IconCalendar, IconChart, IconEyeOff, IconFlame, IconInfinity, IconInfo, IconShield, MODE_ICONS,
} from "./components/Icons";

type Dialog = "house" | "stats" | "info" | null;

/** Splits the brand title so the two halves can be weighted differently. */
function Wordmark({ title }: { title: string }) {
  const mid = Math.ceil(title.length / 2);
  return (
    <h1 className="wordmark">
      <span className="wm-a">{title.slice(0, mid)}</span>
      <span className="wm-b">{title.slice(mid)}</span>
    </h1>
  );
}

export default function App() {
  const state = useGame();
  const {
    mode, kind, house, spoilerFree, day,
    setMode, setKind, setHouse, toggleSpoilerFree, submitGuess, giveUp, nextPuzzle, syncDay, resetEverything,
  } = state;

  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState("");

  const def = MODES[mode];
  const session = activeSession(state);
  const stats = activeStats(state);
  const over = session.status !== "playing";

  // The daily puzzle must turn over even if the tab was left open overnight.
  useEffect(() => {
    syncDay();
    const t = window.setInterval(syncDay, 30_000);
    return () => window.clearInterval(t);
  }, [syncDay]);

  useEffect(() => { setNotice(""); }, [mode, kind]);

  const rows: GuessRow[] = useMemo(
    () => session.guesses.map((g) => def.compare(g, session.answerId)).filter((r): r is GuessRow => r !== null),
    [session.guesses, session.answerId, def],
  );

  const clue = def.clue(session.answerId);
  const answerName = def.displayName(session.answerId);

  const handleGuess = (id: string) => {
    if (!submitGuess(id)) {
      setNotice("You have already guessed that one.");
      return;
    }
    setNotice("");
  };

  const goToMode = (next: ModeId) => {
    setMode(next);
    setDialog(null);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="app">
      <header className="masthead">
        <Wordmark title={BRAND.title} />
        <p className="tagline">{BRAND.tagline}</p>

        <nav className="toolbar">
          <button className="tool tool-house" onClick={() => setDialog("house")} title="Choose your house">
            {house ? house.slice(0, 4).toUpperCase() : <IconShield />}
          </button>
          <button
            className="tool"
            aria-pressed={spoilerFree}
            onClick={toggleSpoilerFree}
            title={spoilerFree ? "Show yesterday's answers" : "Hide yesterday's answers"}
          >
            <IconEyeOff />
          </button>
          <button className="tool" onClick={() => setDialog("stats")} title="Statistics"><IconChart /></button>
          <button className="tool" onClick={() => setDialog("info")} title="How to play"><IconInfo /></button>
        </nav>
      </header>

      <nav className="modes" aria-label="Game modes">
        {MODE_ORDER.map((m) => {
          const Icon = MODE_ICONS[m];
          const solved = state.daily[m].status === "won";
          return (
            <button key={m} className="mode" aria-current={m === mode} onClick={() => setMode(m)}>
              <span className="mode-disc">
                <Icon />
                {kind === "daily" && solved && <span className="mode-done" aria-label="solved today">✓</span>}
              </span>
              <span className="mode-label">{MODES[m].label}</span>
            </button>
          );
        })}
      </nav>

      <section className="panel">
        <div className="panel-head">
          <h2 className="panel-title">{def.heading}</h2>
          <span className={`streak${stats.currentStreak > 0 ? " lit" : ""}`} title="Current streak">
            <IconFlame />{stats.currentStreak}
          </span>
        </div>
        <p className="panel-prompt">{def.prompt}</p>

        <div className="kinds" role="group" aria-label="Play mode">
          <button className="kind" aria-pressed={kind === "daily"} onClick={() => setKind("daily")}>
            <IconCalendar />Daily
          </button>
          <button className="kind" aria-pressed={kind === "unlimited"} onClick={() => setKind("unlimited")}>
            <IconInfinity />Unlimited
          </button>
        </div>

        <HintTiles hints={def.hints} guessCount={session.guesses.length} answerId={session.answerId} revealAll={over} />
      </section>

      {clue && (
        <section className="clue">
          {def.clueKicker && <p className="clue-kicker">{def.clueKicker}</p>}
          <p className="clue-body">{clue}</p>
        </section>
      )}

      <GuessInput
        items={def.search}
        used={session.guesses}
        disabled={over}
        placeholder={def.placeholder}
        onGuess={handleGuess}
      />
      <p className="notice" role="status">{notice}</p>

      {!over && session.guesses.length >= 4 && (
        <p style={{ textAlign: "center" }}>
          <button className="btn ghost" onClick={giveUp}>Give up and reveal</button>
        </p>
      )}

      {over && (
        <EndPanel
          won={session.status === "won"}
          kind={kind}
          mode={mode}
          answerName={answerName}
          guessCount={session.guesses.length}
          portrait={def.portrait(session.answerId)}
          onNextPuzzle={() => { nextPuzzle(); window.scrollTo({ top: 0, behavior: "smooth" }); }}
          onGoToMode={goToMode}
        />
      )}

      <GuessTable columns={def.columns} rows={rows} />

      {kind === "daily" && !spoilerFree && (
        <p className="yesterday">
          Yesterday's answer was <b>{def.displayName(yesterdayAnswer(mode, day))}</b>
        </p>
      )}

      {dialog === "house" && (
        <HousePanel house={house} onPick={(h) => { setHouse(h); setDialog(null); }} onClose={() => setDialog(null)} />
      )}
      {dialog === "stats" && (
        <StatsPanel
          stats={state.stats}
          kind={kind}
          onReset={() => { resetEverything(); setDialog(null); }}
          onClose={() => setDialog(null)}
        />
      )}
      {dialog === "info" && <InfoPanel onClose={() => setDialog(null)} />}
    </div>
  );
}
