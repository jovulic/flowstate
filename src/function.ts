import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { minify_sync } from "terser";
import crypto from "crypto";

/**
 * {@link OperationFunctionDataSchema} defines the expected structure of an
 * {@link OperationFunction} when marshaled.
 */
export const OperationFunctionDataSchema = Type.Object({
  hash: Type.String(),
  value: Type.String(),
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
  private readonly func: OperationFunctionType<TContext, TInput, TOutput>;

  constructor(func: OperationFunctionType<TContext, TInput, TOutput>) {
    this.func = func;
  }

  /**
   * {@link unmarshal} deserializes an {@link OperationFunction}.
   *
   * @throws If the provided data does not conform to the expected schema.
   * @throws If the function hash does not match.
   */
  static unmarshal<TContext, TInput, TOutput>(
    data: OperationFunctionData,
  ): OperationFunction<TContext, TInput, TOutput> {
    // Validate the provided data against the expected schema.
    if (!Value.Check(OperationFunctionDataSchema, data)) {
      const errors = [...Value.Errors(OperationFunctionDataSchema, data)];
      throw new Error(
        `invalid operation function data: ${errors
          .map((error) => JSON.stringify(error))
          .join(", ")}`,
      );
    }

    const funcString = Buffer.from(data.value, "base64").toString("utf-8");

    // NB(jv): Note this is not tamper safe (nor does it need to be), nor is it
    // necessary, but more of a "might as well".
    const funcHash = crypto
      .createHash("sha256")
      .update(funcString)
      .digest("hex");
    if (funcHash !== data.hash) {
      throw new Error(`operation function hash does not match`);
    }

    // Convert the function string back into a JavaScript function.
    const func = Function(`return ${funcString}`)() as OperationFunctionType<
      TContext,
      TInput,
      TOutput
    >;

    return new OperationFunction(func);
  }

  /**
   * {@link marshal} serializes the {@link OperationFunction}.
   *
   * @throws If the function minification fails.
   */
  marshal(): OperationFunctionData {
    // Minify the function to ensure consistent string representation.
    const funcString = minify_sync(this.func.toString(), {
      compress: false,
      mangle: false,
    }).code;
    if (funcString === undefined) {
      throw new Error("function minification result was undefined");
    }
    return {
      hash: crypto.createHash("sha256").update(funcString).digest("hex"),
      value: Buffer.from(funcString).toString("base64"),
    };
  }

  /**
   * {@link invoke} calls the wrapped function with the given context and
   * input.
   */
  async invoke($: TContext, input: TInput): Promise<TOutput> {
    return this.func($, input);
  }
}
