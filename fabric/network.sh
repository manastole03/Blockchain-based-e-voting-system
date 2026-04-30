#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FABRIC_SAMPLES_DIR="${FABRIC_SAMPLES_DIR:-$ROOT_DIR/.fabric-samples}"
TEST_NETWORK_DIR="$FABRIC_SAMPLES_DIR/test-network"
CHANNEL_NAME="${FABRIC_CHANNEL_NAME:-mychannel}"
CHAINCODE_NAME="${FABRIC_CHAINCODE_NAME:-evoting}"
CHAINCODE_PATH="$ROOT_DIR/fabric/chaincode/evoting"

usage() {
  cat <<USAGE
Usage: fabric/network.sh <command>

Commands:
  bootstrap  Clone fabric-samples if it is not present.
  up         Start the Fabric test network and create the channel.
  deploy     Deploy this project's e-voting chaincode.
  env        Print environment variables for the app's Fabric Gateway client.
  down       Stop the Fabric test network.

Environment:
  FABRIC_SAMPLES_DIR   Defaults to $ROOT_DIR/.fabric-samples
  FABRIC_CHANNEL_NAME  Defaults to mychannel
  FABRIC_CHAINCODE_NAME Defaults to evoting
USAGE
}

bootstrap() {
  if [ -d "$TEST_NETWORK_DIR" ]; then
    return
  fi

  mkdir -p "$FABRIC_SAMPLES_DIR"
  if [ ! -d "$FABRIC_SAMPLES_DIR/.git" ]; then
    rm -rf "$FABRIC_SAMPLES_DIR"
    git clone --depth 1 https://github.com/hyperledger/fabric-samples.git "$FABRIC_SAMPLES_DIR"
  fi
}

require_test_network() {
  bootstrap
  if [ ! -x "$TEST_NETWORK_DIR/network.sh" ]; then
    echo "Could not find Fabric test-network at $TEST_NETWORK_DIR" >&2
    echo "Run Hyperledger Fabric's install-fabric script, then retry." >&2
    exit 1
  fi
}

case "${1:-}" in
  bootstrap)
    bootstrap
    ;;
  up)
    require_test_network
    (cd "$TEST_NETWORK_DIR" && ./network.sh up createChannel -ca -c "$CHANNEL_NAME")
    ;;
  deploy)
    require_test_network
    (cd "$TEST_NETWORK_DIR" && ./network.sh deployCC -c "$CHANNEL_NAME" -ccn "$CHAINCODE_NAME" -ccp "$CHAINCODE_PATH" -ccl javascript)
    ;;
  env)
    require_test_network
    cat <<ENV
FABRIC_ENABLED=true
FABRIC_CHANNEL_NAME=$CHANNEL_NAME
FABRIC_CHAINCODE_NAME=$CHAINCODE_NAME
FABRIC_CONTRACT_NAME=EVotingContract
FABRIC_MSP_ID=Org1MSP
FABRIC_PEER_ENDPOINT=localhost:7051
FABRIC_PEER_HOST_ALIAS=peer0.org1.example.com
FABRIC_TLS_CERT_PATH=$TEST_NETWORK_DIR/organizations/peerOrganizations/org1.example.com/peers/peer0.org1.example.com/tls/ca.crt
FABRIC_CERT_PATH=$TEST_NETWORK_DIR/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/signcerts/cert.pem
FABRIC_KEY_DIRECTORY=$TEST_NETWORK_DIR/organizations/peerOrganizations/org1.example.com/users/User1@org1.example.com/msp/keystore
ENV
    ;;
  down)
    require_test_network
    (cd "$TEST_NETWORK_DIR" && ./network.sh down)
    ;;
  *)
    usage
    exit 1
    ;;
esac
