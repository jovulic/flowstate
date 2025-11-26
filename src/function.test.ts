import { describe, expect, it } from "vitest";
import { OperationFunction, FunctionRegistry } from "./function.js";

describe("OperationFunction", () => {
  const func1 = async (ctx: any, input: number) => input * 2;
  const func2 = async (ctx: any, input: string) => `Hello, ${input}!`;
  const registry: FunctionRegistry = {
    func1,
    func2,
  };

  it("should invoke the function correctly", async () => {
    const operationFunction = new OperationFunction("func1", func1);

    const result = await operationFunction.invoke(null, 5);
    expect(result).toBe(10);
  });

  it("should marshal and unmarshal correctly", async () => {
    const operationFunction = new OperationFunction("func2", func2);

    const operationFunctionData = operationFunction.marshal();
    const unmarshaledFunction = OperationFunction.unmarshal(
      operationFunctionData,
      registry,
    );

    const result = await unmarshaledFunction.invoke(null, "World");
    expect(result).toBe("Hello, World!");
  });

  it("should produce the same marshaled data for the same function", () => {
    const func = async (ctx: any, input: number) => input * 2;
    const operationFunction1 = new OperationFunction("func1", func);
    const operationFunction2 = new OperationFunction("func1", func);

    expect(operationFunction1.marshal()).toEqual(operationFunction2.marshal());
  });

  it("should produce different marshaled data for different functions", () => {
    const operationFunction1 = new OperationFunction(
      "func1",
      async (ctx: any, input: number) => input * 2,
    );
    const operationFunction2 = new OperationFunction(
      "func1",
      async (ctx: any, input: number) => input * 3,
    );

    expect(operationFunction1.marshal()).not.toEqual(
      operationFunction2.marshal(),
    );
  });
});
