"use client";

import { useState, useMemo, useEffect } from "react";
import { useExec } from "@/hooks/useExec";
import {
  useRaceGlobal,
  useEnrollingRace,
  useRaceRoster,
  useSideBetDesk,
  useSideBet,
  useUser,
  useConfig,
  useCurrentPhase,
  useCollectionNames,
} from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import { SPECIES, UNDERDOG_BET, speciesKey, speciesCapsLabel } from "@/utils/species";
import { betTypeLabel, betTypeKey, dominantBetType, isOneSidedDesk, summarizeSideBetDesk, normalizePick } from "@/utils/sideBets";
import { formatAtom, shortRunnerName } from "@/utils/race";
import { isBettingOpen, phaseKey, bettingTargetRace, isEntryOpenForRace } from "@/utils/phases";
import { useSideBetAmount } from "@/hooks/useSideBetAmount";
import SideBetAmountField from "@/components/SideBetAmountField";
import { useNowSec } from "@/hooks/useNowSec";

/** Unified desk tile — site palette, light gray borders */
const DESK_TILE =
  "border border-gray-500/50 bg-carl-slate/90 text-white";

const DESK_TILE_SELECTED =
  "border-carl-accent bg-carl-purple/50 ring-1 ring-carl-accent/40 text-white";

/** Live desk wager chips — racer picks get gold accent. */
const LIVE_CHIP_RACER =
  "rounded-lg border border-yellow-500/40 bg-yellow-950/30 px-3 py-2 text-sm min-w-[8rem]";
const LIVE_CHIP_DEFAULT =
  "rounded-lg border border-gray-500/50 bg-carl-midnight/60 px-3 py-2 text-sm min-w-[8rem]";

const RACER_VALUE_PREFIX = "racer:";

function parseBetSelection(value) {
  if (value.startsWith(RACER_VALUE_PREFIX)) {
    return { betType: "racer_victory", pick: value.slice(RACER_VALUE_PREFIX.length) };
  }
  return { betType: value, pick: undefined };
}

function betSelectionValue(betType, racerPick) {
  if (betType === "racer_victory" && racerPick) {
    return `${RACER_VALUE_PREFIX}${racerPick}`;
  }
  return betType;
}

