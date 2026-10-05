#!/bin/bash
# Patch @mattrglobal/bbs-signatures to fix TypeScript isolatedModules errors
# This converts type-only exports to use 'export type' syntax

BBS_FILE="node_modules/@mattrglobal/bbs-signatures/lib/types/index.ts"

if [ -f "$BBS_FILE" ]; then
  echo "Patching @mattrglobal/bbs-signatures..."
  sed -i.bak \
    -e 's/^export { \(BbsBlindSignContext\) }/export type { \1 }/' \
    -e 's/^export { \(BbsBlindSignContextRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsBlindSignRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsCreateProofRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsKeyPair\) }/export type { \1 }/' \
    -e 's/^export { \(BbsSignRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsVerifyBlindSignContextRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsVerifyProofRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsVerifyRequest\) }/export type { \1 }/' \
    -e 's/^export { BlsKeyPair, \(DEFAULT.*\) }/export type { BlsKeyPair } from ".\/BlsKeyPair";\nexport { \1 }/' \
    -e 's/^export { \(Bls12381ToBbsRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BlsBbsSignRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BlsBbsVerifyRequest\) }/export type { \1 }/' \
    -e 's/^export { \(BbsVerifyResult\) }/export type { \1 }/' \
    "$BBS_FILE"
  rm -f "$BBS_FILE.bak"
  echo "Patch applied successfully"
else
  echo "BBS signatures library not found, skipping patch"
fi

