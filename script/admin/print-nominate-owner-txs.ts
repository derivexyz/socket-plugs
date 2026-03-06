/**
 * Prints all "nominateOwner" (or "transferOwnership") calldata for every ownable
 * contract in prod_lyra_addresses.json and prod_lyra-old_addresses.json.
 *
 * Assumes the CURRENT owner is a multisig, so no on-chain reads are needed.
 * The new owner per chain is taken from chainToNewOwner below.
 *
 * Output format (one line per contract, ready to paste into a multisig batch):
 *   <contractAddress>,0,<encodedCalldata>   # <label>
 */

import { ethers } from "ethers";
import { ChainSlug } from "@socket.tech/dl-core";
import { getProviderFromChainSlug } from "../helpers";
import * as lyraAddresses from "../../deployments/superbridge/prod_lyra_addresses.json";
import * as lyraOldAddresses from "../../deployments/superbridge/prod_lyra-old_addresses.json";

// ---------------------------------------------------------------------------
// Configure: new owner per chain (copied from change-ownership.ts)
// ---------------------------------------------------------------------------
const chainToNewOwner: Record<number, string> = {
  // [ChainSlug.MAINNET]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
  // [ChainSlug.ARBITRUM]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
  [ChainSlug.LYRA]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
  // [ChainSlug.BASE]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
  // [ChainSlug.BLAST]: "0x14232db3852eA44A1be8DB35e82D56191f534D95",
  // [ChainSlug.MODE]: "0x14232db3852eA44A1be8DB35e82D56191f534D95",
  // [ChainSlug.OPTIMISM]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
  // [ChainSlug.HYPEREVM]: "0x169a99B9958386a5D91E732Ed08B344946A92391",
};

// ---------------------------------------------------------------------------
// ABI fragments – both Ownable patterns
// ---------------------------------------------------------------------------
const OWNABLE_ABI = [
  "function owner() view returns (address)",
  "function nominee() view returns (address)",
  "function pendingOwner() view returns (address)",
  "function nominateOwner(address nominee_)",
  "function transferOwnership(address newOwner)",
];

const iface = new ethers.utils.Interface(OWNABLE_ABI);

/**
 * Probe the contract on-chain:
 *   - reads the current owner()
 *   - if nominee() exists → nominateOwner pattern (type 0), otherwise type 1
 * Returns { currentOwner, type }
 */
async function detectOwnershipInfo(
  address: string,
  provider: ethers.providers.Provider
): Promise<{ currentOwner: string; type: 0 | 1 }> {
  const contract = new ethers.Contract(address, OWNABLE_ABI, provider);

  let currentOwner = "unknown";
  try {
    currentOwner = await contract.owner();
  } catch (e) {
    console.warn(`[WARN] Could not read owner() for ${address}`);
  }

  let type: 0 | 1;
  try {
    await contract.nominee();
    type = 0; // nominateOwner pattern
  } catch (e) {
    type = 1; // transferOwnership / OZ pattern
  }

  return { currentOwner, type };
}

function encodeForType(type: 0 | 1, newOwner: string): string {
  return type === 0
    ? iface.encodeFunctionData("nominateOwner", [newOwner])
    : iface.encodeFunctionData("transferOwnership", [newOwner]);
}

function fnNameForType(type: 0 | 1): string {
  return type === 0 ? "nominateOwner" : "transferOwnership";
}

// ---------------------------------------------------------------------------
// Contract-type keys that are ownable (i.e. not metadata fields)
// ---------------------------------------------------------------------------
const SKIP_KEYS = new Set(["isAppChain", "connectors", "NonMintableToken"]);

// ---------------------------------------------------------------------------
// Core logic
// ---------------------------------------------------------------------------
interface TxLine {
  chain: number;
  address: string;
  label: string;
  calldata: string;
  fnName: string;
  currentOwner: string;
}

