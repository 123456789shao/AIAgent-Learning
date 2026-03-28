import { runBasicChain } from "../chains/runBasicChain.js";

export async function runBasicService(input: string) {
  return runBasicChain(input);
}
