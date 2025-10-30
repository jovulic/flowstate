# Code Assistant Context

## Project Overview

This project, `flowstate`, is a TypeScript library for defining, executing, and persisting stateful computation graphs. It allows developers to construct and execute stateful and serializable computations, handling operation dependencies and stateful execution of workflow nodes. The library also supports workflow serialization, synchronization, and provides type information for the input into each operation in the graph.

The core concepts are `Workflow` and `Operation`. A `Workflow` is a directed acyclic graph of `Operation`s. Each `Operation` is a function that can be cached. The library supports serialization, synchronization, and incremental evaluation.

The main technologies used are:

- **TypeScript**: The primary language for the project.
- **Node.js**: The runtime environment.
- **npm**: The package manager.
- **vitest**: The testing framework.
- **eslint**: The linter.
- **prettier**: The code formatter.
- **nix**: For creating a reproducible development environment.

## Building and Running

The project uses `npm` for package management and running scripts. The following commands are available:

- **`npm install`**: Installs the project dependencies.
- **`npm run build`**: Compiles the TypeScript code and outputs it to the `dist` directory.
- **`npm run test`**: Runs the tests using `vitest`.
- **`npm run test:watch`**: Runs the tests in watch mode.
- **`npm run lint`**: Lints the code using `eslint`.
- **`npm run format`**: Formats the code using `prettier`.

The `justfile` provides aliases for these commands:

- **`just build`**: Builds the project.
- **`just test`**: Runs the tests.
- **`just lint`**: Lints the code.
- **`just format`**: Formats the code.

## Development Conventions

- **Code Style**: The project uses `prettier` for code formatting and `eslint` for linting. The configuration for these tools can be found in `prettier.config.mjs` and `eslint.config.mjs` respectively.
- **Testing**: The project uses `vitest` for testing. Test files are located in the `src` directory and have the `.test.ts` extension.
- **Commits**: The project uses [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/).
- **Releasing**: The project uses `release-please` for managing releases. The configuration is in `release-please-config.json`.
