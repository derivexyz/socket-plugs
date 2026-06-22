import { BigNumber, Contract, ethers, Wallet } from "ethers";

import {
  ChainSlug,
  IntegrationTypes,
  getAddresses,
} from "@socket.tech/dl-core";

import { getSignerFromChainSlug, overrides } from "../../helpers/networks";
import {
  getInstance,
  getProjectAddresses,
  encodePoolId,
} from "../../helpers/utils";
import {
  AppChainAddresses,
  SuperBridgeContracts,
  ConnectorAddresses,
  Connectors,
  NonAppChainAddresses,
  ProjectAddresses,
  TokenAddresses,
  Tokens,
  tokenDecimals,
} from "../../../src";
import { getDryRun, getMode, getProject } from "../../constants/config";
import { ProjectTokenConstants } from "../../constants/types";
import { getSocket } from "../../bridge/utils";
import { utils } from "ethers";

type UpdateLimitParams = [
  boolean,
  string,
  string | number | BigNumber,
  string | number | BigNumber
];

// Global dry run call collector: chainId -> ["addr,0,calldata", ...]
const dryRunCalls: { [chainId: number]: string[] } = {};

async function execute(
  contract: ethers.Contract,
  method: string,
  args: any[],
  chain: number,
  optionalOverrides?: any,
  description?: string
) {
  if (getDryRun()) {
    const calldata = contract.interface.encodeFunctionData(method, args);
    if (!dryRunCalls[chain]) dryRunCalls[chain] = [];
    dryRunCalls[chain].push(`${contract.address},0,${calldata}`);
    dryRunCalls[chain].push(`${description}`);
  } else {
    let tx = await contract.functions[method](...args, {
      ...overrides[chain],
      ...(optionalOverrides || {}),
    });
    console.log(`Sent on chain: ${chain} txHash: ${tx.hash}`);
    await tx.wait();
  }
}

function getIntegrationTypeConstsForToken(
  it: IntegrationTypes,
  nonAppChain: ChainSlug,
  pc: ProjectTokenConstants
) {
  const pci = pc.nonAppChains[nonAppChain]?.[it];
  if (!pci)
    throw new Error(
      `invalid integration for nonAppChain ${nonAppChain}, it ${it}`
    );
  return pci;
}

function getLimitBNForToken(
  it: IntegrationTypes,
  nonAppChain: ChainSlug,
  isDeposit: boolean,
  pc: ProjectTokenConstants,
  token: Tokens
): BigNumber {
  const consts = getIntegrationTypeConstsForToken(it, nonAppChain, pc);
  const decimals = tokenDecimals[token];
  return utils.parseUnits(
    isDeposit ? consts.depositLimit : consts.withdrawLimit,
    decimals
  );
}

function getRateBNForToken(
  it: IntegrationTypes,
  nonAppChain: ChainSlug,
  isDeposit: boolean,
  pc: ProjectTokenConstants,
  token: Tokens
): BigNumber {
  const consts = getIntegrationTypeConstsForToken(it, nonAppChain, pc);
  const decimals = tokenDecimals[token];
  return utils.parseUnits(
    isDeposit ? consts.depositRate : consts.withdrawRate,
    decimals
  );
}

function getPoolIdHexForToken(
  chainSlug: ChainSlug,
  it: IntegrationTypes,
  pc: ProjectTokenConstants
): string {
  return encodePoolId(
    chainSlug,
    getIntegrationTypeConstsForToken(it, chainSlug, pc).poolCount
  );
}

