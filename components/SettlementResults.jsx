"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  useRaceRoster,
  useRaceTelemetry,
  useSideBetDesk,
  useSideBet,
  useSideBetSettlement,
  useRaceHistoryEntry,
  useCollectionNames,
} from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { useExec } from "@/hooks/useExec";
import { CHAIN_NAME } from "@/config";
import { useNftImages } from "@/hooks/useNftImages";
import RunnerAvatar from "@/components/RunnerAvatar";
import { formatAtom, shortRunnerName } from "@/utils/race";
import { speciesKey, wasmSpeciesLabel } from "@/utils/species";
import { betTypeLabel } from "@/utils/sideBets";
import {
  computeFirstPrize,
  computeWagerPayout,
  winningDeskHeadline,
  entryPoolSplitLabel,
  bountySplitLabel,
  sidePoolSplitLabel,
  ENTRY_POOL_SPLIT,
} from "@/utils/settlementPayouts";
import { ACTION } from "@/utils/raceTheme";

function shortAddr(addr) {
  if (!addr) return "—";
  return `${addr.slice(0, 10)}…${addr.slice(-4)}`;
}

function PodiumRow({ rank, runner, imageMap }) {
  const species = speciesKey(runner);
  const medals = { 1: "#1", 2: "#2", 3: "#3" };
  return (
    <div className="flex items-center gap-3 py-2 border-b border-gray-800/80 last:border-0">
      <span className="text-xl w-8 text-center">{medals[rank] ?? `#${rank}`}</span>
      <RunnerAvatar
        nftContract={runner.nft_contract}
        nftId={runner.nft_id}
        species={species}
        imageMap={imageMap}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white truncate">
          {wasmSpeciesLabel(runner.species)} #{runner.nft_id}
          {!runner.revealed_action && (
            <span className="ml-2 text-[10px] uppercase text-rose-400 font-bold">Forfeit</span>
          )}
        </p>
        <p className="text-xs text-gray-500 font-mono truncate">
          {shortRunnerName(runner.player, species)}
        </p>
      </div>
    </div>
  );
}

