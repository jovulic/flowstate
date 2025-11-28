import graphlib from "@dagrejs/graphlib";
import { Type, Static } from "@sinclair/typebox";
import { Value } from "@sinclair/typebox/value";
import { WorkflowError } from "./error.js";
import { Operation, OperationDataSchema } from "./operation.js";
import { OperationFunctionType, FunctionRegistry } from "./function.js";

/**
 * {@link nonEmpty} ensures that a given value is not null or undefined.
 *
 * @template T - The expected type of the value.
 * @throws {Error} - Throws an error if the value is null or undefined.
 */
export function nonEmpty<TValue>(
  value: TValue | null | undefined,
  name: string = "unspecified",
): TValue {
  if (value == null) {
    throw new WorkflowError({
      message: `unexpected empty value: ${name}`,
      data: { type: "UNEXPECTED_EMPTY_VALUE" },
    });
  }
  return value;
}

/**
 * {@link uniq} remove duplicate values from an array while preserving order or
 * mutating the original array.
 */
export function uniq<TValue extends string | number>(
  array: TValue[],
): TValue[] {
  return array.filter((item, index) => array.indexOf(item) === index);
}

/**
 * {@link OperationInputEntry} is a type used to describe the conversion
 * applied to a {@link Operation} when feeding it as input to other {@link
 * Operation} in an {@link Workflow}.
 *
 * It transforms an {@link Operation} into an object with a single property
 * where the id is the id of the {@link Operation} and the value is the
 * output of the {@link Operation}.
 *
 * @template TOperation - The type of the {@link Operation} being transformed.
 */
type OperationInputEntry<TOperation extends Operation<any, any, any, any>> = {
  [K in TOperation["id"]]: Awaited<ReturnType<TOperation["eval"]>>;
};

/**
 * {@link UnionToIntersection} converts a union type to an intersection type.
 *
 * It is a pretty clever use of conditional types over functions. The magic is
 * in the second conditional type where it uses the infer keyword to get the
 * type that a intersection of all union'd types would need to be for such a
 * function.
 *
 * @template U - The union type that is being transformed into an intersection.
 *
 * https://stackoverflow.com/questions/50374908/transform-union-type-to-intersection-type
 */
type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (
  k: infer I,
) => void
  ? I
  : never;

/**
 * {@link OperationInput} defines the type that is fed into operations as
 * input when chaining operations.
 *
 * It works by creating a {@link OperationInputEntry} type per operation and
 * then computing the intersection type over all.
 *
 * @template TOperations - The array of {@link Operation} types that are being chained.
 *
 * NB(jv): Leaving this for posterity as it is interesting.
 *
 * While the below type "works" (at least when specifying the input operations
 * in the type definition) Typescript is unable to infer the final type. The
 * issue is the complexity (presumably the recursion, but unsure).
 *
 * The replacement seen below is "simpler" (well, inference works). It
 * functions by using a mapped type to iterate over each element of the
 * operations array, extracting the input type via entry, and then use number
 * as a way to "flatten" or union all the types together into one, and finally
 * use the pretty magic {@lin UnionToIntersection} type to turn it into an
 * intersection.
 *
 * type OperationInput<TOperations extends Array<Operation<any, any, any, any>>> =
 *   TOperations extends [
 *     infer First extends Operation<any, any, any, any>,
 *     ...infer Rest extends Operation<any, any, any, any>[],
 *   ] ? OperationInputEntry<First> & OperationInput<Rest>
 *   : {};
 */
type OperationInput<TOperations extends Array<Operation<any, any, any, any>>> =
  UnionToIntersection<
    {
      [Index in keyof TOperations]: OperationInputEntry<TOperations[Index]>;
    }[number]
  >;

/**
 * {@link computeRequiredToNode} returns the nodes that must be evaluated in
 * the graph in order to be able to evaluate the given node.
 */
export function computeRequiredToNode(
  nodes: string[],
  graph: graphlib.Graph,
  node: string,
): void {
  const edges = graph.inEdges(node);
  if (edges == null) {
    throw new WorkflowError({
      message: `unable to find in edges for node "${node}"`,
      data: { type: "FAILED_WORKFLOW_ACTION" },
    });
  }
  for (const edge of edges) {
    const sourceNode = edge.v;
    nodes.push(sourceNode);
    computeRequiredToNode(nodes, graph, sourceNode);
  }
}

/**
 * {@link WorkflowDataSchema} defines the expected structure of an
 * {@link Workflow} when marshaled.
 */
const WorkflowDataSchema = Type.Object({
  graph: Type.String(),
  operations: Type.Array(OperationDataSchema),
});
type WorkflowData = Static<typeof WorkflowDataSchema>;

