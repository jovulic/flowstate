import { describe, expect, it } from "vitest";
import { OperationFunction } from "./function.js";

describe("OperationFunction", () => {
  it("hould invoke the function correctly", async () => {
    const operationFunction = new OperationFunction(
      async (ctx: any, input: number) => input * 2,
    );

    const result = await operationFunction.invoke(null, 5);
    expect(result).toBe(10);
  });

  it("should marshal and unmarshal correctly", async () => {
    const operationFunction = new OperationFunction(
      async (ctx, input: string) => `Hello, ${input}!`,
    );

    const operationFunctionData = operationFunction.marshal();
    const unmarshaledFunction = OperationFunction.unmarshal(
      operationFunctionData,
    );

    const result = await unmarshaledFunction.invoke(null, "World");
    expect(result).toBe("Hello, World!");
  });

  it("should produce the same marshaled data for the same function", () => {
    const func = async (ctx: any, input: number) => input * 2;

    const operationFunction1 = new OperationFunction(func);
    const operationFunction2 = new OperationFunction(func);

    expect(operationFunction1.marshal()).toEqual(operationFunction2.marshal());
  });

  it("should produce different marshaled data for different functions", () => {
    const operationFunction1 = new OperationFunction(
      async (ctx: any, input: number) => input * 2,
    );

    const operationFunction2 = new OperationFunction(
      async (ctx: any, input: number) => input * 3,
    );

    expect(operationFunction1.marshal()).not.toEqual(
      operationFunction2.marshal(),
    );
  });
});
