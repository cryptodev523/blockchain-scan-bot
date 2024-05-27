interface TokenGeneralInformation {
  tokenName: string;
  tokenSymbol: string;
  tokenDescription: string;
  totalSupply: number;
  circulationSupply: number;
  marketCap: number;
  buyTax: {
    min: number;
    max: number;
  };
  sellTax: {
    min: number;
    max: number;
  };
}

interface TokenContract {
  deployedAt: string;
  deployedHash: string;
  isRenounced: boolean;
  renouncementHash: string;
}

interface Holder {
  address: string;
  balance: number;
}

interface PoolInfo {
  address: string;
  mainToken: {
    name: string;
    symbol: string;
    address: string;
    amount: number;
  };
  sideToken: {
    name: string;
    symbol: string;
    address: string;
    amount: number;
  };
  liquidity: number;
}

export interface PoolLocksInfo {
  amountLocked: number;
  unlockDate: string;
  txHash: string;
}

interface TeamInfo {
  deployer: {
    address: string;
    amount: number;
    soldAmount: number;
  };
  taxWallet: {
    address: string;
    amount: number;
    soldAmount: number;
  };
  team: {
    address: string;
    received: number;
    balance: number;
    soldAmount: number;
    transferredAmount?: number;
    secondLayer: {
      from: string;
      sentAmount: number;
      subwallets: {
        address: string;
        from: string;
        to: string;
        sentAmount: number;
        soldAmount: number;
      }[];
      lastWallet: {
        wallets: string[];
        soldAmount: number;
        sentAmount: number;
      };
    };
  }[];
}

export interface TokenInfo {
  generalInfo: TokenGeneralInformation;
  contractInfo: TokenContract;
  holderInfo: {
    totalHolders: number;
    topHolders: Holder[];
  };
  poolInfo: PoolInfo[];
  poolLockInfo: {
    lockData: PoolLocksInfo[];
    totalLockedAmount: number;
  };
  teamInfo: TeamInfo;
}

export interface TeamHolder {
  address: string;
  balance: number;
  soldAmount: number;
  secondLayer: SecondLayerTrade;
}

export interface SecondLayerTrade {
  from: string;
  subwallets: any[];
  lastWallet: any;
  sentAmount: number;
}
