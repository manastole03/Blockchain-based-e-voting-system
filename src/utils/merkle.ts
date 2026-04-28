import { sha256 } from "./hash";

export function calculateMerkleRoot(transactionHashes: string[]): string {
  if (transactionHashes.length === 0) {
    return sha256("");
  }

  let layer = [...transactionHashes].sort();

  while (layer.length > 1) {
    const nextLayer: string[] = [];

    for (let index = 0; index < layer.length; index += 2) {
      const left = layer[index];
      const right = layer[index + 1] ?? left;
      nextLayer.push(sha256(`${left}${right}`));
    }

    layer = nextLayer;
  }

  return layer[0];
}

