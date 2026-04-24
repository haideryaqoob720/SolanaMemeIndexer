import { Idl } from "@coral-xyz/anchor";
import { RaydiumAmmCoder } from ".";
import idl from "../../raydium_idl.json";
const idlFile: any = idl;
const bs58 = require("bs58");

export function decode(data: string) {
  const coder = new RaydiumAmmCoder(idlFile as Idl);
  //   const bs64 = Buffer.from(data, "base64");
  //   const base58String = bs58.default.encode(bs64);
  //   const result = coder.instruction.decode(
  // Buffer.from(bs58.default.decode(base58String))
  //   );
  const result = coder.instruction.decode(Buffer.from(data, "hex"));
  console.log(result);
  return result;
}
