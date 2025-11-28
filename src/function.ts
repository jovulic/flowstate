import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { minify_sync } from "terser";
import crypto from "crypto";
import { WorkflowError } from "./error.js";

/**
 * {@link computeFunctionHash} computes the hash for the given function.
 *
 * It will minify the function such that only meaningful changes result in a
 * different hash.
 */
function computeFunctionHash(func: (...args: never) => unknown): string {
  const funcString = minify_sync(func.toString(), {
    compress: false,
    mangle: false,
  }).code;
  if (funcString === undefined) {
    throw new WorkflowError({
      message: "function minification result was undefined",
      data: { type: "FAILED_FUNCTION_ACTION" },
    });
  }
  return crypto.createHash("sha256").update(funcString).digest("hex");
}

/**
 * {@link FunctionRegistry} defines a map of function ids to functions.
 */
export type FunctionRegistry = Record<
  string,
  OperationFunctionType<any, any, any>
>;

/**
 * {@link OperationFunctionDataSchema} defines the expected structure of an
 * {@link OperationFunction} when marshaled.
 */
export const OperationFunctionDataSchema = Type.Object({
  id: Type.String(),
  hash: Type.String(),
});
export type OperationFunctionData = Static<typeof OperationFunctionDataSchema>;

/**
 * {@link OperationFunctionType} defines the function signature for an
 * {@link OperationFunction}.
 *
 * @template TContext - The context type, passed as the first argument.
 * @template TInput - The input type expected by the function.
 * @template TOutput - The output type returned by the function.
 */
export type OperationFunctionType<TContext, TInput, TOutput> = (
  $: TContext,
  input: TInput,
) => Promise<TOutput>;

/**
 * {@link OperationFunction} wraps a function yielding the ability to serialize
 * and deserialize the function.
 */
export class OperationFunction<TContext, TInput, TOutput> {
  readonly id: string;
  readonly fn: OperationFunctionType<TContext, TInput, TOutput>;
  readonly hash: string;

  constructor(
    id: string,
    func: OperationFunctionType<TContext, TInput, TOutput>,
  ) {
    this.id = id;
    this.fn = func;
    this.hash = computeFunctionHash(this.fn);
  }

  /**
   * {@link unmarshal} deserializes an {@link OperationFunction}.
   *
   * @throws If the provided data does not conform to the expected schema.
   * @throws If the function hash does not match.
   */
  static unmarshal<TContext, TInput, TOutput>(
    data: OperationFunctionData,
    registry: FunctionRegistry,
  ): OperationFunction<TContext, TInput, TOutput> {
    // Validate the provided data against the expected schema.
    if (!Value.Check(OperationFunctionDataSchema, data)) {
      const errors = [...Value.Errors(OperationFunctionDataSchema, data)];
      throw new WorkflowError({
        message: `invalid operation function data: ${errors.map((error) => `${error.path}:${error.message}`).join("\n")}`,
        data: {
          type: "VALUE_VALIDATION_FAILED",
          errors,
        },
      });
    }

    const func = registry[data.id];
    if (func === undefined) {
      throw new WorkflowError({
        message: `function not found in registry: ${data.id}`,
        data: { type: "SERIALIZATION_FAILED" },
      });
    }

    return new OperationFunction(data.id, func);
  }

  /**
   * {@link marshal} serializes the {@link OperationFunction}.
   */
  marshal(): OperationFunctionData {
    return {
      id: this.id,
      hash: this.hash,
    };
  }

  /**
   * {@link invoke} calls the wrapped function with the given context and
   * input.
   */
  async invoke($: TContext, input: TInput): Promise<TOutput> {
    return this.fn($, input);
  }
}
