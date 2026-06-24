import { ACTION } from "./raceTheme";
import { previewProgressPct } from "./phases";

let eventSeq = 0;

export function createEvent(type, headline, subline = "") {
  eventSeq += 1;
  const at = Date.now();
  return {
    id: `${type}-${at}-${eventSeq}`,
    type,
    headline,
    subline,
    at,
  };
}

/** Activity-only diff — entries, bets, live cranks. No phase noise. */
export function diffRaceEvents(prev, next, config) {
  if (!next) return [];
  const events = [];
  const runners = next.runners ?? 0;
  const prevRunners = prev?.runners ?? 0;

  if (runners > prevRunners) {
    const delta = runners - prevRunners;
    events.push(
      createEvent(
        "entry",
        delta === 1 ? "Runner entered the grid" : `${delta} runners entered`,
        `${runners}/75 slots filled`
      )
    );
  }

  const betPool = Number(next.betPool ?? 0);
  const prevPool = Number(prev?.betPool ?? 0);
  if (betPool > prevPool && betPool - prevPool >= 1000) {
    const atom = ((betPool - prevPool) / 1e6).toFixed(4);
    events.push(createEvent("bet", "Side bet placed", `+${atom} ATOM on the desk`));
  }

  const previewStep = next.previewStep ?? 0;
  const prevStep = prev?.previewStep ?? 0;
  if (previewStep > prevStep && next.raceLive) {
    const pct = previewProgressPct({ preview_step: previewStep }, config, previewStep);
    events.push(
      createEvent(
        "crank",
        `${ACTION.checkProgress} — stampede at ${Math.round(pct)}%`,
        `Progress tick ${previewStep}`
      )
    );
  }

  return events;
}

export function previousWinnerPin(latest) {
  if (!latest) return null;
  if (latest.rained_out) {
    return createEvent(
      "winner",
      `Race #${latest.race_id} rained out`,
      "Full refunds — next race opens on first entry"
    );
  }
  if (latest.winner) {
    const tail = `${latest.winner.slice(0, 12)}…${latest.winner.slice(-4)}`;
    return createEvent("winner", `Race #${latest.race_id} winner`, tail);
  }
  return createEvent("winner", `Race #${latest.race_id} finished`, "Results on chain");
}
