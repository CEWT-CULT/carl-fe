"use client";

import { useState, useEffect } from "react";
import { useNftRaceActions } from "@/hooks/useNftRaceActions";
import { hashCommitment } from "@/utils/race";
import { saveRevealPayload } from "@/utils/revealStorage";
import { useRaceGlobal, useCurrentPhase, useUser } from "@/hooks";
import { useChain } from "@/hooks/useChainClient";
import { CHAIN_NAME } from "@/config";
import EntryVaultSection from "@/components/EntryVaultSection";
import { hasVaultEntryFunds } from "@/components/VaultEntryFundsNotice";
import MiniPhaseTimer from "@/components/MiniPhaseTimer";
import { SPECIES, getSpeciesById, getNftContracts } from "@/utils/species";
import { isEntryOpen } from "@/utils/phases";
import { ACTION } from "@/utils/raceTheme";

const ACTIONS = [
  { id: "saboteur", label: "Saboteur", desc: "Disrupt the leaders" },
  { id: "cheerleader", label: "Cheerleader", desc: "Boost trailing pack" },
  { id: "wildcard", label: "Wildcard", desc: "High variance roll" },
];

const COLOR_ACTIVE = {
  amber: "bg-amber-600",
  emerald: "bg-emerald-600",
  sky: "bg-sky-600",
  violet: "bg-violet-600",
  lime: "bg-lime-600",
  rose: "bg-rose-600",
  orange: "bg-orange-600",
  yellow: "bg-yellow-600",
};

function tokenKey({ contract, id }) {
  return `${contract}:${id}`;
}

function parseTokenKey(value) {
  const sep = value.indexOf(":");
  if (sep < 0) return { contract: "", id: "" };
  return { contract: value.slice(0, sep), id: value.slice(sep + 1) };
}

export default function EnterRaceCard() {
  const { value: race, query: raceQuery } = useRaceGlobal();
  const { value: phase } = useCurrentPhase();
  const { address } = useChain(CHAIN_NAME);
  const { value: user, query: userQuery } = useUser(address);
  const entryOpen = isEntryOpen(phase);
  const { queryTokens, enterRace } = useNftRaceActions();
  const vaultUatom = Number(user?.deposits ?? 0);
  const hasVaultFunds = hasVaultEntryFunds(vaultUatom);
  const [speciesId, setSpeciesId] = useState("chicken");
  const [tokens, setTokens] = useState([]);
  const [tokensLoading, setTokensLoading] = useState(false);
  const [selectedToken, setSelectedToken] = useState("");
  const [action, setAction] = useState("saboteur");
  const [salt, setSalt] = useState(() => Math.random().toString(36).slice(2));
  const species = getSpeciesById(speciesId);
  const nftContracts = getNftContracts(species);

  useEffect(() => {
    setSelectedToken("");
    if (!nftContracts.length) {
      setTokens([]);
      setTokensLoading(false);
      return;
    }
    setTokensLoading(true);
    Promise.all(
      nftContracts.map((contract) =>
        queryTokens(contract).then((ids) =>
          ids.map((id) => ({ contract, id }))
        )
      )
    )
      .then((groups) => setTokens(groups.flat()))
      .finally(() => setTokensLoading(false));
  }, [speciesId, nftContracts.join(",")]);

  const handleEnter = async () => {
    if (!hasVaultFunds) return;
    const { contract: nftContract, id: tokenId } = parseTokenKey(selectedToken);
    const commitmentB64 = await hashCommitment(action, salt);
    const raceId = race?.current_race_id ?? 0;
    enterRace.mutate(
      { nftContract, tokenId, commitmentB64 },
      {
        onSuccess: () => {
          if (address && raceId) {
            saveRevealPayload({ raceId, address, salt, action });
          }
          raceQuery.refetch();
          setSelectedToken("");
        },
      }
    );
  };

  return (
    <div className="bg-gray-800 p-6 rounded-lg">
      <h2 className="text-xl font-bold text-gray-100 mb-4">{ACTION.ready}</h2>
      <EntryVaultSection
        vaultUatom={vaultUatom}
        loading={userQuery.isLoading}
        className="mb-4"
      />
      <p className="text-gray-500 text-sm mb-4">
        Escrow an allowed NFT and commit your tactic hash once your vault is funded.
      </p>

      <div className="mb-4">
        <MiniPhaseTimer />
      </div>

      {!entryOpen && (
        <p className="text-amber-400/90 text-sm mb-4 rounded border border-amber-600/40 bg-amber-950/30 p-3">
          Entry is closed for this phase. Wait for the next race or check the phase banner above.
        </p>
      )}

      <div className="flex flex-wrap gap-2 mb-4">
        {SPECIES.map((s) => (
          <button
            key={s.id}
            onClick={() => setSpeciesId(s.id)}
            className={`px-3 py-2 rounded text-white text-sm ${speciesId === s.id ? COLOR_ACTIVE[s.color] : "bg-gray-700"}`}
          >
            {s.label}
          </button>
        ))}
      </div>

      <label className="text-gray-400 text-sm block mb-1">Your {species?.label} NFT</label>
      <select
        value={selectedToken}
        onChange={(e) => setSelectedToken(e.target.value)}
        disabled={!hasVaultFunds}
        className="w-full bg-gray-700 text-white p-2 rounded mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <option value="">
          {hasVaultFunds ? "Select token…" : "Deposit to vault first…"}
        </option>
        {tokens.map((t) => (
          <option key={tokenKey(t)} value={tokenKey(t)}>
            #{t.id}
            {nftContracts.length > 1 ? ` (${t.contract.slice(-6)})` : ""}
          </option>
        ))}
      </select>

      {tokensLoading && (
        <p className="text-gray-500 text-sm mb-4">Loading your {species?.label} NFTs…</p>
      )}

      {!tokensLoading && tokens.length === 0 && (
        <div className="mb-4 rounded border border-amber-600/40 bg-amber-950/30 p-3 text-sm text-amber-100/90">
          <p className="font-medium text-amber-200 mb-1">No {species?.label} NFTs found in this wallet</p>
          <p className="text-amber-100/70 text-xs">
            Race entry requires escrowing a real NFT from an allowed collection on Cosmos Hub (Chicken, Newt, Babu, etc.).
            Vault balance alone is not enough — try another species tab, or transfer an NFT to this wallet first.
          </p>
        </div>
      )}

      <label className="text-gray-400 text-sm block mb-1">Secret tactic (hashed on-chain)</label>
      <div className="grid grid-cols-1 gap-2 mb-4">
        {ACTIONS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAction(a.id)}
            className={`text-left p-3 rounded border ${action === a.id ? "border-blue-400 bg-gray-700" : "border-gray-600"}`}
          >
            <span className="text-white font-medium">{a.label}</span>
            <span className="text-gray-500 text-sm block">{a.desc}</span>
          </button>
        ))}
      </div>

      <button
        onClick={handleEnter}
        disabled={!selectedToken || enterRace.isPending || !entryOpen || !hasVaultFunds}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white font-bold py-3 rounded"
      >
        {enterRace.isPending
          ? ACTION.readyPending
          : !hasVaultFunds
            ? "Deposit to vault first"
            : entryOpen
              ? `Escrow NFT & ${ACTION.ready}`
              : "Entry closed"}
      </button>
      <p className="text-gray-500 text-xs mt-2">
        Salt is saved in this browser after you enter — no need to copy it for {ACTION.set}.
      </p>
    </div>
  );
}
