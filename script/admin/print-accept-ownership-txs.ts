/**
 * Prints all "claimOwner" (or "acceptOwnership") calldata for every ownable
 * contract in prod_lyra_addresses.json and prod_lyra-old_addresses.json.
 *
 * For each contract the script reads the on-chain nominee / pendingOwner to
 * find out who has to call the acceptance function, then groups the output by
 * that address so it can be pasted directly into the correct multisig batch.
 *
 * Output format (one line per contract, ready to paste into a multisig batch):
 *   <contractAddress>,0,<encodedCalldata>   # <fnName> | <label>
 */

import { ethers } from "ethers";
import { ChainSlug } from "@socket.tech/dl-core";
import { getProviderFromChainSlug } from "../helpers";
import * as lyraAddresses from "../../deployments/superbridge/prod_lyra_addresses.json";
import * as lyraOldAddresses from "../../deployments/superbridge/prod_lyra-old_addresses.json";

// ---------------------------------------------------------------------------
// Chains to process (add / remove as needed)
// ---------------------------------------------------------------------------
const CHAINS_TO_PROCESS = new Set<number>([
  ChainSlug.MAINNET,
  ChainSlug.ARBITRUM,
  ChainSlug.LYRA,
  ChainSlug.BASE,
  // ChainSlug.BLAST,
  // ChainSlug.MODE,
  ChainSlug.OPTIMISM,
  ChainSlug.HYPEREVM,
]);

// ---------------------------------------------------------------------------
// ABI fragments – both Ownable patterns
// ---------------------------------------------------------------------------
const OWNABLE_ABI = [
  "function owner() view returns (address)",
  "function nominee() view returns (address)", // Socket custom pattern
  "function pendingOwner() view returns (address)", // OZ Ownable2Step pattern
  "function claimOwner()", // Socket custom accept
  "function acceptOwnership()", // OZ Ownable2Step accept
];

const iface = new ethers.utils.Interface(OWNABLE_ABI);

/**
 * Probe the contract on-chain:
 *   - reads the current owner()
 *   - tries nominee() first (Socket pattern), falls back to pendingOwner() (OZ)
 *   - derives which acceptance function to call
 *
 * Returns { currentOwner, nominee, fnName, calldata }
 * If no pending nominee/owner is found, returns null (nothing to do).
 */
async function detectAcceptanceInfo(
  address: string,
  provider: ethers.providers.Provider
): Promise<{
  currentOwner: string;
  nominee: string;
  fnName: string;
  calldata: string;
} | null> {
  const contract = new ethers.Contract(address, OWNABLE_ABI, provider);

  let currentOwner = "unknown";
  try {
    currentOwner = await contract.owner();
  } catch {
    console.warn(`[WARN] Could not read owner() for ${address}`);
  }

  // Try Socket-style nominee() first
  try {
    const nominee: string = await contract.nominee();
    if (nominee && nominee !== ethers.constants.AddressZero) {
      return {
        currentOwner,
        nominee,
        fnName: "claimOwner",
        calldata: iface.encodeFunctionData("claimOwner", []),
      };
    }
  } catch {
    // not this pattern
  }

  // Try OZ-style pendingOwner()
  try {
    const pendingOwner: string = await contract.pendingOwner();
    if (pendingOwner && pendingOwner !== ethers.constants.AddressZero) {
      return {
        currentOwner,
        nominee: pendingOwner,
        fnName: "acceptOwnership",
        calldata: iface.encodeFunctionData("acceptOwnership", []),
      };
    }
  } catch {
    // not this pattern
  }

  // No pending transfer – nothing to do
  return null;
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
  nominee: string;
}

async function collectTxs(
  addresses: Record<string, Record<string, any>>,
  sourceName: string
): Promise<TxLine[]> {
  const txLines: TxLine[] = [];

  for (const chainStr of Object.keys(addresses)) {
    const chain = Number(chainStr);

    if (isNaN(chain)) continue; // skip non-numeric keys (e.g. "default" from JSON import)

    if (!CHAINS_TO_PROCESS.has(chain)) {
      console.warn(
        `[WARN] Chain ${chain} not in CHAINS_TO_PROCESS (${sourceName}), skipping`
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

        const info = await detectAcceptanceInfo(address, provider);
        if (!info) continue; // no pending transfer

        txLines.push({
          chain,
          address,
          label: `${sourceName} | chain ${chain} | ${token} | ${key}`,
          calldata: info.calldata,
          fnName: info.fnName,
          currentOwner: info.currentOwner,
          nominee: info.nominee,
        });
      }

      // Connectors
      const connectors = entry.connectors ?? {};
      for (const connChain of Object.keys(connectors)) {
        for (const connType of Object.keys(connectors[connChain])) {
          const address: string = connectors[connChain][connType];
          if (!ethers.utils.isAddress(address)) continue;

          const info = await detectAcceptanceInfo(address, provider);
          if (!info) continue; // no pending transfer

          txLines.push({
            chain,
            address,
            label: `${sourceName} | chain ${chain} | ${token} | connector → ${connChain} [${connType}]`,
            calldata: info.calldata,
            fnName: info.fnName,
            currentOwner: info.currentOwner,
            nominee: info.nominee,
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

  if (dedupedTxs.length === 0) {
    console.log("# No contracts with a pending ownership transfer found.");
    return;
  }

  // Group by chain, then by nominee (who needs to sign the acceptance)
  const byChain: Record<number, TxLine[]> = {};
  for (const tx of dedupedTxs) {
    if (!byChain[tx.chain]) byChain[tx.chain] = [];
    byChain[tx.chain].push(tx);
  }

  for (const chain of Object.keys(byChain)
    .map(Number)
    .sort((a, b) => a - b)) {
    console.log(
      `\n# ── Chain ${chain} ─────────────────────────────────────────`
    );

    // Sub-group by nominee (the address that must call accept)
    const byNominee: Record<string, TxLine[]> = {};
    for (const tx of byChain[chain]) {
      const key = tx.nominee.toLowerCase();
      if (!byNominee[key]) byNominee[key] = [];
      byNominee[key].push(tx);
    }

    for (const nomineeKey of Object.keys(byNominee).sort()) {
      const nomineeDisplay = byNominee[nomineeKey][0].nominee;
      console.log(
        `\n#   Nominee / pending owner (must sign): ${nomineeDisplay}`
      );
      for (const tx of byNominee[nomineeKey]) {
        console.log(
          `${tx.address},0,${tx.calldata}`
          //   # ${tx.fnName} | current owner: ${tx.currentOwner} | ${tx.label}`
        );
      }
    }
  }

  console.log(
    `\n# Total contracts with pending transfer: ${dedupedTxs.length}`
  );
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
