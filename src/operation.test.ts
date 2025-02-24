import { describe, it, expect, vi } from "vitest";
import { Operation } from "./operation.js";

describe("Operation", () => {
  it("should execute the function correctly", async () => {
    const mockFunction = vi.fn(async (ctx, input) => input * 2);
    const operation = new Operation({
      id: "test-operation",
      func: mockFunction,
    });

    const result = await operation.eval({}, 5);
    expect(result).toBe(10);
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });

  it("should cache the result and return cached value for same input", async () => {
    const mockFunction = vi.fn(async (ctx, input) => input * 2);
    const operation = new Operation({
      id: "test-operation",
      func: mockFunction,
    });

    await operation.eval({}, 5);
    const result = await operation.eval({}, 5);

    expect(result).toBe(10);
    expect(mockFunction).toHaveBeenCalledTimes(1);
  });

  it("should return false for test if no cache exists", () => {
    const operation = new Operation({
      id: "test-operation",
      func: async (ctx, input: number) => input * 2,
    });

    expect(operation.test({}, 5)).toBe(false);
  });

  it("should return true for test if input matches cached hash", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: async (ctx, input: number) => input * 2,
    });

    await operation.eval({}, 5);
    expect(operation.test({}, 5)).toBe(true);
  });

  it("should clear the cache", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: async (ctx, input: number) => input * 2,
    });

    await operation.eval({}, 5);
    operation.clear();

    expect(operation.test({}, 5)).toBe(false);
  });

  it("should throw an error when accessing value before computation", () => {
    const operation = new Operation({
      id: "test-operation",
      func: async (ctx, input: number) => input * 2,
    });

    expect(() => operation.value).toThrow(
      "operation value has not been computed",
    );
  });

  it("should correctly marshal and unmarshal an operation", async () => {
    const operation = new Operation({
      id: "test-operation",
      func: async (ctx, input: number) => input * 2,
    });

    await operation.eval({}, 5);
    const marshaled = operation.marshal();

    const unmarshaledOperation = Operation.unmarshal(marshaled);
    expect(await unmarshaledOperation.eval({}, 5)).toBe(10);
  });

  it("should compute new results when given different inputs", async () => {
    const mockFunction = vi.fn(async (ctx, input) => input * 2);
    const operation = new Operation({
      id: "test-operation",
      func: mockFunction,
    });

    await operation.eval({}, 2);
    await operation.eval({}, 4);

    expect(mockFunction).toHaveBeenCalledTimes(2);
  });
});
