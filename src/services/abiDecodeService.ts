import { ethers } from "ethers";
import { PoolLocksInfo } from "../types";
import { decodeTimeStamp } from "../util";

interface AbiParameter {
  Call: {
    Signature: {
      Abi: string;
      Name: string;
    };
    Input: string;
    Output: string;
  };
}

export const decodeAbiParameters = (input: AbiParameter) => {
  const abi = JSON.parse(input.Call.Signature.Abi);

  const iface = new ethers.utils.Interface([abi]);
  const decoded = iface.decodeFunctionData(
    input.Call.Signature.Name,
    input.Call.Input
  );

  return {
    signature: input.Call.Signature.Name,
    decoded,
    output: input.Call.Output,
  };
};

export const decodeLockInfo = (input: AbiParameter[]): PoolLocksInfo[] => {
  const data = input.map((info) => {
    const { signature, decoded, output } = decodeAbiParameters(info);
    return {
      signature,
      decoded,
      output,
    };
  });
  const lockTransactions = data
    .filter((info) => info.signature === "lockToken")
    .map((info) => ({
      amountLocked: info.decoded[2].toString(),
      unlockDate: info.decoded[3].toNumber(),
      id: +info.output,
    }));

  const extendLockTransactions = data
    .filter((info) => info.signature === "extendLockDuration")
    .map((info) => ({
      id: info.decoded[0].toNumber(),
      unlockDate: info.decoded[1].toNumber(),
    }));

  return lockTransactions.map((info: any) => {
    if (extendLockTransactions.length > 0) {
      const extendInfo = extendLockTransactions.find(
        (extend) => extend.id === info.id
      );
      return {
        ...info,
        unlockDate: decodeTimeStamp(
          extendInfo ? extendInfo.unlockDate : info.unlockDate
        ),
      };
    }
  });
};
