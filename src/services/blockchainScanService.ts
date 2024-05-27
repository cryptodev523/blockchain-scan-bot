import axios from "axios";
import dotenv from "dotenv";
import { TeamHolder, TokenInfo } from "../types";
import { decodeLockInfo } from "./abiDecodeService";

dotenv.config();

const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
const ETHERSCAN_BASE_URL = "https://api.etherscan.io/api";
const DEX_TOOLS_API_KEY = process.env.DEXTOOLS_API_KEY;
const DEX_TOOLS_BASE_URL = "https://public-api.dextools.io/advanced/v2";
const BITQUERY_API_KEY = process.env.BITQUERY_API_KEY;

const getHolders = async (
  contractAddress: string,
  network: string,
  till: string,
  limit: number
) => {
  try {
    const query = `
      query ($network: evm_network, $till: String!, $token: String!, $limit: Int) {
        EVM(network: $network, dataset: archive) {
          TokenHolders(
            tokenSmartContract: $token
            date: $till
            orderBy: {descending: Balance_Amount}
            limit: {count: $limit}
          ) {
            Holder {
              Address
            }
            Balance {
              Amount
            }
          }
        }
      }
    `;

    const variables = {
      network,
      till,
      token: contractAddress,
      limit,
    };

    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });

    return response.data;
  } catch (error) {
    throw new Error(`Error fetching token holders: ${error}`);
  }
};

interface TokenHolder {
  Holder: {
    Address: string;
  };
  Balance: {
    Amount: string;
  };
}

const getTeamHolders = async (
  contractAddress: string,
  network: string,
  till: string,
  teamAddress: string[]
) => {
  try {
    const query = `
      query ($network: evm_network, $till: String!, $token: String!, $teamAddress: [String!]!) {
        EVM(network: $network, dataset: archive) {
          TokenHolders(
            tokenSmartContract: $token
            date: $till
            orderBy: {descending: Balance_Amount}
            where: {
              Holder: {
                Address: {
                  in: $teamAddress
                }
              }
            }
          ) {
            Holder {
              Address
            }
            Balance {
              Amount
            }
          }
        }
      }
    `;

    const variables = {
      network,
      till,
      token: contractAddress,
      teamAddress,
    };

    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });

    return response.data;
  } catch (error) {
    console.log(error);
    throw new Error(`Error fetching token holders: ${error}`);
  }
};

const getTokenHolderNumber = async (contractAddress: string) => {
  try {
    const todayDate = new Date().toISOString().split("T")[0];

    const query = `
      query ($token: String!, $todayDate: String!) {
        EVM(dataset: archive, network: eth) {
          TokenHolders(
            date: $todayDate
            tokenSmartContract: $token
            where: { Balance: { Amount: { gt: "0" } } }
          ) {
            uniq(of: Holder_Address)
          }
        }
      }
    `;
    const variables = {
      token: contractAddress,
      todayDate,
    };

    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching token holder number:", error);
    return null;
  }
};

interface EVMTrade {
  Trade: {
    Amount: string;
  };
  Transaction: {
    From: string;
    Hash: string;
  };
}

const getTradeInfoFromAccounts = async (
  contractAddress: string,
  fromAddress: string[]
) => {
  try {
    const query = `
      query ($token: String!, $fromAddress: [String!]) {
        EVM(dataset: archive, network: eth) {
          DEXTradeByTokens(
            where: {
              Trade: {
                Currency: {
                  SmartContract: {
                    is: $token
                  }
                },
                Side: {
                  Type: {
                    is: buy
                  }
                }
              },
              Transaction: {
                From: {
                  in: $fromAddress
                }
              },
              TransactionStatus: {
                Success: true
              }
            },
          ) {
            Trade {
              Amount(maximum: Trade_Amount)
            }
            Transaction {
              From
              Hash
            }
          }
        }
      }
    `;

    const variables = {
      token: contractAddress,
      fromAddress,
    };

    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching team trade info:", error);
    return null;
  }
};

