"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  useRaceGlobal,
  useRaceTelemetry,
  useRaceRoster,
  useRacePreview,
  useCurrentPhase,
  useConfig,
  useSideBetDesk,
} from "@/hooks";
import { useNftImages } from "@/hooks/useNftImages";
import { useNowSec } from "@/hooks/useNowSec";
import { shortRunnerName } from "@/utils/race";
import { speciesKey } from "@/utils/species";
import RunnerAvatar from "@/components/RunnerAvatar";
import LaneBetButton from "@/components/LaneBetButton";
import RaceActionsBar from "@/components/RaceActionsBar";
import { phaseKey, PHASE_LABELS, isRaceLive, isRevealWindowClosed, previewCrankLimit, previewProgressPct } from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";
import {
  TICK_COUNT,
  START_PCT,
  positionsForTick,
  positionsFromCumulative,
  runnersAtStartLine,
  resetPositionMemory,
  sortRunnersForLanes,
  applyForfeitToLanes,
} from "@/utils/trackLayout";
import { summarizeSideBetDesk } from "@/utils/sideBets";

/** Gutter width — NFT + wallet readable at a glance. */
const GUTTER_WIDTH = "9.5rem";
/** Per-lane floor when many runners force scrolling. */
const MIN_LANE_HEIGHT = 56;

function TrackRail({ position }) {
  return (
    <div
      className={`checkered-flag track-rail-checkered absolute left-0 right-0 ${
        position === "top" ? "top-0" : "bottom-0"
      } z-20`}
    />
  );
}

function RaceProgressBar({ pct }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div className="mb-3 px-1">
      <div className="flex justify-between text-xs text-gray-400 mb-1.5">
        <span>Race progress</span>
        <span className="font-mono text-carl-accent text-sm">{Math.round(clamped)}%</span>
      </div>
      <div className="h-2.5 rounded-full bg-carl-track-lane-alt overflow-hidden border border-carl-track-divider/60">
        <div
          className="h-full bg-gradient-to-r from-carl-purple via-carl-accent to-carl-text transition-all duration-700 ease-out"
          style={{ width: `${clamped}%` }}
        />
      </div>
    </div>
  );
}

function RunnerGutter({ runner, racerBetCount = 0, forfeited = false }) {
  const species = speciesKey(runner);
  const tail = runner.player ? `…${String(runner.player).slice(-6)}` : "—";

  return (
    <div
      className={`flex items-center gap-2 px-2 border-r border-carl-track-divider/70 bg-carl-track-gutter/80 shrink-0 h-full ${
        forfeited ? "opacity-75" : ""
      }`}
      style={{ width: GUTTER_WIDTH }}
    >
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <p className="text-xs sm:text-sm font-bold text-white truncate leading-tight flex-1">
            {shortRunnerName(runner.player, species)}
          </p>
          {forfeited && (
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded bg-rose-950/80 text-rose-300 border border-rose-500/40">
              Forfeit
            </span>
          )}
          {racerBetCount > 0 && (
            <span
              className="shrink-0 text-[10px] font-bold font-mono px-1.5 py-0.5 rounded bg-yellow-600/90 text-white border border-yellow-400/50"
              title={`${racerBetCount} individual racer bet${racerBetCount === 1 ? "" : "s"}`}
            >
              {racerBetCount}
            </span>
          )}
        </div>
        <p className="text-[10px] sm:text-xs text-carl-muted font-mono truncate">{tail}</p>
        {runner.nft_id != null && (
          <p className="text-[10px] text-gray-400 font-mono mt-0.5">#{runner.nft_id}</p>
        )}
      </div>
    </div>
  );
}

