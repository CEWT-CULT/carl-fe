"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useExec } from "@/hooks/useExec";
import {
  useRaceGlobal,
  useCurrentPhase,
  useConfig,
  useSideBet,
  useCrowdEntropy,
  useCrowdEntropyDesk,
  useRaceEntry,
} from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { hashCrowdSalt } from "@/utils/race";
import { loadRevealPayload, saveRevealPayload } from "@/utils/revealStorage";
import { loadCrowdPayload, saveCrowdPayload } from "@/utils/crowdStorage";
import {
  isRevealOpen,
  isSettlementOpen,
  isRaceLive,
  canCrankRacePreview,
  secondsUntilPreviewCrank,
  isCrowdCommitOpen,
  isCrowdRevealOpen,
  tsToSeconds,
  formatCountdown,
  formatCountdownClock,
  secondsUntilRevealOpen,
  secondsUntilRevealClose,
  PREVIEW_PROGRESS_CAP,
  previewCrankLimit,
  TEST_PREVIEW_LIVE_SECS,
  resolveDisplayPhaseKey,
} from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";
import { useNowSec } from "@/hooks/useNowSec";

function Segment({ label, status, active, children }) {
  return (
    <div
      className={`flex-1 min-w-[9rem] rounded-lg border px-2.5 py-2 flex flex-col gap-1.5 ${
        active
          ? "border-carl-accent/60 bg-carl-purple/25 ring-1 ring-carl-accent/30"
          : "border-gray-600/45 bg-carl-midnight/35"
      }`}
    >
      <div className="flex items-center justify-between gap-2 min-h-[1.125rem]">
        <span className="text-[11px] font-bold uppercase tracking-wide text-white">{label}</span>
        {status && (
          <span className="text-[10px] text-gray-400 truncate text-right max-w-[55%]">{status}</span>
        )}
      </div>
      {children}
    </div>
  );
}

function Btn({ children, disabled, onClick, variant = "default", compact = false }) {
  const styles = {
    default: "bg-gray-700 hover:bg-gray-600 disabled:bg-gray-800/80",
    primary: "bg-carl-purple hover:bg-carl-navy disabled:bg-gray-800/80",
    success: "bg-carl-purple hover:bg-carl-navy disabled:bg-gray-800/80",
    settle: "bg-carl-plum hover:bg-carl-purple disabled:bg-gray-800/80",
    crowd: "bg-carl-navy hover:bg-carl-purple disabled:bg-gray-800/80",
  };
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`w-full text-white font-semibold rounded-md transition-colors disabled:text-gray-500 ${
        compact ? "text-xs py-1.5 px-2" : "text-sm py-2 px-2.5"
      } ${styles[variant] ?? styles.default}`}
    >
      {children}
    </button>
  );
}

/** @typedef {"full" | "timing" | "outcome" | "prep" | "live"} RaceActionsSlot */
/** prep = CHEER + SET + Results (in track hub/footer); live = GO only (above track) */

