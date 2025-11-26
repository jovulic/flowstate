[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![NPM](https://img.shields.io/npm/v/@jovulic/flowstate)](https://www.npmjs.com/package/@jovulic/flowstate)
[![Build Status](https://img.shields.io/github/actions/workflow/status/jovulic/flowstate/check.yml?branch=main)](https://github.com/jovulic/flowstate/actions)

# Flowstate

_A library for defining, executing, and persisting stateful computation._

## 📌 Description

`Flowstate` is a lightweight library for constructing and executing stateful and serializable computations graphs. `Flowstate` handles operation dependencies, and the stateful execution of the workflow nodes. `Flowstate` also allows for workflow serialization and provides the ability to easily synchronize workflows such that the workflow is minimally impacted. `Flowstate` also provdies type information for the input into each operation in the graph.

An example use for the library is in a client-sever context. The library would be used to describe a workflow that includes potentially expensive operations, where you only want to compute the result of those operations once. The workflow could be saved and restored to resume computation or retrieve the result of completed computation, in addition to having updates propogated to the workflow while keeping that same computation state where possible.

## ✨ Features

✅ **Stateful Execution** – Supports incremental evaluation of workflows.  
✅ **Serialization** – Workflows can be marshaled and unmarshaled for storage or transfer.  
✅ **Graph Dependency Management** – Uses a graph structure to manage execution order.  
✅ **Workflow Synchronization** – Supports smart updates without full recomputation.  
✅ **Typed Input** – Provides the computed types for the input into each operation.

## 📦 Installation

Using npm:

```sh
npm install @jovulic/flowstate
```

Using yarn:

```sh
yarn add @jovulic/flowstate
```

Using pnpm:

```sh
pnpm add @jovulic/flowstate
```

## 🚀 Usage

### Creating a Workflow

```ts
import { Workflow } from "@jovulic/flowstate";

const workflow = new Workflow();
```

### Adding Operations

Define operations within the workflow:

```ts
const firstOperation = workflow.first("start", async (context, input) => {
  return input.value * 2;
});

const secondOperation = workflow.link(
  [firstOperation],
  "double",
  async (context, input) => {
    return input.start * 2;
  },
);

const finalOperation = workflow.last(
  [secondOperation],
  "finish",
  async (context, input) => {
    return input.double;
  },
);
```

### Running a Workflow

```ts
const result = await workflow.run({}, { value: 5 });
console.log(result); // { output: 20 }
```

### Marshalling and Unmarshalling a Workflow

Workflows can be serialized to a JSON-like object for storage or transfer. When unmarshalling, you must provide a `FunctionRegistry` that maps operation IDs to their corresponding functions. This is because the functions themselves are not serialized with the workflow.

```ts
import { Workflow, OperationFunctionType } from "@jovulic/flowstate";

// It is useful to define your functions separately, so they can be
// registered when unmarshalling.
const functions: Record<string, OperationFunctionType<any, any, any>> = {
  start: async (context, input) => {
    return input.value * 2;
  },
  double: async (context, input) => {
    return input.start * 2;
  },
  finish: async (context, input) => {
    return input.double;
  },
};

const workflow = new Workflow();

const firstOperation = workflow.first("start", functions.start);
const secondOperation = workflow.link([firstOperation], "double", functions.double);
const finalOperation = workflow.last([secondOperation], "finish", functions.finish);

const serialized = workflow.marshal();

// To unmarshal the workflow, you must provide the functions.
const restoredWorkflow = Workflow.unmarshal(serialized, functions);
```

### Synchronizing a Workflow

```ts
const newWorkflow = new Workflow();
workflow.sync(newWorkflow); // workflow is now empty
```

## 🛠️ Build

This project uses [Nix](https://nixos.org) for development to ensuring a consistent and reproducible environment. It is easy enough to build without it, but the following guide will be using Nix.

Follow these steps to build and work on the project locally:

1. **Install Nix:** If you don't have Nix installed, follow the instructions for your platform at [https://nixos.org/download.html](https://nixos.org/download.html).

2. **Clone the Repository:** Clone the `flowstate` repository to your local machine.

   ```bash
   git clone https://github.com/jovulic/flowstate.git
   cd flowstate
   ```

3. **Enter the Development Shell:** Use the following command to enter the Nix development shell. This will automatically install all the necessary dependencies defined in the `flake.nix` file.

   ```bash
   nix develop
   ```

   This command might take a while the first time as it downloads and installs the dependencies. Subsequent entries into the shell will be much faster.

4. **Install NPM Dependencies:** Once inside the Nix shell, you'll need to install the project's npm dependencies. Even though Nix provides Node.js and npm, the project dependencies are managed by npm. We do this via the `ctl` command that is added into the development shell.

   ```bash
   ctl setup
   ```

5. **Build the Library:** You can now build the library.

   ```bash
   ctl build
   ```

   This will create a `dist` directory containing the compiled library files.