export default function BettingDesk({ connected = true }) {
  const { address } = useChain(CHAIN_NAME);
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: enrolling } = useEnrollingRace();
  const { value: config } = useConfig();
  const { value: phase } = useCurrentPhase();
  const nowSec = useNowSec();
  const deskRace = bettingTargetRace(race, enrolling, config, nowSec);
  const deskRaceId = deskRace?.current_race_id ?? 0;
  const liveRaceId = race?.current_race_id ?? 0;
  const pipelineDesk =
    enrolling && deskRaceId === enrolling.current_race_id && liveRaceId !== deskRaceId;
  const bettingOpen = deskRace ? isBettingOpen(deskRace, config, nowSec) : false;
  const phaseKeyVal = phaseKey(phase);
  const deskEntryOpen = deskRace ? isEntryOpenForRace(deskRace, nowSec) : false;
  const deskOpenThroughReveals = bettingOpen && !deskEntryOpen;

  const { value: roster } = useRaceRoster(deskRaceId);
  const { value: desk } = useSideBetDesk(deskRaceId);
  const { value: myBet, query: myBetQuery } = useSideBet(deskRaceId, address);
  const { value: user } = useUser(address);

  const { placeSideBet } = useExec();
  const [betType, setBetType] = useState("chicken_victory");
  const [racerPick, setRacerPick] = useState(null);
  const { amount, setAmount, amountUatom, hasValidAmount } = useSideBetAmount();

  const vaultUatom = Number(user?.deposits ?? 0);
  const hasVaultFunds = vaultUatom >= amountUatom;

  const counts = useMemo(
    () =>
      Object.fromEntries(
        SPECIES.map((s) => [
          s.id,
          roster?.filter((r) => speciesKey(r) === s.id).length ?? 0,
        ])
      ),
    [roster]
  );

  const activeSpecies = useMemo(
    () => SPECIES.filter((s) => counts[s.id] > 0),
    [counts]
  );

  const speciesBetTypes = useMemo(
    () => new Set(SPECIES.map((s) => s.betType)),
    []
  );

  const activeRoster = useMemo(
    () => (roster ?? []).filter((r) => r.player),
    [roster]
  );

  useEffect(() => {
    if (betType === UNDERDOG_BET.id) return;
    if (betType === "racer_victory") {
      if (racerPick && activeRoster.some((r) => r.player === racerPick)) return;
      setRacerPick(activeRoster[0]?.player ?? null);
      return;
    }
    if (!speciesBetTypes.has(betType)) return;
    const stillActive = activeSpecies.some((s) => s.betType === betType);
    if (!stillActive) {
      setBetType(activeSpecies[0]?.betType ?? UNDERDOG_BET.id);
      setRacerPick(null);
    }
  }, [betType, activeSpecies, speciesBetTypes, activeRoster, racerPick]);

  const oneSided = bettingOpen === true && isOneSidedDesk(desk);
  const dominant = dominantBetType(desk);
  const bettorCount = desk?.bets?.length ?? 0;
  const alreadyBet = connected && !!myBet;

  const rosterByPlayer = Object.fromEntries(
    (roster ?? []).map((r) => [r.player, r])
  );

  const deskSummary = useMemo(() => summarizeSideBetDesk(desk), [desk]);

  const collectionContracts = useMemo(() => {
    const set = new Set();
    for (const r of roster ?? []) {
      if (r.nft_contract) set.add(r.nft_contract);
    }
    for (const pick of deskSummary.byPick.keys()) {
      const c = rosterByPlayer[pick]?.nft_contract;
      if (c) set.add(c);
    }
    return [...set];
  }, [roster, deskSummary.byPick, rosterByPlayer]);
  const { names: collectionNames } = useCollectionNames(collectionContracts);

  const betLabelOpts = { rosterByPlayer, collectionNames };

  const handleBetSelectionChange = (value) => {
    const parsed = parseBetSelection(value);
    setBetType(parsed.betType);
    setRacerPick(parsed.pick ?? null);
  };

  const handleTribeTileClick = (speciesBetType) => {
    setBetType(speciesBetType);
    setRacerPick(null);
  };

  const handleBet = () => {
    if (!connected || !hasValidAmount || !hasVaultFunds) return;
    if (betType === "racer_victory" && !racerPick) return;
    placeSideBet.mutate({
      betType,
      amountUatom,
      pick: betType === "racer_victory" ? racerPick : undefined,
    });
  };

  const betTargetLabel =
    betType === "racer_victory" && racerPick
      ? betTypeLabel("racer_victory", { pick: racerPick, ...betLabelOpts })
      : betTypeLabel(betType);

  return (
    <div className="w-full bg-carl-slate border border-carl-purple/25 rounded-xl p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            Side bets
            {pipelineDesk && (
              <span className="ml-2 text-sm font-semibold text-amber-200/90">
                Race #{deskRaceId}
              </span>
            )}
          </h2>
          <p className="text-xs text-carl-muted mt-0.5">
            {pipelineDesk
              ? `Enter & bet on race #${deskRaceId} while race #${liveRaceId} is on track.`
              : "Pick an outcome and set your own wager — tribe, underdog, or individual racer."}
          </p>
        </div>
        <div className="text-right text-sm">
          <p className="text-gray-400">
            Pool{" "}
            <span className="text-white font-mono font-semibold">
              {formatAtom(desk?.total_pool)} ATOM
            </span>
          </p>
          {deskSummary.totalWagers > 0 && (
            <p className="text-gray-300 text-xs mt-1 font-mono">
              {deskSummary.totalWagers} wager{deskSummary.totalWagers === 1 ? "" : "s"}
              {deskSummary.racerBets > 0 && (
                <>
                  {" · "}
                  <span className="text-yellow-300/90">
                    {deskSummary.racerBets} racer{deskSummary.racerBets === 1 ? "" : "s"}
                  </span>
                </>
              )}
              {deskSummary.tribeBets > 0 && (
                <>
                  {" · "}
                  {deskSummary.tribeBets} tribe{deskSummary.tribeBets === 1 ? "" : "s"}
                </>
              )}
              {deskSummary.underdogBets > 0 && (
                <>
                  {" · "}
                  {deskSummary.underdogBets} underdog
                </>
              )}
            </p>
          )}
          {connected && (
            <p className="text-gray-500 text-xs mt-0.5">
              Your vault {formatAtom(user?.deposits)} ATOM
            </p>
          )}
        </div>
      </div>

      {activeSpecies.length > 0 ? (
        <div className="mb-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Tribes on track
          </p>
          <div className="flex flex-wrap gap-2">
            {activeSpecies.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => handleTribeTileClick(s.betType)}
                disabled={connected && alreadyBet}
                className={`rounded-lg px-3 py-2 min-w-[5.5rem] text-center transition-colors disabled:cursor-default ${
                  betType === s.betType && !racerPick && !alreadyBet ? DESK_TILE_SELECTED : DESK_TILE
                } ${!alreadyBet ? "hover:border-gray-400/70 cursor-pointer" : ""}`}
              >
                <p className="text-xl font-bold leading-none text-white">{counts[s.id]}</p>
                <p className="text-[10px] sm:text-xs text-white/90 font-semibold mt-1 truncate">
                  {speciesCapsLabel(s)}
                </p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-carl-muted text-sm mb-4 rounded-lg border border-carl-purple/20 bg-carl-midnight/40 px-3 py-2.5">
          No tribes on the track yet — counts appear here as runners enter.
        </p>
      )}

      {!connected && (
        <p className="text-gray-400 text-sm mb-4 rounded-lg border border-gray-700 bg-gray-950/50 p-3">
          Connect your wallet to place a side bet. Desk activity below updates live.
        </p>
      )}

      {alreadyBet && (
        <div className="mb-4 rounded-lg border border-carl-purple/40 bg-carl-midnight/50 p-4">
          <p className="font-semibold text-carl-accent">Your bet is on the books</p>
          <p className="text-sm text-carl-muted mt-1">
            <strong>
              {betTypeLabel(myBet.bet_type, {
                pick: normalizePick(myBet.pick),
                ...betLabelOpts,
              })}
            </strong> · {formatAtom(myBet.amount)} ATOM
            {myBet.claimed ? " · claimed" : ""}
          </p>
        </div>
      )}

      {deskOpenThroughReveals && (
        <p className="text-carl-muted text-sm mb-4 rounded-lg border border-carl-purple/30 bg-carl-midnight/40 p-3">
          Side bets stay open through crowd &amp; runner reveals — desk locks when the race goes live
          on the track.
        </p>
      )}

      {connected && bettingOpen === false && !alreadyBet && race && (
        <p className="text-carl-muted text-sm mb-4 rounded-lg border border-carl-purple/30 bg-carl-midnight/50 p-3">
          {config?.test_mode && (race?.total_runners ?? 0) === 0
            ? "Side bets open after the first runner enters the race."
            : race?.is_settled
              ? "This race is settled — wait for the next race."
              : "Betting desk is closed — the race is live or settling."}
        </p>
      )}

      {connected && bettingOpen === null && raceQuery.isLoading && (
        <p className="text-gray-500 text-sm mb-4">Loading desk status…</p>
      )}

      {oneSided && bettorCount > 0 && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-carl-accent/40 bg-carl-plum/60 p-4 text-carl-text"
        >
          <p className="font-semibold text-carl-accent">One-sided market — all bets may refund</p>
          <p className="text-sm mt-1 text-carl-muted">
            Every wager backs <strong>{betTypeLabel(dominant)}</strong> ({bettorCount} bettor
            {bettorCount === 1 ? "" : "s"}). Bet a different outcome to open real odds.
          </p>
        </div>
      )}

      {connected && !alreadyBet && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="flex-1 min-w-0">
              <label htmlFor="side-bet-choice" className="text-xs text-gray-400 block mb-1 uppercase tracking-wide">
                Side bet options
              </label>
              <select
                id="side-bet-choice"
                value={betSelectionValue(betType, racerPick)}
                onChange={(e) => handleBetSelectionChange(e.target.value)}
                disabled={bettingOpen !== true}
                className="w-full bg-gray-950 border border-gray-600 text-white font-semibold p-2.5 rounded-lg disabled:opacity-50 appearance-none cursor-pointer"
              >
                <optgroup label="Tribes on track">
                  {activeSpecies.length > 0 ? (
                    activeSpecies.map((s) => (
                      <option key={s.betType} value={s.betType}>
                        {speciesCapsLabel(s)} ({counts[s.id]})
                      </option>
                    ))
                  ) : (
                    <option disabled value="">
                      No tribes on track yet
                    </option>
                  )}
                </optgroup>
                {activeRoster.length > 0 && (
                  <optgroup label="Individual racers">
                    {activeRoster.map((r) => {
                      const sk = speciesKey(r);
                      return (
                        <option key={r.player} value={`${RACER_VALUE_PREFIX}${r.player}`}>
                          {shortRunnerName(r.player, sk)}
                          {r.nft_id != null ? ` · #${r.nft_id}` : ""}
                        </option>
                      );
                    })}
                  </optgroup>
                )}
                <optgroup label="Special">
                  <option value={UNDERDOG_BET.id}>{UNDERDOG_BET.label.toUpperCase()}</option>
                </optgroup>
              </select>
            </div>
            <div className="sm:w-44 shrink-0">
              <SideBetAmountField
                id="side-bet-amount"
                amount={amount}
                onChange={setAmount}
                disabled={bettingOpen !== true}
                vaultUatom={vaultUatom}
                amountUatom={amountUatom}
                hasValidAmount={hasValidAmount}
              />
            </div>
          </div>

          <div className="flex flex-col justify-end">
            <button
              type="button"
              onClick={handleBet}
              disabled={
                placeSideBet.isPending ||
                bettingOpen !== true ||
                !hasValidAmount ||
                !hasVaultFunds ||
                (betType === "racer_victory" && !racerPick) ||
                myBetQuery.isLoading
              }
              className="w-full bg-carl-purple hover:bg-carl-navy disabled:bg-carl-midnight disabled:text-carl-muted text-white font-bold py-3 px-4 rounded-lg"
            >
              {placeSideBet.isPending
                ? "Placing bet…"
                : bettingOpen === true
                  ? hasValidAmount
                    ? `Wager ${formatAtom(amountUatom)} on ${betTargetLabel}`
                    : "Enter wager amount"
                  : raceQuery.isLoading
                    ? "Loading…"
                    : "Betting closed"}
            </button>
          </div>
        </>
      )}

      {desk?.bets?.length > 0 && (
        <div className="mt-5 border-t border-carl-purple/25 pt-4">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-semibold mb-2">
            Live desk ({deskSummary.totalWagers})
          </p>
          <ul className="flex flex-wrap gap-2">
            {desk.bets.map((b) => {
              const isRacer = betTypeKey(b.bet_type) === "racer_victory";
              const label = betTypeLabel(b.bet_type, { pick: normalizePick(b.pick), ...betLabelOpts });
              const who = b.bettor === address ? "You" : `${b.bettor.slice(0, 10)}…`;
              return (
                <li
                  key={b.bettor}
                  className={isRacer ? LIVE_CHIP_RACER : LIVE_CHIP_DEFAULT}
                >
                  <p className="text-white font-semibold truncate">{label}</p>
                  <p
                    className={`text-xs mt-0.5 font-mono truncate ${
                      isRacer ? "text-yellow-200/80" : "text-carl-muted"
                    }`}
                  >
                    {who} · {formatAtom(b.amount)} ATOM
                  </p>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {bettingOpen === true && bettorCount === 0 && !alreadyBet && connected && (
        <p className="text-gray-600 text-sm mt-3">No wagers yet — be the first on the desk.</p>
      )}
    </div>
  );
}