function DragRaceTrack({ laneRunners, imageMap, racerBetsByPick, className = "" }) {
  const laneCount = Math.max(laneRunners.length, 1);

  return (
    <div
      className={`relative h-full min-h-0 rounded-xl overflow-hidden border-2 border-carl-track-border shadow-2xl shadow-black/40 flex flex-col ${className}`}
    >
      <TrackRail position="top" />
      <div className="relative bg-carl-track flex-1 min-h-0 overflow-y-auto">
        <div
          className="relative w-full"
          style={{ height: `max(100%, ${laneCount * MIN_LANE_HEIGHT}px)` }}
        >
        {laneRunners.map((runner, laneIdx) => {
          const laneHeightPct = 100 / laneCount;
          const laneTopPct = laneIdx * laneHeightPct;
          const pct = runner.leftPct ?? START_PCT;
          return (
            <div
              key={runner.laneKey}
              className="absolute left-0 right-0 flex"
              style={{ top: `${laneTopPct}%`, height: `${laneHeightPct}%` }}
            >
              <RunnerGutter
                runner={runner}
                racerBetCount={racerBetsByPick?.get(runner.player)?.count ?? 0}
                forfeited={runner.forfeited}
              />
              <div
                className={`relative flex-1 border-b border-carl-track-divider/50 ${
                  laneIdx % 2 === 0 ? "bg-carl-track-lane" : "bg-carl-track-lane-alt"
                } ${runner.forfeited ? "opacity-60" : ""}`}
              >
                <div
                  className={`absolute top-1/2 z-10 flex items-center gap-1 transition-[left] duration-1000 ease-out ${
                    runner.forfeited ? "grayscale" : ""
                  }`}
                  style={{
                    left: `${pct}%`,
                    transform: "translate(-50%, -50%)",
                  }}
                >
                  <LaneBetButton runner={runner} />
                  <RunnerAvatar
                    nftContract={runner.nft_contract}
                    nftId={runner.nft_id}
                    species={runner.species}
                    imageMap={imageMap}
                    size="lg"
                  />
                </div>
              </div>
            </div>
          );
        })}

        <div
          className="absolute top-3 bottom-3 w-1.5 bg-white/90 z-10 shadow"
          style={{ right: 0 }}
        />
        <div
          className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/90 rotate-90 origin-center tracking-widest z-10 pointer-events-none"
        >
          FINISH
        </div>
        </div>
      </div>
      <TrackRail position="bottom" />
    </div>
  );
}

