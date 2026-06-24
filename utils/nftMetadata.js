const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** Memorial NEWTs — resolve via nft_info query. */
export const MEMORIAL_NFT =
  "cosmos1wvda3px69m7hthllx7tkwcraud8waahjk6y2wt2r62fv926nj9eqm99a5g";
/** Original CEWT collection — token_uri → IPFS metadata JSON → png/jpeg image. */
export const CEWT_COLLECTION =
  "cosmos1csxzghvvln5kz9spz7yrqr5rw56mw9pkze56s5v79rk48kwnqwnqeac50s";
/** CEWT Cult Cabal — resolve via nft_info query (direct IPFS image on response). */
export const CABAL_COLLECTION =
  "cosmos14czxvxfr4qrd2m944tfef88gr87dn857ygcq06xsqpj492jgwtfq29ngtz";
export const CEWT_METADATA_CID = "bafybeifix5gy3zkvvs6ppjlcmsz5gxtx6cvtqkhdnbfhnu6hsv6oheumlm";

/** Turn ipfs://, ar://, and relative paths into browser-fetchable URLs. */
export function resolveMediaUri(uri, baseUrl) {
  if (!uri) return null;
  if (uri.startsWith("ipfs://")) {
    const path = uri.slice(7).replace(/^ipfs\//, "");
    return `${IPFS_GATEWAY}${path}`;
  }
  if (uri.startsWith("ar://")) {
    return `https://arweave.net/${uri.slice(5)}`;
  }
  if (uri.startsWith("http://") || uri.startsWith("https://")) {
    return uri;
  }
  if (uri.startsWith("/") && baseUrl) {
    try {
      return new URL(uri, baseUrl).href;
    } catch {
      return null;
    }
  }
  return uri;
}

function imageFromMetadata(meta) {
  if (!meta || typeof meta !== "object") return null;
  const direct = meta.image ?? meta.animation_url;
  if (direct) return direct;
  const file = meta.properties?.files?.[0]?.uri;
  return file ?? null;
}

/** Candidate URLs for off-chain metadata JSON (CEWT omits .json on token_uri). */
export function metadataJsonUrls(tokenUri) {
  const resolved = resolveMediaUri(tokenUri);
  if (!resolved) return [];

  const urls = [resolved];
  if (!/\.json(\?|#|$)/i.test(resolved)) {
    urls.push(`${resolved}.json`);
  }
  return urls;
}

/** Fetch OpenSea-style metadata JSON from token_uri. */
export async function fetchMetadataJson(tokenUri) {
  for (const url of metadataJsonUrls(tokenUri)) {
    try {
      const res = await fetch(url);
      if (!res.ok) continue;

      const contentType = res.headers.get("content-type") ?? "";
      if (contentType.includes("application/json") || /\.json(\?|#|$)/i.test(url)) {
        return await res.json();
      }

      const text = await res.text();
      if (text.trimStart().startsWith("{")) {
        return JSON.parse(text);
      }
    } catch {
      // try next candidate
    }
  }
  return null;
}

function imageFromExtension(extension) {
  if (!extension || typeof extension !== "object") return null;
  const img = extension.image ?? extension.metadata?.image;
  if (typeof img === "string" && img.trim()) return resolveMediaUri(img);
  return null;
}

/** CW721 nft_info query — falls back to all_nft_info when needed. */
export async function queryNftInfo(readClient, contract, tokenId) {
  const id = String(tokenId);
  try {
    return await readClient.queryContractSmart(contract, { nft_info: { token_id: id } });
  } catch {
    const all = await readClient.queryContractSmart(contract, {
      all_nft_info: { token_id: id },
    });
    return all?.info ?? all;
  }
}

function cewtMetadataUri(tokenId) {
  return `ipfs://${CEWT_METADATA_CID}/${String(tokenId)}`;
}

async function imageFromTokenUri(tokenUri) {
  const meta = await fetchMetadataJson(tokenUri);
  const image = imageFromMetadata(meta);
  if (image) return resolveMediaUri(image, resolveMediaUri(tokenUri));
  return null;
}

/**
 * Read a direct image URI from an nft_info response (on-chain or extension fields).
 * Does not treat token_uri as an image — that points at metadata JSON for many collections.
 */
export function imageFromNftInfoResponse(nftInfo) {
  if (!nftInfo || typeof nftInfo !== "object") return null;

  const topLevel = nftInfo.image;
  if (typeof topLevel === "string" && topLevel.trim()) {
    return resolveMediaUri(topLevel);
  }

  return imageFromExtension(nftInfo.extension);
}

/** Resolve a runner's display image URL from CW721 + metadata JSON. */
export async function fetchNftImageUrl(readClient, contract, tokenId) {
  if (!contract || tokenId == null) return null;

  try {
    const nftInfo = await queryNftInfo(readClient, contract, tokenId);
    if (!nftInfo) return null;

    const directImage = imageFromNftInfoResponse(nftInfo);
    if (directImage) return directImage;

    const tokenUri =
      nftInfo.token_uri ||
      (contract === CEWT_COLLECTION ? cewtMetadataUri(tokenId) : null);
    if (!tokenUri) return null;

    return await imageFromTokenUri(tokenUri);
  } catch {
    return null;
  }
}

export function nftImageKey(contract, tokenId) {
  if (!contract || tokenId == null) return null;
  return `${contract}:${tokenId}`;
}

function nameFromCollectionResponse(res) {
  const data = res?.data ?? res;
  if (!data || typeof data !== "object") return null;
  const name =
    data.name?.trim() ||
    data.collection_info?.name?.trim() ||
    data.info?.name?.trim() ||
    data.symbol?.trim();
  return name || null;
}

/** CW721 collection display name — standard + Stargaze/migration query shapes. */
export async function fetchCollectionName(readClient, contract) {
  if (!contract) return null;

  const queries = [
    { get_collection_info_and_extension: {} },
    { contract_info: {} },
    { collection_info: {} },
  ];

  for (const query of queries) {
    try {
      const res = await readClient.queryContractSmart(contract, query);
      const name = nameFromCollectionResponse(res);
      if (name) return name;
    } catch {
      // try next query shape
    }
  }
  return null;
}