export default function RaceActionsBar({
  embedded = false,
  slot = "full",
  attachToTrack = false,
  inlineHub = false,
}) {
  const router = useRouter();
  const { address, status } = useChain(CHAIN_NAME);
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const nowSec = useNowSec();
  const raceId = race?.current_race_id ?? 0;
  const previewStep = race?.preview_step ?? 0;

  const { revealRace, settleRace, crankRacePreview, commitCrowdEntropy, revealCrowdEntropy } =
    useExec();
  const { value: sideBet } = useSideBet(raceId, address);
  const { value: crowdRow } = useCrowdEntropy(raceId, address);
  const { value: crowdDesk } = useCrowdEntropyDesk(raceId);
  const { value: raceEntry, query: raceEntryQuery } = useRaceEntry(raceId, address);

  const [action, setAction] = useState("saboteur");
  const [runnerSalt, setRunnerSalt] = useState("");
  const [crowdSalt, setCrowdSalt] = useState(() => Math.random().toString(36).slice(2));

  useEffect(() => {
    if (!raceId || !address) return;
    const saved = loadRevealPayload(raceId, address);
    if (saved) {
      setRunnerSalt(saved.salt ?? "");
      setAction(saved.action ?? "saboteur");
    }
    const crowd = loadCrowdPayload(raceId, address);
    if (crowd?.salt) setCrowdSalt(crowd.salt);
  }, [raceId, address]);

  const connected = status === "Connected";
  const revealOpen = isRevealOpen(phase, race, config, nowSec);
  const alreadyRevealed = !!raceEntry?.revealed_action;
  const hasCommittedSalt = !!runnerSalt.trim();
  const inRace = !!raceEntry;
  const settlementOpen = isSettlementOpen(race, nowSec);
  const raceLive = isRaceLive(race, nowSec);
  const liveWindowSec =
    tsToSeconds(race?.phase_3_close) != null && tsToSeconds(race?.crowd_reveal_close) != null
      ? Math.max(0, tsToSeconds(race.phase_3_close) - tsToSeconds(race.crowd_reveal_close))
      : 0;
  const needsMigrateForLive = config?.test_mode && liveWindowSec === 0 && race?.total_runners > 0;
  const crankLimit = previewCrankLimit(race, config);
  const crankReady = canCrankRacePreview(race, nowSec, config);
  const crankWait = secondsUntilPreviewCrank(race, nowSec, config);
  const commitOpen = isCrowdCommitOpen(phase, race, config, nowSec);
  const crowdRevealOpen = isCrowdRevealOpen(phase, race, config, nowSec);
  const setOpensIn = secondsUntilRevealOpen(race, config, nowSec);
  const setClosesIn = secondsUntilRevealClose(race, nowSec);

  const displayKey =
    race?.total_runners === 0 && config?.test_mode
      ? "idle"
      : resolveDisplayPhaseKey(race, config, phase, nowSec);

  const cheerActive = ["crowd_commit", "crowd_reveal"].includes(displayKey);
  const setActive = displayKey === "crowd_reveal" || displayKey === "reveal";
  const goActive = displayKey === "live";
  const resultsActive = displayKey === "settlement" || settlementOpen;

  /** Segment visibility — only show controls in their active window. */
  const cheerPhaseActive =
    commitOpen ||
    crowdRevealOpen ||
    ["crowd_commit", "crowd_reveal"].includes(displayKey);
  const setPhaseActive =
    revealOpen ||
    ["crowd_reveal", "reveal"].includes(displayKey);
  const resultsPhaseActive = settlementOpen || displayKey === "settlement";

  const refetch = () => {
    raceQuery.refetch();
    raceEntryQuery.refetch();
  };

  const crowdStatus = () => {
    if (crowdDesk) return `${crowdDesk.commits}/${crowdDesk.max_commits} · ${crowdDesk.reveals} rev`;
    return "Crowd salt";
  };

  const setStatus = () => {
    if (alreadyRevealed) return "Confirmed";
    if (!inRace) return "Not entered";
    if (revealOpen && setClosesIn != null && setClosesIn > 0) {
      return formatCountdownClock(setClosesIn);
    }
    if (setOpensIn != null && setOpensIn > 0) return `Opens ${formatCountdownClock(setOpensIn)}`;
    return "Closed";
  };

  const goStatus = () => {
    if (raceLive) return `${previewStep}/${crankLimit} · max ${PREVIEW_PROGRESS_CAP}%`;
    if (needsMigrateForLive) return "Migrate needed";
    return "After crowd phase";
  };

  const resultsStatus = () => {
    if (race?.is_settled) return "Locked";
    if (settlementOpen) return "Open now";
    return "After live";
  };

  const setButtonLabel = () => {
    if (!connected) return ACTION.set;
    if (revealRace.isPending) return ACTION.setPending;
    if (alreadyRevealed) return "Confirmed";
    if (!inRace) return "Not entered";
    if (!hasCommittedSalt) return "Enter salt";
    if (!revealOpen) {
      if (setOpensIn != null && setOpensIn > 0) {
        return `${ACTION.set} in ${formatCountdownClock(setOpensIn)}`;
      }
      return "Closed";
    }
    return ACTION.set;
  };

  const handleCrowdCommit = async () => {
    const commitmentB64 = await hashCrowdSalt(crowdSalt);
    commitCrowdEntropy.mutate(
      { commitmentB64 },
      {
        onSuccess: () => {
          if (address && raceId) saveCrowdPayload({ raceId, address, salt: crowdSalt });
          refetch();
        },
      }
    );
  };

  const renderCheerAction = () => {
    if (!connected) return <p className="text-[10px] text-gray-500 py-1">Connect wallet</p>;
    if (!sideBet) return <p className="text-[10px] text-amber-300/90 py-1">Side bet required</p>;
    if (crowdRow?.revealed) {
      return <p className="text-[10px] text-carl-accent font-medium py-1">Done</p>;
    }
    if (!crowdRow?.commitment) {
      return (
        <Btn
          variant="crowd"
          compact
          disabled={!commitOpen || commitCrowdEntropy.isPending}
          onClick={handleCrowdCommit}
        >
          {commitCrowdEntropy.isPending ? "…" : commitOpen ? "Commit salt" : "Commit closed"}
        </Btn>
      );
    }
    return (
      <Btn
        variant="primary"
        compact
        disabled={!crowdRevealOpen || revealCrowdEntropy.isPending}
        onClick={() => revealCrowdEntropy.mutate({ salt: crowdSalt }, { onSuccess: refetch })}
      >
        {revealCrowdEntropy.isPending ? "…" : crowdRevealOpen ? ACTION.cheer : "Reveal closed"}
      </Btn>
    );
  };

  const renderSetAction = () => {
    if (!connected) return <p className="text-[10px] text-gray-500 py-1">Connect wallet</p>;
    if (alreadyRevealed) {
      return <p className="text-[10px] text-carl-accent font-medium py-1">Done</p>;
    }
    if (inRace && !hasCommittedSalt) {
      return (
        <div className="flex flex-col gap-1.5">
          <p className="text-[10px] leading-snug text-amber-300/90">
            Paste the secret salt saved when you entered — GET SET hashes tactic + salt on-chain.
          </p>
          <select
            value={action}
            onChange={(e) => setAction(e.target.value)}
            className="w-full rounded-md border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-white"
          >
            <option value="saboteur">Saboteur</option>
            <option value="cheerleader">Cheerleader</option>
            <option value="wildcard">Wildcard</option>
          </select>
          <input
            type="text"
            value={runnerSalt}
            onChange={(e) => setRunnerSalt(e.target.value)}
            placeholder="Entry salt (from same browser/device)"
            className="w-full rounded-md border border-gray-600 bg-gray-950 px-2 py-1 text-[11px] text-white placeholder:text-gray-500"
          />
          <Btn variant="primary" compact disabled>
            {ACTION.set} locked until salt is set
          </Btn>
        </div>
      );
    }
    return (
      <Btn
        variant="primary"
        compact
        disabled={
          !revealOpen ||
          !inRace ||
          !hasCommittedSalt ||
          alreadyRevealed ||
          revealRace.isPending ||
          raceEntryQuery.isLoading
        }
        onClick={() =>
          revealRace.mutate(
            { action, salt: runnerSalt.trim() },
            {
              onSuccess: () => {
                if (address && raceId) {
                  saveRevealPayload({ raceId, address, salt: runnerSalt.trim(), action });
                }
                refetch();
              },
            }
          )
        }
      >
        {setButtonLabel()}
      </Btn>
    );
  };

  const renderGoAction = () => {
    if (!connected) return <p className="text-[10px] text-gray-500 py-1">Connect wallet</p>;
    return (
      <Btn
        variant="success"
        compact
        disabled={
          !raceLive ||
          crankRacePreview.isPending ||
          race?.is_settled ||
          previewStep >= crankLimit ||
          !crankReady
        }
        onClick={() => crankRacePreview.mutate({}, { onSuccess: refetch })}
      >
        {crankRacePreview.isPending
          ? ACTION.cheerPending
          : !raceLive
            ? `Awaiting ${ACTION.go}`
            : previewStep >= crankLimit
              ? `At ${PREVIEW_PROGRESS_CAP}%`
              : crankReady
                ? `${ACTION.cheer} (${previewStep}/${crankLimit})`
                : crankWait != null
                  ? `In ${formatCountdown(crankWait)}`
                  : ACTION.cheer}
      </Btn>
    );
  };

  const renderResultsAction = () => {
    if (!connected) return <p className="text-[10px] text-gray-500 py-1">Connect wallet</p>;
    return (
      <Btn
        variant="settle"
        compact
        disabled={!settlementOpen || settleRace.isPending || race?.is_settled}
        onClick={() => {
          const finishedRaceId = race?.current_race_id ?? 0;
          settleRace.mutate(
            {},
            {
              onSuccess: () => {
                refetch();
                if (finishedRaceId) router.push(`/results/${finishedRaceId}`);
              },
            }
          );
        }}
      >
        {settleRace.isPending
          ? "…"
          : settlementOpen
            ? ACTION.revealResults
            : race?.is_settled
              ? "Locked"
              : "Not open"}
      </Btn>
    );
  };

  if (!race || race.is_settled) return null;

  const slotWantsCheer = slot === "full" || slot === "timing" || slot === "prep";
  const slotWantsSet = slot === "full" || slot === "outcome" || slot === "prep";
  const slotWantsGo = slot === "full" || slot === "timing" || slot === "live";
  const slotWantsResults = slot === "full" || slot === "outcome" || slot === "prep";

  const showCheer = slotWantsCheer && cheerPhaseActive;
  const showSet = slotWantsSet && setPhaseActive;
  const showGo = slotWantsGo && (slot === "live" || raceLive);
  const showResults = slotWantsResults && resultsPhaseActive;

  if (!showCheer && !showSet && !showGo && !showResults) return null;

  const ariaLabel =
    slot === "live"
      ? "Live race controls"
      : slot === "prep"
        ? "Pre-race and post-live controls"
        : slot === "timing"
          ? "Crowd and live race controls"
          : slot === "outcome"
            ? "Strategy and settlement controls"
            : "Race controls";

  const sectionClass = inlineHub
    ? "w-full max-w-3xl"
    : attachToTrack
      ? "shrink-0 rounded-b-xl border-t border-carl-track-divider/60 bg-carl-track-gutter/90 p-2"
      : slot === "live"
        ? `${embedded ? "mb-3 shrink-0" : "mb-4"} rounded-xl border border-carl-accent/40 bg-carl-purple/20 p-2 ring-1 ring-carl-accent/25`
        : `${embedded ? "mb-3 shrink-0" : "mb-4"} rounded-xl border border-carl-purple/35 bg-carl-slate/70 p-2`;

  return (
    <section className={sectionClass} aria-label={ariaLabel}>
      <div className="flex flex-wrap items-stretch gap-2">
        {showCheer && (
          <Segment label={ACTION.cheer} status={crowdStatus()} active={cheerActive}>
            {renderCheerAction()}
          </Segment>
        )}
        {showSet && (
          <Segment label={ACTION.set} status={setStatus()} active={setActive}>
            {renderSetAction()}
          </Segment>
        )}
        {showGo && (
          <Segment label={ACTION.go} status={goStatus()} active={goActive}>
            {renderGoAction()}
          </Segment>
        )}
        {showResults && (
          <Segment label={ACTION.finalResults} status={resultsStatus()} active={resultsActive}>
            {renderResultsAction()}
          </Segment>
        )}
      </div>
    </section>
  );
}
