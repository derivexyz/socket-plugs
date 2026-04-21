import {
  ChainSlug,
  DeploymentMode,
  IntegrationTypes,
} from "@socket.tech/dl-core";
import { Tokens } from "../../../src";
import { ProjectConstants } from "../types";

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
            withdrawLimit: "100000",
            withdrawRate: "4.62",
            poolCount: 1,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            withdrawLimit: "525000",
            withdrawRate: "24.33",
            poolCount: 1,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            withdrawLimit: "350000",
            withdrawRate: "16.2",
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
            withdrawLimit: "36000",
            withdrawRate: "1.666",
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
            withdrawLimit: "10000",
            withdrawRate: "0.5",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "1",
            withdrawRate: "0.0001",
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
            withdrawLimit: "10000",
            withdrawRate: "0.4629",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            withdrawLimit: "10000",
            withdrawRate: "0.4629",
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "10000000",
            depositRate: "115.74",
            withdrawLimit: "37000",
            withdrawRate: "1.712",
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
            withdrawLimit: "35",
            withdrawRate: "0.00162",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            withdrawLimit: "15",
            withdrawRate: "0.00069",
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            withdrawLimit: "7",
            withdrawRate: "0.00033",
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "5000",
            depositRate: "0.05787037",
            withdrawLimit: "5.5",
            withdrawRate: "0.0002546",
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
    [Tokens.WBTC]: {
      appChain: ChainSlug.LYRA,
      nonAppChains: {
        [ChainSlug.OPTIMISM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            withdrawLimit: "3",
            withdrawRate: "0.000139",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            withdrawLimit: "3",
            withdrawRate: "0.000139",
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            withdrawLimit: "0.1",
            withdrawRate: "0.0000046",
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
            withdrawLimit: "1",
            withdrawRate: "0.00115741",
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "0",
            depositRate: "0",
            withdrawLimit: "1",
            withdrawRate: "0.00115741",
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
            withdrawLimit: "50",
            withdrawRate: "0.00231",
            poolCount: 0,
          },
        },
        [ChainSlug.ARBITRUM]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            withdrawLimit: "25",
            withdrawRate: "0.001157",
            poolCount: 0,
          },
        },
        [ChainSlug.BASE]: {
          [IntegrationTypes.fast]: {
            depositLimit: "250",
            depositRate: "0.00289351",
            withdrawLimit: "3.5",
            withdrawRate: "0.000162",
            poolCount: 0,
          },
        },
        [ChainSlug.MAINNET]: {
          [IntegrationTypes.fast]: {
            depositLimit: "500",
            depositRate: "0.005787037",
            withdrawLimit: "0.7",
            withdrawRate: "0.0000324",
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
