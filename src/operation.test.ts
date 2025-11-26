import { describe, it, expect, beforeEach } from "vitest";
import { Operation } from "./operation.js";
import { FunctionRegistry } from "./function.js";

describe("Operation", () => {
  let callCount: number;
  const func1 = async (ctx: any, input: number) => {
    callCount++;
    return input * 2;
  };
  const registry: FunctionRegistry = {
    "test-operation": func1,
  };

  beforeEach(() => {
    callCount = 0;
  });

  it("should execute the function correctly", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    const result = await operation.eval({}, 5);
    expect(result).toBe(10);
    expect(callCount).toBe(1);
  });

  it("should cache the result and return cached value for same input", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    await operation.eval({}, 5);
    const result = await operation.eval({}, 5);

    expect(result).toBe(10);
    expect(callCount).toBe(1);
  });

  it("should return false for test if no cache exists", () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    expect(operation.test({}, 5)).toBe(false);
  });

  it("should return true for test if input matches cached hash", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    await operation.eval({}, 5);
    expect(operation.test({}, 5)).toBe(true);
  });

  it("should clear the cache", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    await operation.eval({}, 5);
    operation.clear();

    expect(operation.test({}, 5)).toBe(false);
  });

  it("should throw an error when accessing value before computation", () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    expect(() => operation.value).toThrow(
      "operation value has not been computed",
    );
  });

  it("should correctly marshal and unmarshal an operation", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    await operation.eval({}, 5);
    const marshaled = operation.marshal();

    const unmarshaledOperation = Operation.unmarshal(marshaled, registry);
    expect(await unmarshaledOperation.eval({}, 5)).toBe(10);
    expect(callCount).toBe(1);
  });

  it("should compute new results when given different inputs", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: func1,
    });

    await operation.eval({}, 2);
    await operation.eval({}, 4);

    expect(callCount).toBe(2);
  });
});