export default function RaceTrack() {
  const { value: race } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { value: config } = useConfig();
  const nowSec = useNowSec();
  const raceId = race?.current_race_id ?? 0;
  const { value: telemetry } = useRaceTelemetry(raceId);
  const { value: roster } = useRaceRoster(raceId);
  const { value: desk } = useSideBetDesk(raceId);

  const racerBetsByPick = useMemo(
    () => summarizeSideBetDesk(desk).byPick,
    [desk]
  );

  const isSettled = race?.is_settled && telemetry?.length > 0;
  const raceLive = isRaceLive(race, nowSec) && !race?.is_settled;
  const { value: preview } = useRacePreview(raceId, { enabled: raceLive });

  const [tick, setTick] = useState(0);
  const positionMemory = useRef({});

  const phaseKeyVal = phaseKey(phase);
  const phaseLabel = (phaseKeyVal && PHASE_LABELS[phaseKeyVal]) || "Loading…";
  const hasRoster = (roster?.length ?? 0) > 0 || (race?.total_runners ?? 0) > 0;
  const previewStep = race?.preview_step ?? 0;
  const crankLimit = previewCrankLimit(race, config);
  const raceProgressPct = previewProgressPct(race, config, previewStep);

  const nftByPlayer = useMemo(() => {
    const map = {};
    roster?.forEach((r) => {
      map[r.player] = r;
    });
    return map;
  }, [roster]);

  const rosterByPlayer = nftByPlayer;

  const markForfeit =
    isSettled || raceLive || isRevealWindowClosed(race, nowSec);

  useEffect(() => {
    setTick(0);
    resetPositionMemory(positionMemory.current);
  }, [raceId, isSettled, raceLive, previewStep]);

  const imageSource = useMemo(() => {
    if (preview?.length) return preview;
    if (roster?.length) return roster;
    if (telemetry?.length) {
      return telemetry.map((t) => ({
        ...t,
        nft_contract: nftByPlayer[t.player]?.nft_contract,
        nft_id: nftByPlayer[t.player]?.nft_id,
      }));
    }
    return [];
  }, [preview, roster, telemetry, nftByPlayer]);

  const { images: imageMap } = useNftImages(imageSource);

  const laneRunners = useMemo(() => {
    let positioned = [];
    if (isSettled && telemetry?.length) {
      const runners = telemetry.map((t) => ({
        ...t,
        nft_contract: nftByPlayer[t.player]?.nft_contract,
        nft_id: nftByPlayer[t.player]?.nft_id,
      }));
      positioned = positionsForTick(runners, tick, positionMemory.current);
    } else if (raceLive && preview?.length) {
      positioned = positionsFromCumulative(
        preview,
        positionMemory.current,
        raceProgressPct
      );
    } else if (roster?.length) {
      positioned = positionsFromCumulative(runnersAtStartLine(roster), positionMemory.current);
    }
    return applyForfeitToLanes(positioned, rosterByPlayer, markForfeit);
  }, [
    isSettled,
    telemetry,
    raceLive,
    preview,
    roster,
    tick,
    nftByPlayer,
    rosterByPlayer,
    raceProgressPct,
    markForfeit,
  ]);

  useEffect(() => {
    if (!isSettled || !telemetry?.length) return;
    const id = setInterval(() => {
      setTick((t) => (t + 1 >= TICK_COUNT ? 0 : t + 1));
    }, 2000);
    return () => clearInterval(id);
  }, [isSettled, telemetry?.length, raceId]);

  const showTrack = laneRunners.length > 0;
  const prepPhase = !raceLive && !race?.is_settled;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-gray-900 to-gray-950 rounded-2xl p-3 sm:p-4 border border-gray-700/80 shadow-xl w-full min-h-0">
      <div className="mb-2 shrink-0 flex items-end justify-between gap-3">
        <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-[0.14em] text-carl-text">
          ARENA
        </h2>
      </div>

      {raceLive && <RaceActionsBar embedded slot="live" />}

      {(raceLive || isSettled) && (
        <div className="shrink-0">
          <RaceProgressBar pct={isSettled ? 100 : raceProgressPct} />
        </div>
      )}

      <div className="flex-1 min-h-0 flex flex-col">
        <div className="flex-1 min-h-0 flex flex-col rounded-xl overflow-hidden border-2 border-carl-track-border shadow-inner">
          {showTrack ? (
            <DragRaceTrack
              className="flex-1 min-h-0 rounded-none border-0 shadow-none"
              laneRunners={laneRunners}
              imageMap={imageMap}
              racerBetsByPick={racerBetsByPick}
            />
          ) : (
            <div className="relative flex-1 min-h-0 flex flex-col">
              <TrackRail position="top" />
              <div className="relative bg-carl-track flex-1 min-h-0 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-carl-track-gutter/90 backdrop-blur-sm rounded-xl px-4 sm:px-8 py-5 sm:py-6 text-center z-10 w-full max-w-3xl border border-carl-track-divider/50">
                  <p className="text-carl-text font-semibold text-lg">{phaseLabel}</p>
                  <p className="text-carl-muted text-sm mt-2 mb-4">
                    {race?.total_runners > 0
                      ? `${race.total_runners} entered — lanes appear when runners join`
                      : "The track opens when the first NFT enters the race"}
                  </p>
                  {prepPhase && (
                    <RaceActionsBar embedded slot="prep" inlineHub />
                  )}
                </div>
              </div>
              <TrackRail position="bottom" />
            </div>
          )}

          {prepPhase && showTrack && (
            <RaceActionsBar embedded slot="prep" attachToTrack />
          )}
        </div>

      {showTrack && prepPhase && hasRoster && (
        <p className="text-center text-xs text-gray-500 mt-2 shrink-0">
          Lanes at the line — {ACTION.cheer}, {ACTION.set}, then {ACTION.go} when live.
        </p>
      )}

      {showTrack && laneRunners.length < (roster?.length ?? 0) && (
        <p className="text-center text-xs text-gray-500 mt-1 shrink-0">
          Showing {laneRunners.length} of {sortRunnersForLanes(roster ?? []).length} lanes
        </p>
      )}
      </div>
    </div>
  );
}
