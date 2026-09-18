import { BigNumber, ethers } from "ethers";
import { readFileSync } from "fs";
import { ERC20__factory } from "../../typechain-types";
import { getProviderFromChainSlug } from "../helpers/networks";

const FILE =
  process.argv[2] ?? "deployments/superbridge/prod_lyra-old_addresses.json";

// ponytail: normalise everything to 18dp BigNumber so chains with different
// decimals can be summed exactly (no float math on token amounts).
const to18 = (amount: BigNumber, decimals: number) =>
  decimals <= 18
    ? amount.mul(BigNumber.from(10).pow(18 - decimals))
    : amount.div(BigNumber.from(10).pow(decimals - 18));

const fmt = (x: BigNumber) => ethers.utils.formatUnits(x, 18);

export const main = async () => {
  const addresses = JSON.parse(readFileSync(FILE, "utf8"));

  // Several symbols can share one super token (USDC + USDC.e, WETH + WETH-strat),
  // so group by MintableToken address rather than by symbol.
  const groups: Record<
    string,
    { symbols: string[]; chain: string; vaults: any[] }
  > = {};
  const mintableOf: Record<string, string> = {};
  for (const chain of Object.keys(addresses))
    for (const [token, d] of Object.entries<any>(addresses[chain]))
      if (d.MintableToken) {
        mintableOf[token] = d.MintableToken;
        groups[d.MintableToken] ??= { symbols: [], chain, vaults: [] };
        groups[d.MintableToken].symbols.push(token);
      }

  for (const chain of Object.keys(addresses))
    for (const [token, d] of Object.entries<any>(addresses[chain]))
      if (d.Vault && d.NonMintableToken)
        groups[mintableOf[token]]?.vaults.push({
          chain,
          token,
          address: d.NonMintableToken,
          vault: d.Vault,
        });

  for (const [mintable, { symbols, chain: appChain, vaults }] of Object.entries(
    groups
  )) {
    console.log(`\n=== ${symbols.join(" / ")} (${mintable}) ===`);
    let total = BigNumber.from(0);
    for (const v of vaults) {
      try {
        const c = ERC20__factory.connect(
          v.address,
          getProviderFromChainSlug(+v.chain)
        );
        const [bal, dec] = await Promise.all([
          c.balanceOf(v.vault),
          c.decimals(),
        ]);
        const n = to18(bal, dec);
        total = total.add(n);
        console.log(`  ${v.token} vault on ${v.chain}: ${fmt(n)}`);
      } catch (e) {
        console.log(
          `  vault on ${v.chain}: ERROR ${(e as Error).message.slice(0, 80)}`
        );
      }
    }
    console.log(`  locked total : ${fmt(total)}`);

    const c = ERC20__factory.connect(
      mintable,
      getProviderFromChainSlug(+appChain)
    );
    const [ts, dec] = await Promise.all([c.totalSupply(), c.decimals()]);
    const minted = to18(ts, dec);
    console.log(`  total supply : ${fmt(minted)} (chain ${appChain})`);
    console.log(`  diff         : ${fmt(total.sub(minted))} (locked - minted)`);
  }
};

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
