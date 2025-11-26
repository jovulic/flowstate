import crypto from "crypto";
import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { Mutex } from "async-mutex";
import {
  OperationFunction,
  OperationFunctionType,
  OperationFunctionDataSchema,
  FunctionRegistry,
} from "./function.js";
import { WorkflowError } from "./error.js";

/**
 * {@link OperationDataSchema} defines the expected structure of an
 * {@link Operation} when marshaled.
 */
export const OperationDataSchema = Type.Object({
  id: Type.String(),
  func: OperationFunctionDataSchema,
  cache: Type.Optional(
    Type.Object({
      hash: Type.String(),
      value: Type.String(),
    }),
  ),
});
export type OperationData = Static<typeof OperationDataSchema>;

/**
 * {@link Operation} is a serializable operation that builds on a
 * {@link OperationFunction} by adding output value caching and associating an
 * id to the operation.
 *
 * @template TId - The unique identifier type for the operation.
 * @template TContext - The execution context type.
 * @template TInput - The input type for the operation.
 * @template TOutput - The output type of the operation.
 */
export class Operation<TId extends string, TContext, TInput, TOutput> {
  readonly id: TId;
  readonly func: OperationFunction<TContext, TInput, TOutput>;
  private cache:
    | {
        hash: string;
        value: TOutput;
      }
    | undefined;
  private cacheLock: Mutex;

  constructor({
    id,
    func,
    cache,
  }: {
    id: TId;
    func:
      | OperationFunction<TContext, TInput, TOutput>
      | OperationFunctionType<TContext, TInput, TOutput>;
    cache?: {
      hash: string;
      value: TOutput;
    };
  }) {
    this.id = id;
    this.func =
      func instanceof OperationFunction
        ? func
        : new OperationFunction(id, func);
    this.cache = cache;
    this.cacheLock = new Mutex();
  }

  /**
   * {@link unmarshal} deserializes an {@link Operation}.
   *
   * @throws If the provided data does not match the expected schema.
   */
  static unmarshal<TId extends string, TContext, TInput, TOutput>(
    data: OperationData,
    registry: FunctionRegistry,
  ): Operation<TId, TContext, TInput, TOutput> {
    if (!Value.Check(OperationDataSchema, data)) {
      throw new WorkflowError({
        message: "invalidate operation data",
        data: {
          type: "VALUE_VALIDATION_FAILED",
          errors: [...Value.Errors(OperationDataSchema, data)],
        },
      });
    }

    const id = data.id as TId;
    const func = OperationFunction.unmarshal(
      data.func,
      registry,
    ) as OperationFunction<TContext, TInput, TOutput>;
    const cache = (() => {
      if (data.cache == null) {
        return undefined;
      }
      return {
        hash: data.cache.hash,
        value: JSON.parse(
          Buffer.from(data.cache.value, "base64").toString("utf-8"),
        ),
      };
    })();

    return new Operation({ id, func, cache });
  }

  /**
   * {@link marshal} serializes the {@link Operation}.
   */
  marshal(): OperationData {
    return {
      id: this.id,
      func: this.func.marshal(),
      cache: (() => {
        if (this.cache == null) {
          return undefined;
        }
        const cacheValueJson =
          this.cache.value == null ? "{}" : JSON.stringify(this.cache.value);
        return {
          hash: this.cache.hash,
          value: Buffer.from(cacheValueJson).toString("base64"),
        };
      })(),
    };
  }

  /**
   * {@link computeHash} computes a unique hash for a given input.
   */
  private computeHash(input: TInput): string {
    // We nullish the input string to handle cases where the input is undefined
    // (which is the case when a operation does not take any input).
    const inputString = input == null ? "{}" : JSON.stringify(input);
    const inputHash = crypto
      .createHash("sha256")
      .update(inputString)
      .digest("hex");
    return inputHash;
  }

  /**
   * {@link done} returns whether the operation has completed execution.
   */
  get done(): boolean {
    return this.cache !== undefined;
  }

  /**
   * {@link clear} clears the cached result of the operation.
   */
  clear(): void {
    this.cache = undefined;
  }

  /**
   * {@link test} checks whether the input matches the cached input hash,
   * returning true on a match. It will return false if there is no cached
   * input.
   */
  test($: TContext, input: TInput): boolean {
    // TODO(jv): We include the context in the signature as we may want to also
    // version operation values off the context.
    const inputHash = this.computeHash(input);
    return this.cache?.hash === inputHash ? true : false;
  }

  /**
   * {@link eval} evaluates the operation and caches the result.
   *
   * If the same input has been evaluated before, the cached result is
   * returned. Otherwise, the function executes and stores the result.
   */
  async eval($: TContext, input: TInput): Promise<TOutput> {
    const inputHash = this.computeHash(input);

    // If the cache is set and shares the same input hash, we return the cached
    // value. We other compute the value and update the cached value.
    const value = await this.cacheLock.runExclusive(async () => {
      if (this.cache != null && this.cache.hash === inputHash) {
        return this.cache.value;
      }
      const value = await this.func.invoke($, input);
      this.cache = { hash: inputHash, value };
      return value;
    });
    return value;
  }
  /**
   * {@link value} retrieves the cached result of the operation.
   *
   * @throws If the operation has not been computed yet.
   */
  get value(): TOutput {
    if (this.cache == null) {
      throw new WorkflowError({
        message: "operation value has not been computed",
        data: { type: "VALUE_NOT_COMPUTED" },
      });
    }
    return this.cache.value;
  }
}
