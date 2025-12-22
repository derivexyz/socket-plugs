import { getProjectAddresses, getVerificationPath, verify } from "../helpers";
import { SBTokenAddresses } from "../../src";
import fs from "fs";
import { ChainSlug } from "@socket.tech/dl-core";
import hre from "hardhat";
import { ChainSlugToKey as ChainSlugToHardhatKey } from "@socket.tech/dl-core/dist/src/enums/chainSlugToKey";
import { getTokens } from "../constants";
import { VerifyParams } from "../deploy/verifyContracts";

function flattenObjAndGetAddresses(addrs: object): Set<string> {
  const addrSet = new Set<string>();
  for (const entry of Object.entries(addrs)) {
    if (typeof entry[1] === "object") {
      const additionalSet = flattenObjAndGetAddresses(entry[1]);
      additionalSet.forEach((addr) => addrSet.add(addr));
    } else if (typeof entry[1] === "string" && entry[1].startsWith("0x")) {
      addrSet.add(entry[1] as string);
    }
  }
  return addrSet;
}

async function main() {
  try {
    const path = getVerificationPath();
    const addresses = getProjectAddresses() as SBTokenAddresses;
    if (!fs.existsSync(path)) {
      throw new Error("addresses.json not found");
    }
    let verificationParams: VerifyParams = JSON.parse(
      fs.readFileSync(path, "utf-8")
    );

    const chains: ChainSlug[] = Object.keys(verificationParams).map((c) =>
      Number(c)
    );

    console.log("Chains array:", chains);
    if (!chains) {
      console.log("No chains found, exiting.");
      return;
    }

    for (let chainIndex = 0; chainIndex < chains.length; chainIndex++) {
      const chain = chains[chainIndex];
      console.log(`Verifying contracts for chain ${chain}...`);

      console.log(`Addresses for chain ${chain}...`);
      for (const k of Object.keys(addresses[chain])) {
        const addrSet = flattenObjAndGetAddresses(addresses[chain][k]);
        for (const addr of addrSet) {
          console.log(`${chain}:${addr}`);
        }
      }
    }
  } catch (error) {
    console.log("Error in contract verification", error);
  }
}

main();