const getDexToolsTokenData = async (endpoint: string) => {
  try {
    const response = await axios.get(
      `${DEX_TOOLS_BASE_URL}/token/ether/${endpoint}`,
      {
        headers: {
          "x-api-key": DEX_TOOLS_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from DexTools: ${error}`);
    throw error;
  }
};

const getDexToolsPoolData = async (endpoint: string) => {
  try {
    const response = await axios.get(
      `${DEX_TOOLS_BASE_URL}/pool/ether/${endpoint}`,
      {
        headers: {
          "x-api-key": DEX_TOOLS_API_KEY,
        },
      }
    );
    return response.data;
  } catch (error) {
    console.error(`Error fetching data from DexTools: ${error}`);
    throw error;
  }
};

const isValidBlockchainAddress = (contractAddress: string): boolean => {
  return contractAddress.length === 42 && contractAddress.startsWith("0x");
};

const getLockTransaction = async (teamAddresses: string[]) => {
  try {
    const query = `
      query ($teamAddresses: [String!]) {
        EVM(network: eth, dataset: archive) {
          Calls(
            where: {
              Call: {
                Signature: {
                  Name: {
                    in: ["extendLockDuration", "lockToken"]
                  }
                },
                To: {
                  is: "0xE2fE530C047f2d85298b07D9333C05737f1435fB"
                },
                From: {
                  in: $teamAddresses
                }
              }
            }
          )
          {
            Transaction {
              Hash
            }
            Call {
              From
              To
              Input
              Output
              Signature {
                Abi
                Name
                Signature
              }
            }
          }
        }
      }
    `;
    const variables = {
      teamAddresses,
    };
    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching lock transaction:", error);
    return null;
  }
};

const getRenouncementTransaction = async (deployerAddress: string) => {
  try {
    const query = `
      query ($deployerAddress: String!) {
        EVM(network: eth, dataset: archive) {
          Events(
            where: {
              Call: {
                Signature: {
                  Signature: {
                    includes: "renounce"
                  }
                }
                From: {
                  is: $deployerAddress
                }
              }
            }
          ) {
            Transaction {
              Hash
            }
            Call {
              Signature {
                Signature
              }
            }
          }
        }
      }
    `;

    const variables = {
      deployerAddress,
    };
    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });
    return response.data;
  } catch (error) {
    console.error("Error fetching renouncement transaction:", error);
    return null;
  }
};

interface TokenTransaction {
  from: string;
  to: string;
  value: number;
  tokenDecimal: number;
  contractAddress: string;
}

const getDeployerTeamAddress = async (contractAddress: string) => {
  try {
    const response = await axios.get(
      `${ETHERSCAN_BASE_URL}?module=account&action=txlist&address=${contractAddress}&page=1&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );
    const creationTx = response.data.result.find(
      ({ to }: { to: string }) => to === ""
    );
    const deployerAddress = creationTx.from;

    // Now get the token transfer transactions
    const tokenTransferResponse = await axios.get(
      `${ETHERSCAN_BASE_URL}?module=account&action=tokentx&contractaddress=${contractAddress}&address=${deployerAddress}&page=1&sort=asc&apikey=${ETHERSCAN_API_KEY}`
    );

    const taxWallets: Record<string, number> = {};
    tokenTransferResponse.data.result.forEach((tx: TokenTransaction) => {
      if (tx.from.toLowerCase() !== tx.contractAddress.toLowerCase()) {
        if (!taxWallets[tx.to]) {
          taxWallets[tx.to] = 0;
        }
        taxWallets[tx.to] += +tx.value;
      }
    });

    const tokenTransferTransactions = tokenTransferResponse.data.result.map(
      (tx: TokenTransaction) => ({
        from: tx.from,
        to: tx.to,
        value: tx.value / 10 ** tx.tokenDecimal,
        tokenDecimal: tx.tokenDecimal,
      })
    );

    return {
      deployer: deployerAddress,
      deployedHash: creationTx.hash,
      team: tokenTransferTransactions,
    };
  } catch (error) {
    return {
      deployer: "",
      team: [],
    };
  }
};

interface EVMTransfer {
  Transfer: {
    Sender: string;
    Receiver: string;
    Amount: string;
  };
  Transaction: {
    Hash: string;
  };
}

const getSendTransactions = async (
  walletAddress: string[],
  tokenAddress: string
) => {
  try {
    const query = `
      query ($walletAddress: [String!], $tokenAddress: String!) {
        EVM(dataset: archive, network: eth) {
          Transfers(
            where: {
              Transfer: {
                Sender: {
                  in: $walletAddress
                }
                Currency: {
                  SmartContract: {
                    is: $tokenAddress
                  }
                }
              },
            }
          ) {
            Transfer {
              Amount 
              Sender
              Receiver
            }
            Transaction {
              Hash
            }
          }
        }
      }
    `;

    const variables = {
      walletAddress,
      tokenAddress,
    };

    const response = await axios({
      method: "post",
      url: "https://streaming.bitquery.io/graphql",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${BITQUERY_API_KEY}`,
      },
      data: {
        query,
        variables,
      },
    });

    return response.data;
  } catch (error) {
    console.error("Error fetching send transactions:", error);
    return null;
  }
};

const getTokenGeneralInfo = async (
  contractAddress: string
): Promise<TokenInfo | undefined> => {
  console.time("getTokenGeneralInfo");
  try {
    const todayDate = new Date().toISOString().split("T")[0];
    // Token name, symbol, description
    const [
      { data: tokenSummary },
      { data: tokenInfo },
      { data: auditInfo },
      { data: poolsInfo },
      {
        data: {
          EVM: { TokenHolders: uniqHolders },
        },
      },
    ] = await Promise.all([
      getDexToolsTokenData(`${contractAddress}`),
      getDexToolsTokenData(`${contractAddress}/info`),
      getDexToolsTokenData(`${contractAddress}/audit`),
      getDexToolsTokenData(
        `${contractAddress}/pools?sort=creationTime&order=desc&from=2000-01-01&to=${todayDate}`
      ),
      getTokenHolderNumber(contractAddress),
    ]);

    const firstPoolInfo = poolsInfo.results[0];
    // Token holders,
    const [
      {
        data: {
          EVM: { TokenHolders: holders },
        },
      },
      { data: poolData },
      { deployer, deployedHash, team },
    ] = await Promise.all([
      getHolders(contractAddress, "eth", todayDate, 7),
      getDexToolsPoolData(`${firstPoolInfo.address}/liquidity`),
      getDeployerTeamAddress(contractAddress),
    ]);

    const teamWalletAddresses = team.map(({ to }: { to: string }) => to);

    // locked tx, team holders, trade info from accounts 1st, send transactions from accounts 1st layer
    const [
      {
        data: {
          EVM: { Calls },
        },
      },
      {
        data: {
          EVM: { TokenHolders: teamHolders },
        },
      },
      {
        data: {
          EVM: { DEXTradeByTokens },
        },
      },
      {
        data: {
          EVM: { Transfers },
        },
      },
    ] = await Promise.all([
      getLockTransaction(teamWalletAddresses),
      getTeamHolders(contractAddress, "eth", todayDate, teamWalletAddresses),
      getTradeInfoFromAccounts(contractAddress, teamWalletAddresses),
      getSendTransactions(teamWalletAddresses, contractAddress),
    ]);

    const lockData = decodeLockInfo(Calls);

    const totalLockedAmount = lockData.reduce(
      (acc, cur) => acc + +cur.amountLocked,
      0
    );

    // get renouncement tx
    let renouncementHash = null;
    if (auditInfo.isContractRenounced === "yes") {
      const {
        data: {
          EVM: { Events },
        },
      } = await getRenouncementTransaction(deployer);
      renouncementHash = Events[0].Transaction.Hash;
    }

    const teamTradeInfo = DEXTradeByTokens.reduce((acc: any, trade: any) => {
      const fromAddress = trade.Transaction.From;
      const amount = parseFloat(trade.Trade.Amount);

      if (!acc[fromAddress]) {
        acc[fromAddress] = 0;
      }
      acc[fromAddress] += amount;
      return acc;
    }, {});

    // Filter out trade transactions
    const sendTransactions = Transfers.filter((transfer: EVMTransfer) => {
      return !DEXTradeByTokens.some(
        (trade: EVMTrade) =>
          trade.Transaction.Hash === transfer.Transaction.Hash
      );
    });

    const secondLayerTeamData = sendTransactions.reduce(
      (acc: Record<string, Record<string, number>>, transfer: EVMTransfer) => {
        const fromAddress = transfer.Transfer.Sender;
        const toAddress = transfer.Transfer.Receiver;
        const amount = parseFloat(transfer.Transfer.Amount);

        if (amount === 0) return acc;

        if (!acc[fromAddress]) {
          acc[fromAddress] = {
            [toAddress]: amount,
          };
        } else {
          if (!acc[fromAddress][toAddress]) {
            acc[fromAddress][toAddress] = amount;
          } else {
            acc[fromAddress][toAddress] += amount;
          }
        }

        return acc;
      },
      {}
    );

    const secondLayerTeamDataArray = Object.entries<
      Record<string, Record<string, number>>
    >(secondLayerTeamData).map(([fromAddress, toData]) => {
      const transactions = Object.entries(toData).map(
        ([toAddress, amount]) => ({
          from: fromAddress,
          to: toAddress,
          sentAmount: amount,
        })
      );
      return {
        from: fromAddress,
        transactions,
      };
    });

    // Trade transactions on 2nd layer
    const secondLayerTradeData = await Promise.all(
      secondLayerTeamDataArray.map(async (item: any) => {
        const {
          data: {
            EVM: { DEXTradeByTokens },
          },
        } = await getTradeInfoFromAccounts(
          contractAddress,
          item.transactions.map(({ to }: { to: string }) => to)
        );

        const tradeInfo = DEXTradeByTokens.reduce((acc: any, trade: any) => {
          const fromAddress = trade.Transaction.From;
          const amount = parseFloat(trade.Trade.Amount);

          if (!acc[fromAddress]) {
            acc[fromAddress] = 0;
          }
          acc[fromAddress] += amount;
          return acc;
        }, {});

        const subwallets = item.transactions
          .map((tx: any) => ({
            ...tx,
            soldAmount: (tradeInfo[tx.to] || 0) / (1 - auditInfo.sellTax.min),
          }))
          .sort((a: any, b: any) => b.sentAmount - a.sentAmount);

        const lastWallet = subwallets.slice(5).reduce(
          (acc: any, cur: any) => {
            acc.sentAmount += cur.sentAmount;
            acc.soldAmount += cur.soldAmount;
            acc.wallets = [...acc.wallets, cur.to];
            return acc;
          },
          {
            wallets: [],
            soldAmount: 0,
            sentAmount: 0,
          }
        );

        const sentAmount = item.transactions.reduce((acc: number, cur: any) => {
          acc += cur.sentAmount;
          return acc;
        }, 0);

        return {
          from: item.from,
          subwallets: subwallets.slice(0, 5),
          lastWallet: lastWallet.wallets.length > 0 ? lastWallet : null,
          sentAmount,
        };
      })
    );

    const teamHolderData: TeamHolder[] = teamHolders.map(
      (holder: TokenHolder) => ({
        address: holder.Holder.Address,
        balance: +holder.Balance.Amount,
        soldAmount:
          (+teamTradeInfo[holder.Holder.Address] || 0) /
          (1 - auditInfo.sellTax.min),
        secondLayer: secondLayerTradeData.find(
          (trade) => trade.from === holder.Holder.Address
        ),
      })
    );

    console.timeEnd("getTokenGeneralInfo");

    return {
      generalInfo: {
        totalSupply: tokenInfo.totalSupply,
        circulationSupply: tokenInfo.circulatingSupply,
        marketCap: tokenInfo.mcap,
        tokenName: tokenSummary.name,
        tokenSymbol: tokenSummary.symbol,
        tokenDescription: tokenSummary.description,
        buyTax: auditInfo.buyTax,
        sellTax: auditInfo.sellTax,
      },
      contractInfo: {
        deployedAt: tokenSummary.creationTime,
        deployedHash,
        isRenounced: auditInfo.isContractRenounced === "yes",
        renouncementHash,
      },
      holderInfo: {
        totalHolders: +uniqHolders[0].uniq,
        topHolders: holders.map((holder: TokenHolder) => ({
          address: holder.Holder.Address,
          balance: +holder.Balance.Amount,
        })),
      },
      poolInfo: [
        {
          address: firstPoolInfo.address,
          mainToken: {
            name: firstPoolInfo.mainToken.name,
            symbol: firstPoolInfo.mainToken.symbol,
            address: firstPoolInfo.mainToken.address,
            amount: poolData.reserves.mainToken,
          },
          sideToken: {
            name: firstPoolInfo.sideToken.name,
            symbol: firstPoolInfo.sideToken.symbol,
            address: firstPoolInfo.sideToken.address,
            amount: poolData.reserves.sideToken,
          },
          liquidity: poolData.liquidity,
        },
      ],
      poolLockInfo: { lockData, totalLockedAmount },
      teamInfo: {
        deployer: {
          address: deployer,
          amount: 0,
          soldAmount:
            teamHolderData.find((item) => item.address === deployer)
              ?.soldAmount || 0,
        },
        taxWallet: {
          address: "",
          amount: 0,
          soldAmount: 0,
        },
        team: teamHolderData
          .filter((item) => item.address !== deployer)
          .map((item) => ({
            ...item,
            received:
              team.find(({ to }: { to: string }) => to === item.address)
                ?.value || 0,
          }))
          .sort((a, b) => a.received - b.received),
      },
    };
  } catch (error) {
    console.error("Error fetching token details:", { error });
  }
};

export default {
  isValidBlockchainAddress,
  getTokenGeneralInfo,
};
