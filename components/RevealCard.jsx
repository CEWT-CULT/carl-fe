"use client";

import { useState, useEffect } from "react";
import { useExec } from "@/hooks/useExec";
import { useRaceGlobal, useCurrentPhase, useConfig } from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import {
  isRevealOpen,
  isSettlementOpen,
  isRaceLive,
  canCrankRacePreview,
  secondsUntilPreviewCrank,
  formatCountdown,
  tsToSeconds,
  PREVIEW_PROGRESS_CAP,
  previewCrankLimit,
} from "@/utils/phases";
import { loadRevealPayload } from "@/utils/revealStorage";
import { ACTION } from "@/utils/raceTheme";
import MiniPhaseTimer from "@/components/MiniPhaseTimer";
import { useNowSec } from "@/hooks/useNowSec";

export default function RevealCard() {
  const { address } = useChain(CHAIN_NAME);
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const { revealRace, settleRace, advanceRace, crankRacePreview } = useExec();
  const nowSec = useNowSec();
  const [action, setAction] = useState("saboteur");
  const [salt, setSalt] = useState("");

  const raceId = race?.current_race_id ?? 0;
  const previewStep = race?.preview_step ?? 0;

  useEffect(() => {
    if (!raceId || !address) return;
    const saved = loadRevealPayload(raceId, address);
    if (saved) {
      setSalt(saved.salt ?? "");
      setAction(saved.action ?? "saboteur");
    }
  }, [raceId, address]);

  const revealOpen = isRevealOpen(phase, race, config, nowSec);
  const settlementOpen = isSettlementOpen(race, nowSec);
  const raceLive = isRaceLive(race, nowSec);
  const crankLimit = previewCrankLimit(race, config);
  const crankReady = canCrankRacePreview(race, nowSec, config);
  const crankWait = secondsUntilPreviewCrank(race, nowSec, config);
  const p3 = tsToSeconds(race?.phase_3_close);
  const settleIn =
    p3 != null && !settlementOpen && !race?.is_settled
      ? formatCountdown(Math.max(0, p3 - nowSec))
      : null;

  const refetch = () => {
    raceQuery.refetch();
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
      <h2 className="text-xl font-bold text-gray-100">{ACTION.set} · {ACTION.cheer} · {ACTION.revealResults}</h2>
      <p className="text-gray-500 text-sm">
        Hit {ACTION.set} during the crowd phase. After {ACTION.cheer} closes, anyone can {ACTION.checkProgress} on the live track
        progress once per minute (cosmetic only). {ACTION.revealResults} locks final results.
      </p>

      <MiniPhaseTimer />

      {savedHint(salt)}

      {race?.total_runners === 0 && (
        <p className="text-amber-400/90 text-sm rounded border border-amber-600/40 bg-amber-950/30 p-3">
          {ACTION.set} unlocks after the first runner enters and starts the race clock.
        </p>
      )}

      {race?.total_runners > 0 && !revealOpen && !race?.is_settled && settleIn && !raceLive && (
        <p className="text-amber-400/90 text-sm rounded border border-amber-600/40 bg-amber-950/30 p-3">
          Runner {ACTION.set} opens during the {ACTION.cheer} phase. Track goes {ACTION.go} when {ACTION.cheer} closes
          {settleIn ? ` (${settleIn})` : ""}.
        </p>
      )}

      {raceLive && !race?.is_settled && (
        <p className="text-carl-muted text-sm rounded border border-carl-purple/30 bg-carl-midnight/40 p-3">
          {ACTION.go} — progress {previewStep}/{crankLimit} (max {PREVIEW_PROGRESS_CAP}% until
          results). {ACTION.checkProgress} advances the stampede; finale unlocks on {ACTION.revealResults}.
        </p>
      )}

      <select
        value={action}
        onChange={(e) => setAction(e.target.value)}
        disabled={!revealOpen}
        className="w-full bg-gray-700 text-white p-2 rounded disabled:opacity-50"
      >
        <option value="saboteur">Saboteur</option>
        <option value="cheerleader">Cheerleader</option>
        <option value="wildcard">Wildcard</option>
      </select>

      <input
        value={salt}
        onChange={(e) => setSalt(e.target.value)}
        disabled={!revealOpen}
        placeholder={salt ? "Salt loaded from your entry" : `Enter race first — salt auto-saves for ${ACTION.set}`}
        className="w-full bg-gray-700 text-white p-2 rounded disabled:opacity-50"
      />

      <button
        type="button"
        onClick={() => revealRace.mutate({ action, salt }, { onSuccess: refetch })}
        disabled={!revealOpen || !salt || revealRace.isPending}
        className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
      >
        {revealRace.isPending ? ACTION.setPending : revealOpen ? `${ACTION.set} Tactic` : `${ACTION.set} closed`}
      </button>

      <button
        type="button"
        onClick={() => crankRacePreview.mutate({}, { onSuccess: refetch })}
        disabled={
          !raceLive ||
          crankRacePreview.isPending ||
          race?.is_settled ||
          previewStep >= crankLimit ||
          !crankReady
        }
        className="w-full bg-carl-purple hover:bg-carl-navy disabled:bg-gray-600 text-white font-bold py-2 rounded"
      >
        {crankRacePreview.isPending
          ? ACTION.checkProgressPending
          : !raceLive
            ? `Track live after ${ACTION.cheer} closes`
            : previewStep >= crankLimit
              ? `At ${PREVIEW_PROGRESS_CAP}% — ${ACTION.revealResults} for finale`
              : crankReady
                ? `${ACTION.checkProgress} (${previewStep}/${crankLimit})`
                : crankWait != null
                  ? `Next ${ACTION.checkProgress} in ${formatCountdown(crankWait)}`
                  : ACTION.checkProgress}
      </button>

      <button
        type="button"
        onClick={() => settleRace.mutate({}, { onSuccess: refetch })}
        disabled={!settlementOpen || settleRace.isPending || race?.is_settled}
        className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
      >
        {settleRace.isPending
          ? ACTION.revealResultsPending
          : settlementOpen
            ? ACTION.revealResults
            : settleIn
              ? `${ACTION.revealResults} opens in ${settleIn}`
              : `${ACTION.revealResults} not open yet`}
      </button>

      {config?.test_mode && race?.is_settled && (
        <button
          type="button"
          onClick={() => advanceRace.mutate({}, { onSuccess: refetch })}
          disabled={advanceRace.isPending}
          className="w-full bg-gray-600 hover:bg-gray-500 disabled:opacity-50 text-white font-bold py-2 rounded text-sm"
        >
          {advanceRace.isPending ? "Advancing…" : "Advance to Next Race"}
        </button>
      )}
    </div>
  );
}

function savedHint(salt) {
  if (!salt) return null;
  return (
    <p className="text-carl-muted text-xs">
      Using saved salt from your race entry (stored in this browser).
    </p>
  );
}