export const main = async () => {
  try {
    const addresses = await getProjectAddresses();

    // Get token list from chain 957 (AEVO app chain)
    const APP_CHAIN_FOR_TOKEN_LIST = 957 as unknown as ChainSlug;
    const tokens = Object.keys(
      addresses[APP_CHAIN_FOR_TOKEN_LIST] ?? {}
    ) as Tokens[];

    if (!tokens.length) {
      console.log("No tokens found in addresses[957]");
      return;
    }

    console.log("Tokens found:", tokens);

    // Load project-level constants for all tokens at once
    const allProjectConstants: Partial<Record<Tokens, ProjectTokenConstants>> =
      require(`../../constants/project-constants/${getProject()}`)?.[
        getMode()
      ] ?? {};

    // Collect all chains that appear across any token
    const allChainsSet = new Set<ChainSlug>();
    for (const token of tokens) {
      const pc = allProjectConstants[token];
      if (!pc) continue;
      allChainsSet.add(pc.appChain);
      Object.keys(pc.nonAppChains).forEach((k) =>
        allChainsSet.add(parseInt(k) as ChainSlug)
      );
    }

    // Promise.all per chain; each chain iterates over all its tokens
    await Promise.all(
      Array.from(allChainsSet).map(async (chain) => {
        const socketSigner = getSignerFromChainSlug(chain);

        for (const token of tokens) {
          const pc = allProjectConstants[token];
          if (!pc) continue;

          const addr: TokenAddresses | undefined = addresses[chain]?.[token];
          const connectors: Connectors | undefined = addr?.connectors;
          if (!addr || !connectors) continue;

          const siblingSlugs: ChainSlug[] = Object.keys(connectors).map((k) =>
            parseInt(k)
          ) as ChainSlug[];

          console.log(
            `[${token}] Configuring chain ${chain} for siblings ${siblingSlugs}`
          );

          await connectForToken(
            addr,
            addresses,
            chain,
            siblingSlugs,
            socketSigner,
            token,
            pc
          );

          let contract: Contract;
          if (addr.isAppChain) {
            const a = addr as AppChainAddresses;
            if (!a.Controller) {
              console.log(`[${token}] Controller not found on chain ${chain}`);
              continue;
            }
            contract = await getInstance(
              SuperBridgeContracts.Controller,
              a.Controller
            );
          } else {
            const a = addr as NonAppChainAddresses;
            if (!a.Vault) {
              console.log(`[${token}] Vault not found on chain ${chain}`);
              continue;
            }
            contract = await getInstance(SuperBridgeContracts.Vault, a.Vault);
          }

          contract = contract.connect(socketSigner);

          const updateLimitParams: UpdateLimitParams[] = [];
          const connectorAddresses: string[] = [];
          const connectorPoolIds: string[] = [];

          let summary = "";

          for (const sibling of siblingSlugs) {
            const siblingConnectorAddresses: ConnectorAddresses | undefined =
              connectors[sibling];
            if (!siblingConnectorAddresses) continue;

            const integrationTypes: IntegrationTypes[] = Object.keys(
              siblingConnectorAddresses
            ) as unknown as IntegrationTypes[];

            for (const it of integrationTypes) {
              const itConnectorAddress: string | undefined =
                siblingConnectorAddresses[it];
              if (!itConnectorAddress) continue;

              // non-app chain for limit lookup
              const nonAppChainForLimits =
                pc.appChain === sibling ? chain : sibling;

              let lockParams;
              if (addr.isAppChain) {
                lockParams = await contract.functions.getMintLimitParams(
                  itConnectorAddress
                );
              } else {
                lockParams = await contract.functions.getLockLimitParams(
                  itConnectorAddress
                );
              }

              let unlockParams;
              if (addr.isAppChain) {
                unlockParams = await contract.functions.getBurnLimitParams(
                  itConnectorAddress
                );
              } else {
                unlockParams = await contract.functions.getUnlockLimitParams(
                  itConnectorAddress
                );
              }

              const mintLimit = getLimitBNForToken(
                it,
                nonAppChainForLimits,
                true,
                pc,
                token
              );
              const mintRate = getRateBNForToken(
                it,
                nonAppChainForLimits,
                true,
                pc,
                token
              );

              if (
                !mintLimit.eq(lockParams[0]["maxLimit"]) ||
                !mintRate.eq(lockParams[0]["ratePerSecond"])
              ) {
                updateLimitParams.push([
                  true,
                  itConnectorAddress,
                  mintLimit,
                  mintRate,
                ]);
                summary += `${sibling} mint: [${mintLimit} | ${mintRate}/sec] `;
              }

              const burnLimit = getLimitBNForToken(
                it,
                nonAppChainForLimits,
                false,
                pc,
                token
              );
              const burnRate = getRateBNForToken(
                it,
                nonAppChainForLimits,
                false,
                pc,
                token
              );

              if (
                !burnLimit.eq(unlockParams[0]["maxLimit"]) ||
                !burnRate.eq(unlockParams[0]["ratePerSecond"])
              ) {
                updateLimitParams.push([
                  false,
                  itConnectorAddress,
                  burnLimit,
                  burnRate,
                ]);
                summary += `${sibling} burn: [${burnLimit} | ${burnRate}/sec] `;
              }

              if (chain === pc.appChain) {
                connectorAddresses.push(itConnectorAddress);
                connectorPoolIds.push(getPoolIdHexForToken(sibling, it, pc));
              }
            }
          }

          if (!updateLimitParams.length) continue;

          await execute(
            contract,
            "updateLimitParams",
            [updateLimitParams],
            chain,
            undefined,
            `${chain}-${token}: updateLimitParams ${summary}`
          );
          console.log(
            `[${token}] Setting vault limits for chain ${chain} - COMPLETED`
          );

          // if (
          //   addr.isAppChain &&
          //   connectorAddresses.length &&
          //   connectorPoolIds.length
          // ) {
          //   await execute(
          //     contract,
          //     "updateConnectorPoolId",
          //     [connectorAddresses, connectorPoolIds],
          //     chain
          //   );
          //   console.log(`[${token}] Setting pool Ids for chain ${chain} - COMPLETED`);
          //   console.log(contract.address, [connectorAddresses, connectorPoolIds]);
          // }
        }
      })
    );

    // Print all collected dry run calls
    if (getDryRun() && Object.keys(dryRunCalls).length) {
      console.log("\n=== DRY RUN CALLS ===");
      for (const [chainId, calls] of Object.entries(dryRunCalls)) {
        console.log(chainId);
        for (const call of calls) {
          console.log(call);
        }
      }
    }
  } catch (error) {
    console.log("Error while sending transaction", error);
  }
};

