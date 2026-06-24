/**
 * Smoke-test NFT image resolution against live chain data.
 * Run: node scripts/verify-nft-images.js
 */
const {
  fetchNftImageUrl,
  queryNftInfo,
  imageFromNftInfoResponse,
  CABAL_COLLECTION,
  CEWT_COLLECTION,
  MEMORIAL_NFT,
} = require("../utils/nftMetadata.js");
const { createCosmosQueryClient } = require("@interchainjs/cosmos");
const { getSmartContractState } = require("interchainjs/cosmwasm/wasm/v1/query.rpc.func");
const { toUtf8, fromUtf8 } = require("@interchainjs/encoding");

async function main() {
  const qc = await createCosmosQueryClient("https://cosmos-rpc.publicnode.com:443");
  const readClient = {
    queryContractSmart: async (contract, query) => {
      const res = await getSmartContractState(qc, {
        address: contract,
        queryData: toUtf8(JSON.stringify(query)),
      });
      const raw = fromUtf8(res.data);
      return raw ? JSON.parse(raw) : null;
    },
  };

  const cabal624 = await queryNftInfo(readClient, CABAL_COLLECTION, "624");
  console.log("Cabal #624 nft_info response:", JSON.stringify(cabal624));

  const cases = [
    ["Cabal #588 (nft_info)", CABAL_COLLECTION, "588", true],
    ["Cabal #82 (nft_info)", CABAL_COLLECTION, "82", true],
    ["Cabal #624 (nft_info)", CABAL_COLLECTION, "624", true],
    ["CEWT #1146 (metadata JSON)", CEWT_COLLECTION, "1146", true],
    ["Memorial #37 (nft_info)", MEMORIAL_NFT, "37", true],
  ];

  let failed = 0;
  for (const [label, contract, tokenId, expectImage] of cases) {
    const nftInfo = await queryNftInfo(readClient, contract, tokenId);
    const parsed = imageFromNftInfoResponse(nftInfo);
    const url = await fetchNftImageUrl(readClient, contract, tokenId);
    const ok = expectImage ? !!url : !url;
    console.log(`${ok ? "✓" : "✗"} ${label}`);
    console.log(`    nft_info image field: ${parsed ?? "(none)"}`);
    console.log(`    resolved URL: ${url ?? "(none)"}`);
    if (!ok) failed += 1;
  }

  if (failed > 0) {
    process.exitCode = 1;
    console.error(`\n${failed} check(s) failed`);
  } else {
    console.log("\nAll checks passed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
