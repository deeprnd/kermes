# Kermes: A Solana Staking Platform 🚀

[![Tests](https://github.com/deeprnd/kermes/actions/workflows/tests.yml/badge.svg)](https://github.com/deeprnd/kermes/actions/workflows/tests.yml)

**Kermes** is a **pet project** exploring the design and implementation of a staking platform on Solana. It allows users to stake tokens, NFTs, and Liquid Staking Tokens (LSTs) into vaults and earn rewards in the form of tokens, points, or NFTs. The platform is designed to be modular, with separate programs for staking and vault share tokens.

**Disclaimer**: This project is **not intended for mainnet use...yet**

## Features ✨

- **Multi-Asset Staking**: Stake SPL tokens, SPL-2022 tokens, NFTs, and LSTs.
- **Vault Share Tokens**: Mint LP-like tokens representing a user's share in the vault.
- **Reward System**: Earn rewards in tokens, points, or NFTs.
- **Modular Design**: Separate programs for staking and vault share tokens.
- **Cross-Program Invocation (CPI)**: Secure interaction between programs.

## Architecture 🏗️

The platform consists of two main programs:

1. **`kermes_staking`**:
   - Handles staking, unstaking, and reward distribution.
   - Uses CPI to interact with the vault share token program.

2. **`kermes_vault_share`**:
   - Manages minting and burning of vault share tokens.
   - Enforces custom transfer hooks for advanced logic.

## Getting Started 🛠️

### Prerequisites

- [Rust](https://www.rust-lang.org/)
- [Solana CLI](https://docs.solana.com/cli/install-solana-cli-tools)
- [Anchor](https://www.anchor-lang.com/)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/deeprnd/kermes.git
   cd kermes

2. Intall the environment:
    ```bash
    yarn install

2. Build the programs:
    ```bash
    yarn build

3. Run tests:
    ```bash
    yarn install

## Contributing 🤝
Contributions are welcome! Please open an issue or submit a pull request.

## Acknowledgments 🙏
Inspired by protocols like EigenLayer, Symbiotic, and Mellow Finance.

Built with ❤️ using Anchor and Solana.