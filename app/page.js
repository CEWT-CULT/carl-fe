"use client";

import { CONTRACT, CHAIN_NAME } from "@/config";
import { useChain } from "@/hooks/useChainClient";
import { useState } from "react";
import { useRaceGlobal, useEnrollingRace, useCurrentPhase, useRaceEntry } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import { entryTargetRace, isEntryOpenForRace, parseEnrollingRace } from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";
import { RaceViewProvider } from "@/context/RaceViewContext";
import PhaseStrip from "@/components/PhaseStrip";
import RaceViewBanner from "@/components/RaceViewBanner";
import RacerRevealBanner from "@/components/RacerRevealBanner";
import RaceTrack from "@/components/RaceTrack";
import RaceEventFeed from "@/components/RaceEventFeed";
import VaultBar from "@/components/VaultBar";
import EnterRaceFlow from "@/components/EnterRaceFlow";
import BettingDesk from "@/components/BettingDesk";
import ClaimNftCard from "@/components/ClaimNftCard";

export default function Home() {
  const { status, address } = useChain(CHAIN_NAME);
  const [showEnter, setShowEnter] = useState(false);
  const { value: race } = useRaceGlobal();
  const { value: enrollingRaw } = useEnrollingRace();
  const enrolling = parseEnrollingRace(enrollingRaw);
  const { value: phase } = useCurrentPhase();
  const nowSec = useNowSec();
  const entryRace = entryTargetRace(race, enrolling, nowSec);
  const raceId = entryRace?.current_race_id ?? race?.current_race_id ?? 0;
  const { value: existingEntry } = useRaceEntry(raceId, address);

  const entryOpen = entryRace ? isEntryOpenForRace(entryRace, nowSec) : false;
  const alreadyEntered = !!existingEntry;
  const enterDisabled = !entryOpen || alreadyEntered || race?.is_settled;
  const enterHint = alreadyEntered
    ? `You're in this race — await ${ACTION.set} on the main screen`
    : !entryOpen
      ? "Entry closed for this phase"
      : null;

  return (
    <RaceViewProvider enrollingRaceId={enrolling?.current_race_id ?? null}>
      {showEnter && <EnterRaceFlow onClose={() => setShowEnter(false)} />}

      <div className="w-full px-3 sm:px-5 lg:px-8 py-4 flex-1 max-w-[100rem] mx-auto">
        {!CONTRACT && (
          <div className="bg-amber-900/50 border border-amber-600 text-amber-200 p-4 rounded-lg mb-4 text-sm">
            Contract address not configured in{" "}
            <code className="bg-black/30 px-1">frontend/config/index.js</code>.
          </div>
        )}

        <PhaseStrip
          onEnterRace={() => setShowEnter(true)}
          enterDisabled={enterDisabled}
          enterHint={enterHint}
          showEnterCta={entryOpen && !race?.is_settled}
          entryRaceId={entryRace?.current_race_id ?? null}
        />

        {status !== "Connected" && (
          <div className="bg-gray-900 rounded-xl p-12 text-center text-gray-400 border border-gray-800 mb-4">
            <p className="text-lg font-medium text-gray-300 mb-2">Connect to play</p>
            <p className="text-sm">Connect Keplr on Cosmos Hub to enter races and bet.</p>
          </div>
        )}

        <RaceViewBanner />

        <RacerRevealBanner />

        <section id="race-arena" aria-label="Race track" className="mb-4 min-h-[420px]">
          <RaceTrack />
        </section>

        <RaceEventFeed />

        <section aria-label="Side betting" className="mb-4">
          <BettingDesk connected={status === "Connected"} />
        </section>

        {status === "Connected" && (
          <VaultBar
            onEnterRace={() => setShowEnter(true)}
            enterDisabled={enterDisabled}
            enterHint={enterHint}
          />
        )}

        {status === "Connected" && (
          <section aria-label="Withdraw escrowed NFTs" className="mt-4 mb-4">
            <ClaimNftCard />
          </section>
        )}
      </div>
    </RaceViewProvider>
  );
}
