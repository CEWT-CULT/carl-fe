import {
  CHICKEN_NFT,
  NEWT_NFTS,
  PENGUIN_NFT,
  FLY_NFT,
  FROG_NFT,
  BULL_NFT,
  FOX_NFT,
  DUCK_NFTS,
  MANTA_NFT,
  SHRIMP_NFTS,
  SLOTH_NFT,
  MOTH_NFT,
  SNAIL_NFT,
  STEER_NFT,
  GOAT_NFT,
  KITTY_NFTS,
} from "@/config";

export const SPECIES = [
  { id: "chicken", label: "Chicken", nft: CHICKEN_NFT, betType: "chicken_victory", color: "amber" },
  { id: "newt", label: "Newt", nfts: NEWT_NFTS, betType: "newt_victory", color: "emerald" },
  { id: "penguin", label: "Babu", deskLabel: "BABU", nft: PENGUIN_NFT, betType: "penguin_victory", color: "sky" },
  { id: "fly", label: "Fly", nft: FLY_NFT, betType: "fly_victory", color: "violet" },
  { id: "frog", label: "Frog", nft: FROG_NFT, betType: "frog_victory", color: "lime" },
  { id: "bull", label: "Bull", nft: BULL_NFT, betType: "bull_victory", color: "rose" },
  { id: "fox", label: "Fox", nft: FOX_NFT, betType: "fox_victory", color: "orange" },
  { id: "duck", label: "Duck", nfts: DUCK_NFTS, betType: "duck_victory", color: "yellow" },
  { id: "manta", label: "Manta", nft: MANTA_NFT, betType: "manta_victory", color: "cyan" },
  { id: "shrimp", label: "Shrimp", nfts: SHRIMP_NFTS, betType: "shrimp_victory", color: "pink" },
  { id: "sloth", label: "Sloth", nft: SLOTH_NFT, betType: "sloth_victory", color: "stone" },
  { id: "moth", label: "Moth", nft: MOTH_NFT, betType: "moth_victory", color: "fuchsia" },
  { id: "snail", label: "Snail", nft: SNAIL_NFT, betType: "snail_victory", color: "teal" },
  { id: "steer", label: "Steer", nft: STEER_NFT, betType: "steer_victory", color: "indigo" },
  { id: "goat", label: "Goat", nft: GOAT_NFT, betType: "goat_victory", color: "gray" },
  { id: "kitty", label: "Kitty", nfts: KITTY_NFTS, betType: "kitty_victory", color: "red" },
];

export const UNDERDOG_BET = {
  id: "underdog_wins",
  label: "Underdog Top 2",
  desc: "Level < 5 finisher in top 2",
};

export function speciesKey(entry) {
  if (!entry?.species) return null;
  if (typeof entry.species === "string") {
    if (entry.species.includes("_") || entry.species === entry.species.toLowerCase()) {
      return entry.species;
    }
    return WASM_SPECIES_TO_ID[entry.species] ?? entry.species.toLowerCase();
  }
  return Object.keys(entry.species)[0] ?? null;
}

const WASM_SPECIES_TO_ID = {
  Chicken: "chicken",
  Newt: "newt",
  Penguin: "penguin",
  Fly: "fly",
  Frog: "frog",
  Bull: "bull",
  Fox: "fox",
  Duck: "duck",
  Manta: "manta",
  Shrimp: "shrimp",
  Sloth: "sloth",
  Moth: "moth",
  Snail: "snail",
  Steer: "steer",
  Goat: "goat",
  Kitty: "kitty",
};

export function wasmSpeciesLabel(species) {
  const id = speciesKey({ species });
  const meta = SPECIES.find((s) => s.id === id);
  return meta ? meta.label : String(species ?? "Runner");
}

/** Single-letter fallback when no NFT image is available. */
export function speciesInitial(species) {
  const label = wasmSpeciesLabel(species);
  return label.charAt(0).toUpperCase() || "?";
}

export function getSpeciesById(id) {
  return SPECIES.find((s) => s.id === id);
}

/** CHICKENS, NEWTS, DUCKS, etc. */
export function speciesCapsLabel(speciesOrMeta) {
  const meta =
    typeof speciesOrMeta === "object" && speciesOrMeta?.label
      ? speciesOrMeta
      : getSpeciesById(typeof speciesOrMeta === "string" ? speciesOrMeta : speciesKey({ species: speciesOrMeta }));
  if (!meta) return "RUNNER";
  if (meta.deskLabel) return meta.deskLabel;
  const base = meta.label.toUpperCase();
  return base.endsWith("S") ? base : `${base}S`;
}

/** CW721 contract(s) for a species — some species have multiple collections. */
export function getNftContracts(species) {
  if (!species) return [];
  if (species.nfts?.length) return species.nfts;
  if (species.nft) return [species.nft];
  return [];
}
