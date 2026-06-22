import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

function withdrawLimit(limit: number, digits: number = 6) {
  return {
    withdrawLimit: limit.toFixed(digits),
    withdrawRate: (limit / 60 / 60 / 6).toFixed(digits),
  };
}

const pc: ProjectConstants = {
  [DeploymentMode.PROD]: {
    [Tokens.USDC]: {
      isFiatTokenV2_1: true,
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            poolCount: 1,
            ...withdrawLimit(100_000),
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(300_000),
            poolCount: 1,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(200_000),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(200_000),
            poolCount: 1,
          },
        },
      },
    },
    [Tokens.USDCE]: {
      isFiatTokenV2_1: true,
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            ...withdrawLimit(0),
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            ...withdrawLimit(0),
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.USDT]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(100_000),
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(100_000),
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            ...withdrawLimit(100_000),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETH]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            ...withdrawLimit(35),
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            ...withdrawLimit(35),
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            ...withdrawLimit(35),
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            ...withdrawLimit(35),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WETHstrat]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            ...withdrawLimit(17),
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WBTC]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(4, 8),
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(1.5, 8),
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(1.5, 8),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.SNX]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            ...withdrawLimit(1),
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            ...withdrawLimit(1),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
    [Tokens.WSTETH]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(65),
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(45),
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            ...withdrawLimit(45),
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "500",
            depositRate: "0.005787037",
            ...withdrawLimit(45),
            poolCount: 0,
          },
          [IntegrationTypes.native]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "0",
            withdrawRate: "0",
            poolCount: 0,
          },
        },
      },
    },
  },
};

export = pc;