async function collectTxs(
  addresses: Record<string, Record<string, any>>,
  sourceName: string
): Promise<TxLine[]> {
  const txLines: TxLine[] = [];

  for (const chainStr of Object.keys(addresses)) {
    const chain = Number(chainStr);

    if (isNaN(chain)) continue; // skip non-numeric keys (e.g. "default" from JSON import)

    const newOwner = chainToNewOwner[chain];

    if (!newOwner) {
      console.warn(
        `[WARN] No new owner configured for chain ${chain} (${sourceName}), skipping`
      );
      continue;
    }

    let provider: ethers.providers.Provider;
    try {
      provider = getProviderFromChainSlug(chainStr as any);
    } catch {
      console.warn(`[WARN] No RPC configured for chain ${chain}, skipping`);
      continue;
    }

    const tokensMap = addresses[chainStr];

    for (const token of Object.keys(tokensMap)) {
      const entry = tokensMap[token];

      // Top-level ownable contracts (Vault, Controller, tokens, hooks, …)
      for (const key of Object.keys(entry)) {
        if (SKIP_KEYS.has(key)) continue;
        const address: string = entry[key];
        if (!ethers.utils.isAddress(address)) continue;

        const { currentOwner, type } = await detectOwnershipInfo(
          address,
          provider
        );
        txLines.push({
          chain,
          address,
          label: `${sourceName} | chain ${chain} | ${token} | ${key}`,
          calldata: encodeForType(type, newOwner),
          fnName: fnNameForType(type),
          currentOwner,
        });
      }

      // Connectors
      const connectors = entry.connectors ?? {};
      for (const connChain of Object.keys(connectors)) {
        for (const connType of Object.keys(connectors[connChain])) {
          const address: string = connectors[connChain][connType];
          if (!ethers.utils.isAddress(address)) continue;

          const { currentOwner, type } = await detectOwnershipInfo(
            address,
            provider
          );
          txLines.push({
            chain,
            address,
            label: `${sourceName} | chain ${chain} | ${token} | connector → ${connChain} [${connType}]`,
            calldata: encodeForType(type, newOwner),
            fnName: fnNameForType(type),
            currentOwner,
          });
        }
      }
    }
  }

  return txLines;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------
export const main = async () => {
  const allTxs: TxLine[] = [
    ...(await collectTxs(lyraAddresses as any, "prod_lyra")),
    ...(await collectTxs(lyraOldAddresses as any, "prod_lyra-old")),
  ];

  // Deduplicate: same address on same chain should only appear once
  const seen = new Set<string>();
  const dedupedTxs = allTxs.filter((tx) => {
    const key = `${tx.chain}:${tx.address.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Group by chain for readability
  const byChain: Record<number, TxLine[]> = {};
  for (const tx of dedupedTxs) {
    if (!byChain[tx.chain]) byChain[tx.chain] = [];
    byChain[tx.chain].push(tx);
  }

  for (const chain of Object.keys(byChain)
    .map(Number)
    .sort((a, b) => a - b)) {
    const newOwner = chainToNewOwner[chain];
    console.log(
      `\n# ── Chain ${chain}  (new owner: ${newOwner}) ─────────────────`
    );

    // Sub-group by current owner
    const byOwner: Record<string, TxLine[]> = {};
    for (const tx of byChain[chain]) {
      const ownerKey = tx.currentOwner.toLowerCase();
      if (!byOwner[ownerKey]) byOwner[ownerKey] = [];
      byOwner[ownerKey].push(tx);
    }

    for (const ownerKey of Object.keys(byOwner).sort()) {
      const ownerDisplay = byOwner[ownerKey][0].currentOwner;
      console.log(`\n#   Current owner: ${ownerDisplay}`);
      for (const tx of byOwner[ownerKey]) {
        console.log(
          `${tx.address},0,${tx.calldata}` //   # ${tx.fnName} | ${tx.label}`
        );
      }
    }
  }

  console.log(`\n# Total contracts: ${dedupedTxs.length}`);
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