const connectForToken = async (
  addr: TokenAddresses,
  addresses: ProjectAddresses,
  chain: ChainSlug,
  siblingSlugs: ChainSlug[],
  socketSigner: Wallet,
  token: Tokens,
  pc: ProjectTokenConstants
) => {
  try {
    console.log(
      `[${token}] connecting plugs for chain ${chain}, siblings`,
      siblingSlugs
    );

    for (const sibling of siblingSlugs) {
      const localConnectorAddresses: ConnectorAddresses | undefined =
        addr.connectors?.[sibling];
      const siblingConnectorAddresses: ConnectorAddresses | undefined =
        addresses?.[sibling]?.[token]?.connectors?.[chain];
      if (!localConnectorAddresses || !siblingConnectorAddresses) continue;

      const integrationTypes: IntegrationTypes[] = Object.keys(
        localConnectorAddresses
      ) as unknown as IntegrationTypes[];

      const socketContract: Contract = getSocket(chain, socketSigner);

      for (const integration of integrationTypes) {
        const siblingConnectorPlug = siblingConnectorAddresses[integration];
        const localConnectorPlug = localConnectorAddresses[integration];
        if (!localConnectorPlug || !siblingConnectorPlug) continue;

        console.log(`[${token}] connecting plugs for`, {
          chain,
          sibling,
          integration,
          localConnectorPlug,
          siblingConnectorPlug,
        });

        console.log(getAddresses(chain, getMode()).integrations[sibling]);

        const switchboard = getAddresses(chain, getMode()).integrations[
          sibling
        ][integration]?.switchboard;

        if (!switchboard) {
          console.log(
            `switchboard not found for ${chain}, ${sibling}, ${integration}`
          );
        }

        let config = await socketContract.getPlugConfig(
          localConnectorPlug,
          sibling
        );

        if (config[0].toLowerCase() === siblingConnectorPlug.toLowerCase()) {
          console.log("already set, confirming ", { config });
          continue;
        }

        const connectorContract = (
          await getInstance(
            SuperBridgeContracts.ConnectorPlug,
            localConnectorPlug
          )
        ).connect(socketSigner);

        await execute(
          connectorContract,
          "connect",
          [siblingConnectorPlug, switchboard],
          chain
        );
      }
    }
  } catch (error) {
    console.log(`[${token}] error while connecting plugs:`, error);
  }
};

main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