/**
 * {@link Workflow} encapsulates the creation, execution, serialization, and
 * deserialization of a directed acyclic computation graph of {@link Operation}s.
 *
 * This class is designed to handle complex multi-step computations where the
 * results of operations are passed downstream, ensuring dynamic typing
 * throughout the process.
 *
 * Constraints:
 * - The graph must have a single source node (only outgoing edges).
 * - The graph must have a single sink node (only incoming edges).
 * - The graph must be directed and acyclic.
 * - All {@link Operation}s must have unique IDs.
 */
export class Workflow<TWorkflowContext, TWorkflowInput, TWorkflowOutput> {
  private graph: graphlib.Graph;
  private operations: {
    value: Array<Operation<any, any, any, any>>;
    lookup: Record<string, Operation<any, any, any, any> | undefined>;
  };

  constructor({
    graph = new graphlib.Graph(),
    operations = [],
  }: {
    graph?: graphlib.Graph;
    operations?: Operation<any, any, any, any>[];
  } = {}) {
    this.graph = graph;
    this.operations = {
      value: operations,
      lookup: operations.reduce(
        (lookup, operation) => {
          lookup[operation.id] = operation;
          return lookup;
        },
        {} as Record<string, Operation<any, any, any, any> | undefined>,
      ),
    };
  }

  /**
   * {@link unmarshal} deserializes a {@link Workflow}.
   *
   * @throws If the provided data does not match the expected schema.
   */
  static unmarshal<TWorkflowContext, TWorkflowInput, TWorkflowOutput>(
    data: WorkflowData,
    registry: FunctionRegistry,
  ): Workflow<TWorkflowContext, TWorkflowInput, TWorkflowOutput> {
    if (!Value.Check(WorkflowDataSchema, data)) {
      throw new WorkflowError({
        message: "invalidate operation data",
        data: {
          type: "VALUE_VALIDATION_FAILED",
          errors: [...Value.Errors(OperationDataSchema, data)],
        },
      });
    }

    return new Workflow({
      graph: graphlib.json.read(
        JSON.parse(Buffer.from(data.graph, "base64").toString("utf-8")),
      ),
      operations: data.operations.map((operation) =>
        Operation.unmarshal(operation, registry),
      ),
    });
  }

  /**
   * {@link marshal} serializes the {@link Workflow}.
   */
  marshal(): WorkflowData {
    return {
      graph: Buffer.from(
        JSON.stringify(graphlib.json.write(this.graph)),
      ).toString("base64"),
      operations: this.operations.value.map((operation) => operation.marshal()),
    };
  }

  /**
   * {@link validate} checks the workflow's structural integrity.
   *
   * The method ensures the graph has one source, one sink, is acyclic, and
   * contains no duplicate operations.
   */
  validate(): { value: boolean; message?: string } {
    if (this.graph.sources().length !== 1) {
      return {
        value: false,
        message: `workflow graph must have exactly one source node`,
      };
    }
    if (this.graph.sinks().length !== 1) {
      return {
        value: false,
        message: `workflow graph must have exactly one sink node`,
      };
    }
    if (!graphlib.alg.isAcyclic(this.graph)) {
      return {
        value: false,
        message: `workflow graph must be acyclic`,
      };
    }

    for (const operation of this.operations.value) {
      if (!this.graph.hasNode(operation.id)) {
        return {
          value: false,
          message: `workflow is missing operation "${operation.id}" in its graph`,
        };
      }
      if (!this.operations.lookup[operation.id]) {
        return {
          value: false,
          message: `failed to find operation "${operation.id}" in the operation lookup`,
        };
      }
    }

    {
      const uniqueOperationIds = uniq(
        this.operations.value.map((operation) => operation.id),
      );
      if (uniqueOperationIds.length !== this.operations.value.length) {
        return {
          value: false,
          message: `the workflow contains duplicate operations`,
        };
      }
    }

    return { value: true };
  }

  get registry(): FunctionRegistry {
    return this.operations.value.reduce((acc, operation) => {
      acc[operation.id] = operation.func.fn;
      return acc;
    }, {} as FunctionRegistry);
  }

  clone(): Workflow<TWorkflowContext, TWorkflowInput, TWorkflowOutput> {
    return Workflow.unmarshal(this.marshal(), this.registry);
  }

