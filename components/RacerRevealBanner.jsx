"use client";

import { useRaceGlobal, useConfig, useRaceEntry } from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { useNowSec } from "@/hooks/useNowSec";
import {
  getRunnerSetSchedule,
  formatCountdownLong,
  formatUtcDateTime,
} from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";

export default function RacerRevealBanner() {
  const { address, status } = useChain(CHAIN_NAME);
  const { value: race } = useRaceGlobal();
  const { value: config } = useConfig();
  const raceId = race?.current_race_id ?? 0;
  const { value: entry } = useRaceEntry(raceId, address);
  const nowSec = useNowSec(status === "Connected" && !!entry && !entry?.revealed_action);

  if (status !== "Connected" || !race || race.is_settled) return null;

  const schedule = getRunnerSetSchedule(race, config, entry, nowSec);
  if (schedule.status === "hidden" || schedule.status === "not_entered" || schedule.status === "done") {
    return null;
  }

  if (schedule.status === "missed") {
    return (
      <section
        className="w-full mb-4 rounded-xl border-2 border-red-500/50 bg-red-950/40 px-4 py-6 sm:px-8 sm:py-8 text-center"
        aria-live="polite"
        aria-label="Reveal deadline passed"
      >
        <p className="text-xs font-bold uppercase tracking-[0.3em] text-red-300">Missed {ACTION.set}</p>
        <p className="mt-2 text-2xl sm:text-3xl font-black uppercase text-red-100">
          Reveal window closed
        </p>
        <p className="mt-2 text-sm text-red-200/80">
          You entered race #{raceId} but did not {ACTION.set} in time. Side bets may be slashed; check results after
          settlement.
        </p>
      </section>
    );
  }

  if (schedule.status === "open") {
    const closeClock = formatCountdownLong(schedule.secondsUntilClose);
    return (
      <section
        className="w-full mb-4 rounded-xl border-2 border-carl-accent/70 bg-gradient-to-r from-carl-purple/50 via-carl-navy/90 to-carl-purple/50 px-4 py-6 sm:px-8 sm:py-8 text-center shadow-lg shadow-carl-accent/20 animate-pulse"
        aria-live="polite"
        aria-label="Reveal open now"
      >
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-carl-accent">
          Race #{raceId} · {ACTION.set} open now
        </p>
        <p className="mt-3 text-4xl sm:text-6xl font-black uppercase tracking-wide text-white">
          Come back and {ACTION.set}!
        </p>
        <p className="mt-4 font-mono text-5xl sm:text-7xl font-black tabular-nums text-carl-accent">
          {closeClock}
        </p>
        <p className="mt-3 text-sm font-semibold uppercase tracking-widest text-carl-text">
          Until reveal closes · then {ACTION.go}
        </p>
        <p className="mt-1 text-xs text-carl-muted">
          Hard close {formatUtcDateTime(schedule.closesAt)}
        </p>
      </section>
    );
  }

  if (schedule.status === "waiting") {
    const waitClock = formatCountdownLong(schedule.secondsUntilOpen);
    return (
      <section
        className="w-full mb-4 rounded-xl border-2 border-amber-500/45 bg-gradient-to-r from-amber-950/50 via-carl-midnight to-amber-950/40 px-4 py-6 sm:px-8 sm:py-10 text-center"
        aria-live="polite"
        aria-label="Reveal countdown"
      >
        <p className="text-xs font-bold uppercase tracking-[0.35em] text-amber-300/90">
          Race #{raceId} · You&apos;re entered
        </p>
        <p className="mt-3 text-xl sm:text-2xl font-black uppercase tracking-wide text-amber-100">
          Come back to finalize your entry
        </p>
        <p className="mt-5 font-mono text-5xl sm:text-7xl lg:text-8xl font-black tabular-nums tracking-tight text-white">
          {waitClock}
        </p>
        <p className="mt-4 text-sm sm:text-base font-semibold text-carl-text">
          Reveal opens at{" "}
          <span className="text-amber-200 font-mono">{formatUtcDateTime(schedule.opensAt)}</span>
        </p>
        <p className="mt-2 text-xs sm:text-sm text-carl-muted max-w-lg mx-auto">
          Race Entry and GET HYPED stay open until prep ends.
        </p>
        <p className="mt-2 text-xs sm:text-sm text-carl-muted max-w-lg mx-auto">
          After that, you have until {formatUtcDateTime(schedule.closesAt)} to reveal your commit or
          you forfeit.
        </p>
      </section>
    );
  }

  return null;
}
