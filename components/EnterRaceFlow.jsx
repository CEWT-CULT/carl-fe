"use client";

import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNftRaceActions } from "@/hooks/useNftRaceActions";
import { useNftImages } from "@/hooks/useNftImages";
import { hashCommitment } from "@/utils/race";
import { saveRevealPayload } from "@/utils/revealStorage";
import { useRaceGlobal, useEnrollingRace, useCurrentPhase, useRaceEntry } from "@/hooks";
import { useNowSec } from "@/hooks/useNowSec";
import { entryTargetRace, isEntryOpenForRace } from "@/utils/phases";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME, ENTRY_FEE_ATOM } from "@/config";
import { SPECIES, getSpeciesById, getNftContracts, speciesCapsLabel } from "@/utils/species";
import { ACTION } from "@/utils/raceTheme";
import RunnerAvatar from "@/components/RunnerAvatar";
import MiniPhaseTimer from "@/components/MiniPhaseTimer";

const ACTIONS = [
  { id: "saboteur", label: "Saboteur", desc: "Disrupt the leaders" },
  { id: "cheerleader", label: "Cheerleader", desc: "Boost trailing pack" },
  { id: "wildcard", label: "Wildcard", desc: "High variance roll" },
];

function tokenKey({ contract, id }) {
  return `${contract}:${id}`;
}

function NftPickTile({ token, speciesId, selected, onSelect, imageMap }) {
  const active = selected && tokenKey(selected) === tokenKey(token);
  return (
    <button
      type="button"
      onClick={() => onSelect({ ...token, speciesId })}
      className={`flex flex-col items-center gap-2 p-3 rounded-xl border-2 transition-all ${
        active
          ? "border-blue-400 bg-blue-950/40 ring-2 ring-blue-400/30 scale-[1.02]"
          : "border-gray-700 bg-gray-900/80 hover:border-gray-500 hover:bg-gray-800/80"
      }`}
    >
      <RunnerAvatar
        nftContract={token.contract}
        nftId={token.id}
        species={speciesId}
        imageMap={imageMap}
        size="xl"
      />
      <span className="text-xs font-mono text-gray-300">#{token.id}</span>
    </button>
  );
}

