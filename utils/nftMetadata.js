const IPFS_GATEWAY = "https://ipfs.io/ipfs/";

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

/** Resolve a runner's display image URL from CW721 + metadata JSON. */
export async function fetchNftImageUrl(readClient, contract, tokenId) {
  if (!contract || tokenId == null) return null;

  try {
    const raw = await queryNftInfo(readClient, contract, tokenId);
    const info = normalizeNftInfo(raw);
    if (!info) return null;

    const extImage = imageFromExtension(info.extension);
    if (extImage) return resolveMediaUri(extImage);

    const tokenUri = info.token_uri;
    if (!tokenUri) return null;

    const metaUrl = resolveMediaUri(tokenUri);
    if (!metaUrl) return null;

    const res = await fetch(metaUrl);
    if (!res.ok) return null;

    const meta = await res.json();
    const image = meta.image ?? meta.animation_url;
    return resolveMediaUri(image, metaUrl);
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