  /**
   * {@link first} defines the first operation in the workflow.
   *
   * It also ensures only one source node exists in the graph.
   */
  first<
    TId extends string,
    TContext extends TWorkflowContext,
    TInput extends TWorkflowInput,
    TOutput,
  >(
    id: TId,
    func: OperationFunctionType<TContext, TInput, TOutput>,
  ): Operation<TId, TContext, TInput, TOutput> {
    // We "suffice" to check that the node already exists by checking the graph
    // only.
    if (this.graph.hasNode(id)) {
      throw new WorkflowError({
        message: `workflow graph node by id "${id}" already exists`,
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    if (this.graph.sources().length === 1) {
      throw new WorkflowError({
        message: `workflow graph already has a source node`,
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    this.graph.setNode(id);

    const operation = new Operation({ id, func });
    this.operations.value.push(operation);
    this.operations.lookup[operation.id] = operation;

    return operation;
  }

  /**
   * {@link link} adds a new downstream operation from the given input operations.
   *
   * Adds the new operation as a node in the graph and connects it with edges.
   */
  link<
    TInputOperations extends Array<Operation<any, any, any, any>>,
    TId extends string,
    TContext extends TWorkflowContext,
    TInput extends OperationInput<TInputOperations>,
    TOutput,
  >(
    inputOperations: TInputOperations,
    id: TId,
    func: OperationFunctionType<TContext, TInput, TOutput>,
  ): Operation<TId, TContext, TInput, TOutput> {
    // We "suffice" to check that the node already exists by checking the graph
    // only.
    if (this.graph.hasNode(id)) {
      throw new WorkflowError({
        message: `node by id "${id}" already exists`,
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    this.graph.setNode(id);

    const operation = new Operation({ id, func });
    this.graph.setNode(operation.id);
    for (const inputOperation of inputOperations) {
      this.graph.setEdge(inputOperation.id, operation.id);
    }
    this.operations.value.push(operation);
    this.operations.lookup[operation.id] = operation;

    return operation;
  }

  /**
   * {@link last} defines the last operation in the workflow.
   *
   * The operation is similar to {@link link} but ensures the operation is the
   * sink or terminating node.
   */
  last<
    TInputOperations extends Array<Operation<any, any, any, any>>,
    TId extends string,
    TContext extends TWorkflowContext,
    TInput extends OperationInput<TInputOperations>,
    TOutput extends TWorkflowOutput,
  >(
    inputOperations: TInputOperations,
    id: TId,
    func: OperationFunctionType<TContext, TInput, TOutput>,
  ): Operation<TId, TContext, TInput, TOutput> {
    // We "suffice" to check that the node already exists by checking the graph
    // only.
    if (this.graph.hasNode(id)) {
      throw new WorkflowError({
        message: `node by id "${id}" already exists`,
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    this.graph.setNode(id);

    const operation = new Operation({ id, func });
    for (const inputOperation of inputOperations) {
      this.graph.setEdge(inputOperation.id, operation.id);
    }
    this.operations.value.push(operation);
    this.operations.lookup[operation.id] = operation;

    return operation;
  }

  /**
   * {@link sync} synchronizes the current workflow with the given workflow.
   *
   * The function can be thought of as a "smart replace" where rather than
   * replacing the workflow in whole, the process will only replace what is
   * necessary. This is particularly useful when it comes to operations and
   * their cached values, a small code change in one operation does not
   * invalidate the whole workflow.
   *
   * The sync process runs in three stages: "update graph", "new to old
   * operations", and "old to new operations", where "new" is the given workfow
   * and "old" is the existing workflow.
   *
   * NB(jv): The reason for the reverse direction is to handle cases where the
   * old workflow has operations that no longer existing the new workflow.
   *
   * It begins by taking a deep copy of the graph and operations of the
   * existing workflow. These are then mutated by the process outlined below.
   *
   * The "update graph" perform the following actions.
   * 1. Set the graph value to the new workflow graph.
   *
   * The "new to old operations" performs the following checks and actions
   * while looping over the new workflow operations.
   * 1. If the operation exists, but has a different function hash, the
   * opeation is replaced and all downstream operations have their cached
   * values cleared.
   * 2. If the operation does not exist, the operation is added.
   * 3. Otherwise do nothing. The operation exists and is identical (same
   * function hash, edges do not matter).
   *
   * The "old to new operations" performs the following checks and actions
   * while looping over the old workflow operations.
   * 1. If the operation does not exist, the operation is removed.
   * 2. Otherwise do nothing. We already have processed this operation in the
   * "new to old operations" step.
   */
  sync(
    newWorkflow: Workflow<TWorkflowContext, TWorkflowInput, TWorkflowOutput>,
  ) {
    const workflow = this.clone();

    // Section "update graph".
    {
      workflow.graph = newWorkflow.graph;
    }

    // Section "new to old operations".
    {
      for (const newOperation of newWorkflow.operations.value) {
        const oldOperation = this.operations.lookup[newOperation.id];
        if (oldOperation == null) {
          workflow.operations.value.push(newOperation);
          workflow.operations.lookup[newOperation.id] = newOperation;
          continue;
        }

        const newFunctionHash = newOperation.marshal().func.hash;
        const oldFunctionHash = oldOperation.marshal().func.hash;
        if (newFunctionHash !== oldFunctionHash) {
          workflow.operations.value = workflow.operations.value.map((op) => {
            if (op.id === newOperation.id) {
              return newOperation;
            }
            return op;
          });
          workflow.operations.lookup[newOperation.id] = newOperation;
          // We perform "clearing all downstream operation values" by using the
          // old workflow graph to compute a preorder traversal (postorder
          // would work too) and calling reset on all those operations on the
          // workflow being built.
          //
          // All operations must still exist at at this point as we have not
          // done any removal.
          {
            const downIds = graphlib.alg.preorder(this.graph, [
              newOperation.id,
            ]);
            for (const downId of downIds) {
              const operation = nonEmpty(workflow.operations.lookup[downId]);
              operation.clear();
            }
          }
          continue;
        }
      }
    }

    // Section "old to new operations".
    {
      for (const oldOperation of this.operations.value) {
        const newOperation = newWorkflow.operations.lookup[oldOperation.id];
        if (newOperation == null) {
          workflow.operations.value = workflow.operations.value
            .map((op) => {
              if (op.id === oldOperation.id) {
                return null;
              }
              return op;
            })
            .filter((op) => op !== null);
          delete workflow.operations.lookup[oldOperation.id];
        }
      }
    }

    this.graph = workflow.graph;
    this.operations = workflow.operations;
  }

  /**
   * {@link peer} provides access to the internal private variables of the
   * workflow.
   */
  get peer() {
    return Object.freeze({
      operations: {
        value: Object.freeze([...this.operations.value]),
        lookup: Object.freeze({ ...this.operations.lookup }),
      },
      graph: Object.freeze(this.graph),
    });
  }

  /**
   * {@link eval} evaluates a given operation by id and returns the result.
   *
   * The method will exactly evaluate the given node by performing a lookup
   * into the graph and composing the in edges as inputs. It will fail if any
   * of the in edges are not computed, or if input to the operation includes
   * data from the input of the workflow itself and that is not provided.
   *
   * The method does not check the validity of the workflow. It is assumed that
   * the caller has called validate to verify sound structure, or otherwise
   * invokes {@link run} for the all-in-one experience.
   */
  async eval(
    id: string,
    { $, input }: { $: TWorkflowContext; input?: TWorkflowInput },
  ): Promise<any> {
    const edges = this.graph.inEdges(id);
    if (edges == null || edges.length === 0) {
      if (input == null) {
        throw new WorkflowError({
          message: `operation "${id}" is the graph's source node but input has not been provided`,
          data: { type: "FAILED_WORKFLOW_ACTION" },
        });
      }

      const operation = nonEmpty(this.operations.lookup[id]);
      try {
        const output = await operation.eval($, input);
        return output;
      } catch (error) {
        throw new WorkflowError({
          message: "operation failed",
          data: {
            type: "OPERATION_FAILED",
            id,
            error,
          },
        });
      }
    }

    const operationInput: Record<string, any> = {};
    for (const edge of edges) {
      const sourceOperationId = edge.v;
      const sourceOperation = nonEmpty(
        this.operations.lookup[sourceOperationId],
      );

      if (!sourceOperation.done) {
        throw new WorkflowError({
          message: `input operation "${sourceOperation.id}" has not been evaluated`,
          data: { type: "FAILED_WORKFLOW_ACTION" },
        });
      }
      operationInput[sourceOperation.id] = sourceOperation.value;
    }
    const operation = nonEmpty(this.operations.lookup[id]);
    try {
      const output = await operation.eval($, operationInput);
      return output;
    } catch (error) {
      throw new WorkflowError({
        message: `operation failed`,
        data: {
          type: "OPERATION_FAILED",
          id,
          error,
        },
      });
    }
  }

  /**
   * {@link step} will evaluate the next pending operation in the grpah.
   *
   * The function works by sorting the graph topologically and iterating until
   * it hits the first non-done operation. It then evaluates that node and
   * returns the result.
   *
   * Note that the method is inefficient and computes the topological sort of
   * the graph on each invocation, and is really only suited for testing. It is
   * better to use {@link upto} and {@link run} for some or complete efficient
   * evaluation of the workflow.
   *
   * The next operation in the graph is defined as the next operation in
   * topological sort order that is not done.
   *
   * The input argument is required if the step attempts to evaluate the
   * graph's source node.
   *
   * The method will return null if all operations in the graph have been
   * evaluated.
   */
  async step($: TWorkflowContext, input?: TWorkflowInput): Promise<any | null> {
    const operationIds = graphlib.alg.topsort(this.graph);
    for (const operationId of operationIds) {
      const operation = nonEmpty(this.operations.lookup[operationId]);

      if (!operation.done) {
        // NB(jv): We do not need to check if this operation is the source node
        // as the eval function will check and fail if the input is not
        // provided in that case.
        return this.eval(operation.id, { $, input });
      }
    }
    return null;
  }

  /**
   * {@link upto} will evaluate upto the specific operation by id.
   *
   * The function works by sorting the graph in topological order and
   * evaluating each operation until it hits the named operation. It will then
   * evaluate that operation the return the result.
   *
   * A null value for the string will mean the graph is evaluated until the
   * graph's sink node with the result of that node being returned.
   */
  async upto(
    id: string | null,
    { $, input }: { $: TWorkflowContext; input?: TWorkflowInput },
  ): Promise<any> {
    // If the provided id is null, we perform a lookup of the grpah's sink
    // node and set the id to the id of the sink node.
    if (id == null) {
      const sinks = this.graph.sinks();
      if (sinks.length !== 1) {
        throw new WorkflowError({
          message: "workflow graph does not have exactly one sink",
          data: { type: "FAILED_WORKFLOW_ACTION" },
        });
      }
      const lastOperationId = this.graph.sinks()[0];
      id = lastOperationId;
    }

    // We perform the following important operations here.
    //
    // 1. We compute the required set of nodes to evaluate by walking backwards
    // from the specified node. THis ensure we only evaluate nodes we need to
    // get the specified node's result.
    // 2. We compute the order we must evaluate the nodes by performing a
    // topological sort. This ensures we evaluate dependant nodes first.
    // 3. We then filter the topologically sorted list of nodes down to only
    // those that are required. We do this based off the topologically sorted
    // list to keep the same order of nodes.
    //
    // We also, due to the topological sort, can safley access the value
    // property of the operation as we know it necessarily would have been
    // computed.
    const requiredNodes: string[] = [id];
    computeRequiredToNode(requiredNodes, this.graph, id);
    const topsortNodes: string[] = graphlib.alg.topsort(this.graph);
    const operationIds = topsortNodes.filter((node) =>
      requiredNodes.includes(node),
    );
    for (const operationId of operationIds) {
      const operation = nonEmpty(this.operations.lookup[operationId]);

      // NB(jv): We cannot shortcut and check the operation cache here as we
      // need to check the operation input for changes which happens within the
      // eval method.

      // The operation is not complete. We evaluate in all cases, but if this
      // happens to be the upto node, we can finish and return the computed
      // value.
      //
      // NB(jv): It is fine (perhaps not tidy, but saves looking up the source
      // operation id) to pass The input here for the non-source nodes. It will
      // be ignored.
      const output = await this.eval(operation.id, { $, input });
      if (operation.id === id) {
        return output;
      }
    }
  }

  /**
   * {@link run} runs the entire workflow from start to finish.
   */
  async run(
    $: TWorkflowContext,
    input: TWorkflowInput,
  ): Promise<TWorkflowOutput> {
    const validate = this.validate();
    if (!validate.value) {
      throw new WorkflowError({
        message: `workflow is not valid: ${validate.message}`,
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    const output = await this.upto(null, { $, input });
    return output as TWorkflowOutput;
  }

  /**
   * {@link test} checks whether the first operation in the graph is cached for
   * the given input. It will return true if the source operation input matches
   * the cache input.
   *
   * The use case for the method is to check if the input will trigger
   * recomputation. We know that all changes to the graph must come from the
   * input, and therefore is suffices to check if the input has any change as
   * to whether downstream operations will require evaluation.
   *
   * It is also side-effect free and lightweight in that it does not perform
   * the computation but rather just the check of differing input hash.
   */
  test($: TWorkflowContext, input: TWorkflowInput): boolean {
    const sources = this.graph.sources();
    if (sources.length !== 1) {
      throw new WorkflowError({
        message: "workflow graph does not have exactly one source",
        data: { type: "FAILED_WORKFLOW_ACTION" },
      });
    }
    const firstOperationId = sources[0];
    const firstOperation = nonEmpty(this.operations.lookup[firstOperationId]);
    return firstOperation.test($, input);
  }
}