function SpeciesRow({ species, tokens, selected, onSelect, imageMap, loading }) {
  const label = speciesCapsLabel(species);

  return (
    <div className="border border-gray-800 rounded-xl bg-gray-900/60 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800 bg-gray-900/80">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-black tracking-wide text-white">{label}</h3>
        </div>
        <span className="text-xs text-gray-500 font-medium">
          {loading ? "…" : `${tokens.length} owned`}
        </span>
      </div>

      <div className="p-4">
        {loading ? (
          <p className="text-gray-500 text-sm py-6 text-center">Loading your {species.label} NFTs…</p>
        ) : tokens.length === 0 ? (
          <p className="text-gray-600 text-sm py-4 text-center">
            No {species.label} NFTs in this wallet
          </p>
        ) : (
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
            {tokens.map((t) => (
              <NftPickTile
                key={tokenKey(t)}
                token={t}
                speciesId={species.id}
                selected={selected}
                onSelect={onSelect}
                imageMap={imageMap}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function EnterRaceFlow({ onClose }) {
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: enrolling } = useEnrollingRace();
  const { value: phase } = useCurrentPhase();
  const { address } = useChain(CHAIN_NAME);
  const nowSec = useNowSec();
  const entryRace = entryTargetRace(race, enrolling, nowSec);
  const raceId = entryRace?.current_race_id ?? 0;
  const { value: existingEntry } = useRaceEntry(raceId, address);
  const entryOpen = entryRace ? isEntryOpenForRace(entryRace, nowSec) : false;
  const { queryTokens, enterRace } = useNftRaceActions();

  const [step, setStep] = useState("pick");
  const [selected, setSelected] = useState(null);
  const [action, setAction] = useState("saboteur");
  const [salt] = useState(() => Math.random().toString(36).slice(2));
  const [payFromVault, setPayFromVault] = useState(true);

  const tokensQuery = useQuery({
    queryKey: ["entry_all_tokens", address],
    queryFn: async () => {
      const out = {};
      await Promise.all(
        SPECIES.map(async (s) => {
          const contracts = getNftContracts(s);
          const groups = await Promise.all(
            contracts.map((contract) =>
              queryTokens(contract).then((ids) => ids.map((id) => ({ contract, id })))
            )
          );
          out[s.id] = groups.flat();
        })
      );
      return out;
    },
    enabled: !!address,
    staleTime: 60_000,
  });

  const tokensBySpecies = tokensQuery.data ?? {};
  const allTokens = useMemo(
    () =>
      SPECIES.flatMap((s) =>
        (tokensBySpecies[s.id] ?? []).map((t) => ({ ...t, speciesId: s.id }))
      ),
    [tokensBySpecies]
  );

  const { images } = useNftImages(
    allTokens.map((t) => ({
      nft_contract: t.contract,
      nft_id: t.id,
      species: t.speciesId,
    }))
  );

  useEffect(() => {
    if (existingEntry && step === "pick") {
      onClose?.();
    }
  }, [existingEntry, step, onClose]);

  const handleSelect = (token) => {
    setSelected(token);
    setStep("confirm");
  };

  const handleEnter = async () => {
    if (!selected) return;
    const commitmentB64 = await hashCommitment(action, salt);
    enterRace.mutate(
      {
        nftContract: selected.contract,
        tokenId: selected.id,
        commitmentB64,
        payFromVault,
      },
      {
        onSuccess: () => {
          if (address && raceId) {
            saveRevealPayload({ raceId, address, salt, action });
          }
          raceQuery.refetch();
          onClose?.();
        },
      }
    );
  };

  const species = selected ? getSpeciesById(selected.speciesId) : null;

  return (
    <div className="fixed inset-0 z-40 bg-gray-950 overflow-y-auto">
      <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <header className="flex items-center justify-between gap-4 mb-6">
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-sm font-medium flex items-center gap-1"
          >
            ← Back to race
          </button>
          <h1 className="text-xl font-black text-white">{ACTION.ready}</h1>
          <div className="w-24" />
        </header>

        <div className="mb-6">
          <MiniPhaseTimer />
        </div>

        {!entryOpen && (
          <p className="text-amber-300 text-sm mb-6 rounded-lg border border-amber-700/40 bg-amber-950/30 p-4">
            Entry is closed for this phase. Return to the main screen to watch the race.
          </p>
        )}

        {step === "pick" && (
          <div className="space-y-4">
            <p className="text-gray-400 text-sm">
              Pick one racer to escrow. You need {ENTRY_FEE_ATOM} ATOM in your vault (or attach with the tx).
            </p>
            {SPECIES.map((s) => (
              <SpeciesRow
                key={s.id}
                species={s}
                tokens={tokensBySpecies[s.id] ?? []}
                selected={selected}
                onSelect={handleSelect}
                imageMap={images}
                loading={tokensQuery.isLoading}
              />
            ))}
          </div>
        )}

        {step === "confirm" && selected && (
          <div className="max-w-lg mx-auto">
            <button
              type="button"
              onClick={() => {
                setStep("pick");
                setSelected(null);
              }}
              className="text-gray-500 hover:text-gray-300 text-sm mb-4"
            >
              ← Choose a different racer
            </button>

            <div className="flex flex-col items-center text-center mb-6 p-6 rounded-2xl border border-gray-800 bg-gray-900/80">
              <RunnerAvatar
                nftContract={selected.contract}
                nftId={selected.id}
                species={selected.speciesId}
                imageMap={images}
                size="xl"
              />
              <p className="text-white font-bold text-lg mt-3">
                {species?.label} #{selected.id}
              </p>
              <p className="text-gray-500 text-sm">Escrowed for Race #{raceId}</p>
            </div>

            <p className="text-gray-400 text-sm mb-2">Secret tactic (hashed on-chain)</p>
            <div className="grid gap-2 mb-4">
              {ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setAction(a.id)}
                  className={`text-left p-3 rounded-lg border ${
                    action === a.id
                      ? "border-blue-400 bg-gray-800"
                      : "border-gray-700 bg-gray-900/50"
                  }`}
                >
                  <span className="text-white font-medium">{a.label}</span>
                  <span className="text-gray-500 text-sm block">{a.desc}</span>
                </button>
              ))}
            </div>

            <label className="flex items-center gap-2 text-gray-400 text-sm mb-6">
              <input
                type="checkbox"
                checked={payFromVault}
                onChange={(e) => setPayFromVault(e.target.checked)}
              />
              Pay {ENTRY_FEE_ATOM} ATOM entry fee from vault
            </label>

            <button
              type="button"
              onClick={handleEnter}
              disabled={!entryOpen || enterRace.isPending}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:bg-gray-700 text-white font-bold py-4 rounded-xl text-lg"
            >
              {enterRace.isPending
                ? ACTION.readyPending
                : entryOpen
                  ? `Escrow NFT & ${ACTION.ready}`
                  : "Entry closed"}
            </button>
            <p className="text-gray-600 text-xs text-center mt-3">
              Your reveal salt is saved in this browser after entry.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
