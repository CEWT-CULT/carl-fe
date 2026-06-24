const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

/** Original CEWT collection — token_uri points at IPFS folder entry without .json suffix. */
export const CEWT_COLLECTION =
  "cosmos1csxzghvvln5kz9spz7yrqr5rw56mw9pkze56s5v79rk48kwnqwnqeac50s";
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

function imageFromExtension(extension) {
  if (!extension || typeof extension !== "object") return null;
  return extension.image ?? extension.metadata?.image ?? null;
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

async function queryNftInfo(readClient, contract, tokenId) {
  const id = String(tokenId);
  try {
    return await readClient.queryContractSmart(contract, { nft_info: { token_id: id } });
  } catch {
    return await readClient.queryContractSmart(contract, {
      all_nft_info: { token_id: id },
    });
  }
}

function normalizeNftInfo(raw) {
  if (!raw) return null;
  if (raw.info) return raw.info;
  return raw;
}

function cewtMetadataUri(tokenId) {
  return `ipfs://${CEWT_METADATA_CID}/${String(tokenId)}`;
}

/** Resolve a runner's display image URL from CW721 + metadata JSON. */
export async function fetchNftImageUrl(readClient, contract, tokenId) {
  if (!contract || tokenId == null) return null;

  try {
    const raw = await queryNftInfo(readClient, contract, tokenId);
    const info = normalizeNftInfo(raw);
    if (!info) return null;

    const extImage = imageFromExtension(info.extension);
    if (extImage) return resolveMediaUri(extImage);

    const tokenUri =
      info.token_uri ||
      (contract === CEWT_COLLECTION ? cewtMetadataUri(tokenId) : null);
    if (!tokenUri) return null;

    const meta = await fetchMetadataJson(tokenUri);
    const image = imageFromMetadata(meta);
    if (!image) return null;

    return resolveMediaUri(image, resolveMediaUri(tokenUri));
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