export default function SettlementResults({ raceId, showBackLink = true }) {
  const { address } = useChain(CHAIN_NAME);
  const { entry: history } = useRaceHistoryEntry(raceId);

  const { value: roster } = useRaceRoster(raceId);
  const { value: telemetry } = useRaceTelemetry(raceId);
  const { value: desk } = useSideBetDesk(raceId);
  const { value: settlement } = useSideBetSettlement(raceId);
  const { value: myBet } = useSideBet(raceId, address);
  const { claimWager } = useExec();

  const rosterByPlayer = useMemo(() => {
    const map = {};
    roster?.forEach((r) => {
      map[r.player] = r;
    });
    return map;
  }, [roster]);

  const collectionContracts = useMemo(
    () => (roster ?? []).map((r) => r.nft_contract).filter(Boolean),
    [roster]
  );
  const { names: collectionNames } = useCollectionNames(collectionContracts);
  const betLabelOpts = { rosterByPlayer, collectionNames };

  const podium = useMemo(() => {
    const source = telemetry?.length ? telemetry : roster ?? [];
    return [...source]
      .filter((r) => r.final_rank != null && r.final_rank > 0)
      .sort((a, b) => a.final_rank - b.final_rank)
      .slice(0, 3)
      .map((t) => ({ ...t, ...rosterByPlayer[t.player] }));
  }, [telemetry, roster, rosterByPlayer]);

  const winner = useMemo(() => {
    if (podium[0]) return podium[0];
    if (history?.winner && rosterByPlayer[history.winner]) {
      return rosterByPlayer[history.winner];
    }
    return null;
  }, [podium, history, rosterByPlayer]);

  const entryPool = history?.total_entry_pool ?? "0";
  const betPool = history?.total_bet_pool ?? "0";
  const firstPrize = computeFirstPrize(entryPool);

  const imageSource = useMemo(
    () =>
      podium.map((r) => ({
        nft_contract: r.nft_contract,
        nft_id: r.nft_id,
        species: r.species,
      })),
    [podium]
  );
  const { images: imageMap } = useNftImages(imageSource);

  const wagerRows = useMemo(() => {
    if (!desk?.bets?.length || !settlement) return [];
    return desk.bets.map((b) => ({
      ...b,
      payout: computeWagerPayout(b, settlement),
    }));
  }, [desk, settlement]);

  const myPayout = useMemo(() => {
    if (!myBet || !settlement) return 0n;
    return computeWagerPayout({ ...myBet, bettor: address }, settlement);
  }, [myBet, settlement, address]);

  const hasResults =
    history != null ||
    podium.length > 0 ||
    settlement != null ||
    (desk?.bets?.length ?? 0) > 0;

  if (!raceId || !hasResults) {
    return (
      <div className="rounded-xl border border-gray-800 bg-gray-900 p-8 text-center text-gray-500">
        <p>No results found for Race #{raceId ?? "—"}.</p>
        {showBackLink && (
          <Link href="/" className="text-blue-400 hover:underline text-sm mt-2 inline-block">
            ← Back to live race
          </Link>
        )}
      </div>
    );
  }

  const winnerSpecies = winner ? speciesKey(winner) : null;
  const isWinner = address && winner?.player === address;

  return (
    <section
      aria-label={ACTION.revealResults}
      className="rounded-2xl border-2 border-purple-600/50 bg-gradient-to-br from-purple-950/60 via-gray-900 to-gray-950 overflow-hidden shadow-xl shadow-purple-900/20"
    >
      <div className="px-4 sm:px-6 py-5 border-b border-purple-800/40 bg-purple-900/20">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="text-xs uppercase tracking-widest text-purple-300 font-semibold">
            Race #{raceId} · {ACTION.revealResults}
            {history?.rained_out && (
              <span className="ml-2 text-amber-400 normal-case">(rained out)</span>
            )}
          </p>
          {showBackLink && (
            <Link
              href="/"
              className="text-sm text-purple-300 hover:text-white font-medium"
            >
              Live race →
            </Link>
          )}
        </div>

        {winner ? (
          <div className="flex flex-col sm:flex-row sm:items-center gap-4 mt-3">
            <RunnerAvatar
              nftContract={winner.nft_contract}
              nftId={winner.nft_id}
              species={winnerSpecies}
              imageMap={imageMap}
              size="xl"
            />
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight">
                {wasmSpeciesLabel(winner.species)} #{winner.nft_id} wins!
              </h2>
              <p className="text-purple-200/80 font-mono text-sm mt-1 truncate">
                {winner.player}
              </p>
              {!history?.rained_out && (
                <p className="text-amber-300 font-semibold mt-2">
                  1st place prize ({ENTRY_POOL_SPLIT.firstPrizePct}%):{" "}
                  {formatAtom(firstPrize.toString())} ATOM
                  <span className="text-purple-300/70 font-normal text-sm ml-2">
                    (credited to winner&apos;s vault at settlement)
                  </span>
                </p>
              )}
              {isWinner && (
                <p className="text-carl-accent text-sm font-medium mt-1">
                  That&apos;s you — check your vault balance.
                </p>
              )}
            </div>
          </div>
        ) : (
          <h2 className="text-xl font-bold text-white mt-3">
            {history?.rained_out ? "Race rained out — full refunds" : "Race complete"}
          </h2>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:divide-x divide-gray-800">
        <div className="p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-3">Podium</h3>
          {podium.length > 0 ? (
            podium.map((r) => (
              <PodiumRow key={r.player} rank={r.final_rank} runner={r} imageMap={imageMap} />
            ))
          ) : (
            <p className="text-gray-500 text-sm">No ranked finishers on record.</p>
          )}

          <div className="mt-4 pt-4 border-t border-gray-800 text-xs text-gray-500 space-y-1">
            <p>Entry pool {formatAtom(entryPool)} ATOM · Side pool {formatAtom(betPool)} ATOM</p>
            {!history?.rained_out && (
              <>
                <p>{entryPoolSplitLabel()}</p>
                <p>{bountySplitLabel()}</p>
              </>
            )}
          </div>
        </div>

        <div className="p-4 sm:p-5">
          <h3 className="text-sm font-bold text-gray-300 uppercase tracking-wider mb-1">
            Side bet distribution
          </h3>
          <p className="text-purple-200 text-sm mb-1">
            {winningDeskHeadline(settlement, rosterByPlayer)}
          </p>
          <p className="text-xs text-gray-500 mb-4">{sidePoolSplitLabel()}</p>

          {wagerRows.length === 0 ? (
            <p className="text-gray-500 text-sm">No side bets this race.</p>
          ) : (
            <ul className="space-y-2">
              {wagerRows.map((row) => {
                const isYou = row.bettor === address;
                const won = row.payout > 0n;
                return (
                  <li
                    key={row.bettor}
                    className={`rounded-lg border px-3 py-2.5 text-sm ${
                      isYou
                        ? "border-purple-500/50 bg-purple-950/40"
                        : "border-gray-800 bg-gray-950/50"
                    }`}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="text-gray-400 font-mono text-xs">
                        {isYou ? "You" : shortAddr(row.bettor)}
                      </span>
                      <span className="text-gray-300">
                        {betTypeLabel(row.bet_type, {
                          pick: row.pick,
                          ...betLabelOpts,
                        })}{" "}
                        · {formatAtom(row.amount)} ATOM
                      </span>
                    </div>
                    <p
                      className={`mt-1 font-semibold ${
                        won ? "text-carl-accent" : "text-gray-600"
                      }`}
                    >
                      {won
                        ? `Payout: ${formatAtom(row.payout.toString())} ATOM`
                        : "Lost — no payout"}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}


          {myBet && !myBet.claimed && myPayout > 0n && (
            <button
              type="button"
              onClick={() => claimWager.mutate({ raceId })}
              disabled={claimWager.isPending}
              className="mt-4 w-full bg-purple-600 hover:bg-purple-500 disabled:bg-gray-700 text-white font-bold py-3 rounded-lg"
            >
              {claimWager.isPending
                ? "Claiming…"
                : `Claim ${formatAtom(myPayout.toString())} ATOM to vault`}
            </button>
          )}

          {myBet?.claimed && (
            <p className="text-carl-accent/90 text-sm mt-3">Your wager winnings have been claimed.</p>
          )}

          {myBet && myPayout === 0n && !settlement?.all_bets_off && !settlement?.rained_out && (
            <p className="text-gray-500 text-sm mt-3">Your wager did not win this race.</p>
          )}
        </div>
      </div>
    </section>
  );
}
