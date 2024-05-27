import express, { Express, Request, Response } from "express";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import TelegramService from "./services/telegramService";
import BSService from "./services/blockchainScanService";
import {
  formatPercent,
  formatTimeAgo,
  formatTimeUntil,
  formatUTCDate,
  shortenAddress,
} from "./util";

dotenv.config();

const app: Express = express();
const port = process.env.PORT || 3000;

const taxWallets = [
  {
    token: "0x9Cf0ED013e67DB12cA3AF8e7506fE401aA14dAd6",
    taxAddress: "0x01c972546e1a24ab0f9614d9add4f935c227263f",
  },
];

app.use(bodyParser.json());

app.get("/", (req: Request, res: Response) => {
  res.send("Express + TypeScript Server");
});

app.listen(port, () => {
  console.log("[server]: Server is running");
});

app.post("/bs_webhook", async (req: Request, res: Response) => {
  const chatText = req.body.message.text;
  const [command, address] = chatText.split(" ");
  if (command === "/bs") {
    if (address && !BSService.isValidBlockchainAddress(address)) {
      await TelegramService.sendMessage(
        req.body.message.chat.id,
        "Please provide a valid Ethereum address"
      );
    } else {
      const info = await BSService.getTokenGeneralInfo(address);

      if (!info) {
        await TelegramService.sendMessage(
          req.body.message.chat.id,
          "Token not found"
        );
        return;
      }

      const taxAddress = taxWallets.find(
        (item) => item.token === address
      )?.taxAddress;

      const {
        generalInfo,
        contractInfo,
        holderInfo,
        poolInfo,
        poolLockInfo,
        teamInfo,
      } = info;

      const taxWalletInfo = teamInfo.team.find(
        (item) => item.address === taxAddress
      );

      await TelegramService.sendMessage(
        req.body.message.chat.id,
        `a. General: 
        1. Name: ${generalInfo?.tokenName} (${generalInfo?.tokenSymbol})
        2. Total Supply: ${generalInfo?.totalSupply.toLocaleString()}
        3. Circulation Supply: ${generalInfo?.circulationSupply.toLocaleString()}
        4. Market Cap: $${generalInfo?.marketCap.toLocaleString()}
        5. Taxes: ${formatPercent(generalInfo?.buyTax.min)} / ${formatPercent(
          generalInfo?.sellTax.min
        )}
        6. Transfer tax: 0%,
        7. Liquidity: ${poolInfo[0].sideToken.amount.toLocaleString()} ${
          poolInfo[0].sideToken.symbol
        } ($${poolInfo[0].liquidity.toLocaleString()})
        
b. Contract:
        1. <a href="https://etherscan.io/tx/${
          contractInfo.deployedHash
        }">Deployed</a>: ${formatTimeAgo(contractInfo?.deployedAt)}
        2. ${
          contractInfo.isRenounced
            ? `<a href="https://etherscan.io/tx/${contractInfo.renouncementHash}">Renounced</a>`
            : "Renounced"
        }: ${contractInfo?.isRenounced ? "Yes" : "No"}

c. Liquidity:
        1. Burnt: No
        2. Locked: ${
          poolLockInfo.lockData.length > 0 ? "Yes" : "No"
        }${poolLockInfo.lockData
          .map(
            (info, index) =>
              `
          ${index + 1}) <a href="https://etherscan.io/tx/${
                info.txHash
              }">${formatPercent(
                info.amountLocked / poolLockInfo.totalLockedAmount
              )}</a> until ${formatUTCDate(
                info.unlockDate
              )} (unlock in ${formatTimeUntil(info.unlockDate)})`
          )
          .join("")}

d. Holders:
        1. Total: ${holderInfo.totalHolders.toLocaleString()}
        2. Top Holders:
          ${holderInfo.topHolders
            .map(
              (holder, index) =>
                `${index + 1}) <a href="https://app.zerion.io/${
                  holder.address
                }/overview">${
                  holder.address === taxAddress
                    ? "Tax Wallet"
                    : shortenAddress(holder.address)
                }</a>: ${formatPercent(
                  holder.balance / generalInfo.totalSupply
                )}`
            )
            .join("\n          ")}
        `
      );
      const teamText = `e. Team:
        1. <a href="https://app.zerion.io/${
          teamInfo.deployer.address
        }">Deployer</a>: ${formatPercent(
        teamInfo.deployer.amount / generalInfo.totalSupply
      )}
        2. ${
          taxAddress
            ? `<a href="https://app.zerion.io/${taxAddress}">Tax Wallet</a>`
            : "Tax Wallet"
        }: ${
        taxWalletInfo
          ? formatPercent(taxWalletInfo.received / generalInfo.totalSupply)
          : "0%"
      }
        3. Related:${teamInfo.team
          .sort((a, b) => b.received - a.received)
          .filter((member) => member.address !== taxAddress)
          .map(
            (member, index) =>
              `
          ${index + 1}) <a href="https://app.zerion.io/${
                member.address
              }/overview">${shortenAddress(
                member.address
              )}</a>: received - ${formatPercent(
                (member.received ?? 0) / generalInfo.totalSupply,
                member.received ?? 0
              )} | sold - ${formatPercent(
                member.soldAmount / generalInfo.totalSupply,
                member.soldAmount
              )} | transferred - ${formatPercent(
                (member.secondLayer?.sentAmount ?? 0) / generalInfo.totalSupply,
                member.secondLayer?.sentAmount ?? 0
              )}${(member.secondLayer?.subwallets ?? [])
                .map(
                  (subwallet) =>
                    `
              - <a href="https://app.zerion.io/${
                subwallet.to
              }/overview">${shortenAddress(
                      subwallet.to
                    )}</a>: received - ${formatPercent(
                      subwallet.sentAmount / generalInfo.totalSupply,
                      subwallet.sentAmount
                    )} | sold - ${formatPercent(
                      subwallet.soldAmount / generalInfo.totalSupply,
                      subwallet.soldAmount
                    )}`
                )
                .join("")}${
                member.secondLayer?.lastWallet
                  ? `
              - another wallets: received - ${formatPercent(
                member.secondLayer.lastWallet.sentAmount /
                  generalInfo.totalSupply,
                member.secondLayer.lastWallet.sentAmount
              )} | sold - ${formatPercent(
                      member.secondLayer.lastWallet.soldAmount /
                        generalInfo.totalSupply,
                      member.secondLayer.lastWallet.soldAmount
                    )}`
                  : ""
              }`
          )
          .join("")}`;

      await TelegramService.sendMessage(req.body.message.chat.id, teamText);
    }

    res.send("Webhook received");
  } else {
    res.send("Webhook received");
  }
});
