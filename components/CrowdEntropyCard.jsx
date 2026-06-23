"use client";

import { useState, useEffect } from "react";
import { useExec } from "@/hooks/useExec";
import {
  useRaceGlobal,
  useCurrentPhase,
  useConfig,
  useSideBet,
  useCrowdEntropy,
  useCrowdEntropyDesk,
} from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { hashCrowdSalt } from "@/utils/race";
import { isCrowdCommitOpen, isCrowdRevealOpen, formatCountdown, tsToSeconds } from "@/utils/phases";
import { saveCrowdPayload, loadCrowdPayload } from "@/utils/crowdStorage";
import { ACTION } from "@/utils/raceTheme";
import MiniPhaseTimer from "@/components/MiniPhaseTimer";

export default function CrowdEntropyCard() {
  const { address } = useChain(CHAIN_NAME);
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const { commitCrowdEntropy, revealCrowdEntropy } = useExec();
  const raceId = race?.current_race_id ?? 0;

  const { value: sideBet } = useSideBet(raceId, address);
  const { value: crowdRow } = useCrowdEntropy(raceId, address);
  const { value: desk } = useCrowdEntropyDesk(raceId);

  const [salt, setSalt] = useState(() => Math.random().toString(36).slice(2));
  const [nowSec, setNowSec] = useState(() => Date.now() / 1000);

  useEffect(() => {
    const id = setInterval(() => setNowSec(Date.now() / 1000), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (!raceId || !address) return;
    const saved = loadCrowdPayload(raceId, address);
    if (saved?.salt) setSalt(saved.salt);
  }, [raceId, address]);

  const commitOpen = isCrowdCommitOpen(phase, race, config, nowSec);
  const revealOpen = isCrowdRevealOpen(phase, race, config, nowSec);
  const alreadyCommitted = !!crowdRow?.commitment;
  const alreadyRevealed = crowdRow?.revealed;

  const cc = tsToSeconds(race?.crowd_commit_close);
  const commitIn =
    cc != null && !commitOpen && !alreadyCommitted && nowSec < cc
      ? formatCountdown(Math.max(0, (tsToSeconds(race?.phase_2_close) ?? nowSec) - nowSec))
      : null;

  const handleCommit = async () => {
    const commitmentB64 = await hashCrowdSalt(salt);
    commitCrowdEntropy.mutate(
      { commitmentB64 },
      {
        onSuccess: () => {
          if (address && raceId) saveCrowdPayload({ raceId, address, salt });
          raceQuery.refetch();
        },
      }
    );
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg space-y-4">
      <h2 className="text-xl font-bold text-gray-100">{ACTION.cheerTitle}</h2>
      <p className="text-gray-500 text-sm">
        Side bettors commit a blind salt after entry closes. {ACTION.cheer} mixes into the race seed at
        settlement — crowd commits share 2% of the total pool when the race settles.
      </p>

      <MiniPhaseTimer />

      {desk && (
        <p className="text-gray-400 text-xs">
          Crowd commits: {desk.commits}/{desk.max_commits} · revealed: {desk.reveals}
        </p>
      )}

      {!sideBet && (
        <p className="text-amber-400/90 text-sm rounded border border-amber-600/40 bg-amber-950/30 p-3">
          Place a side bet first to contribute crowd entropy.
        </p>
      )}

      {sideBet && !alreadyCommitted && !commitOpen && commitIn && (
        <p className="text-cyan-400/80 text-sm">Crowd commit opens when entry closes ({commitIn}).</p>
      )}

      {alreadyCommitted && !alreadyRevealed && salt && (
        <p className="text-carl-accent/80 text-xs">Salt saved in this browser for {ACTION.cheer}.</p>
      )}

      {alreadyRevealed && (
        <p className="text-carl-accent/80 text-sm">Your crowd salt is cheered for this race.</p>
      )}

      {!alreadyCommitted && (
        <button
          type="button"
          onClick={handleCommit}
          disabled={!commitOpen || !sideBet || commitCrowdEntropy.isPending}
          className="w-full bg-teal-600 hover:bg-teal-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
        >
          {commitCrowdEntropy.isPending
            ? "Committing…"
            : commitOpen
              ? "Commit Crowd Salt"
              : "Commit window closed"}
        </button>
      )}

      {alreadyCommitted && !alreadyRevealed && (
        <>
          <input
            value={salt}
            onChange={(e) => setSalt(e.target.value)}
            disabled={!revealOpen}
            placeholder="Salt auto-saved from commit"
            className="w-full bg-gray-700 text-white p-2 rounded disabled:opacity-50"
          />
          <button
            type="button"
            onClick={() =>
              revealCrowdEntropy.mutate({ salt }, { onSuccess: () => raceQuery.refetch() })
            }
            disabled={!revealOpen || !salt || revealCrowdEntropy.isPending}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-600 text-white font-bold py-2 rounded"
          >
            {revealCrowdEntropy.isPending
              ? ACTION.cheerPending
              : revealOpen
                ? ACTION.cheer
                : `${ACTION.cheer} closed`}
          </button>
        </>
      )}
    </div>
  );
}
