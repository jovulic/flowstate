import { describe, it, expect } from "vitest";
import { nonEmpty, uniq, computeRequiredToNode, Workflow } from "./workflow.js";
import { Operation } from "./operation.js";
import { WorkflowError } from "./error.js";
import graphlib from "@dagrejs/graphlib";

describe("nonEmpty", () => {
  it("should return the value if it is not null or undefined", () => {
    const result = nonEmpty(123, "testValue");
    expect(result).toBe(123);
  });

  it("should throw an error if the value is null", () => {
    expect(() => nonEmpty(null, "testValue")).toThrowError(
      "unexpected empty value: testValue",
    );
  });

  it("should throw an error if the value is undefined", () => {
    expect(() => nonEmpty(undefined, "testValue")).toThrowError(
      "unexpected empty value: testValue",
    );
  });

  it('should use "unspecified" as the default name if not provided', () => {
    expect(() => nonEmpty(null)).toThrowError(
      "unexpected empty value: unspecified",
    );
  });
});

describe("uniq", () => {
  it("should return an array with duplicates removed, preserving order", () => {
    const input = [1, 2, 2, 3, 4, 4, 5];
    const result = uniq(input);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it("should return an empty array when given an empty array", () => {
    const input: number[] = [];
    const result = uniq(input);
    expect(result).toEqual([]);
  });

  it("should return the same array if no duplicates are present", () => {
    const input = [1, 2, 3, 4, 5];
    const result = uniq(input);
    expect(result).toEqual([1, 2, 3, 4, 5]);
  });

  it("should handle arrays with a single value", () => {
    const input = [42];
    const result = uniq(input);
    expect(result).toEqual([42]);
  });

  it("should handle arrays with mixed types correctly", () => {
    const input = [1, "1", 2, "2", 1];
    const result = uniq(input);
    expect(result).toEqual([1, "1", 2, "2"]);
  });
});

describe("computeRequiredToNode", () => {
  it("should throw an error if in-edges are not found for a node", () => {
    const graph = new graphlib.Graph();
    expect(() => computeRequiredToNode([], graph, "A")).toThrowError(
      'unable to find in edges for node "A"',
    );
  });

  it("should add nodes to the list that must be evaluated to evaluate the given node", () => {
    const graph = new graphlib.Graph();
    graph.setNode("A");
    graph.setNode("B");
    graph.setNode("C");
    graph.setEdge("A", "B");
    graph.setEdge("B", "C");

    const nodes: string[] = [];
    computeRequiredToNode(nodes, graph, "C");

    expect(nodes).toEqual(["B", "A"]);
  });

  it("should handle a graph with no edges", () => {
    const graph = new graphlib.Graph();
    graph.setNode("A");

    const nodes: string[] = [];
    computeRequiredToNode(nodes, graph, "A");

    expect(nodes).toEqual([]);
  });

  it("should handle graphs with multiple levels of dependencies", () => {
    const graph = new graphlib.Graph();
    graph.setNode("A");
    graph.setNode("B");
    graph.setNode("C");
    graph.setNode("D");
    graph.setEdge("A", "B");
    graph.setEdge("B", "C");
    graph.setEdge("C", "D");

    const nodes: string[] = [];
    computeRequiredToNode(nodes, graph, "D");

    expect(nodes).toEqual(["C", "B", "A"]);
  });

  it("should put dependant nodes first even if shorter path", () => {
    const graph = new graphlib.Graph();
    graph.setNode("A");
    graph.setNode("B");
    graph.setNode("C");
    graph.setEdge("A", "B");
    graph.setEdge("A", "C");
    graph.setEdge("B", "C");

    const nodes: string[] = [];
    computeRequiredToNode(nodes, graph, "C");

    expect(nodes).toEqual(["A", "B", "A"]);
  });
});

describe("Workflow", () => {
  describe("marshal/unmarshal", () => {
    const createWorkflow = () => {
      const workflow = new Workflow();

      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.last([operation1], "operation2", async () => "result2");

      return workflow;
    };
    it("should correctly marshal and unmarshal", () => {
      const workflow = createWorkflow();

      const marshaledData = workflow.marshal();
      const unmarshaledWorkflow = Workflow.unmarshal(marshaledData);

      expect(unmarshaledWorkflow).toBeInstanceOf(Workflow);
      expect(graphlib.json.write(unmarshaledWorkflow.peer.graph)).toEqual(
        graphlib.json.write(workflow.peer.graph),
      );
      expect(unmarshaledWorkflow.peer.operations.value).toHaveLength(
        workflow.peer.operations.value.length,
      );
      expect(
        unmarshaledWorkflow.peer.operations.lookup["operation1"],
      ).toBeDefined();
      expect(
        unmarshaledWorkflow.peer.operations.lookup["operation2"],
      ).toBeDefined();
    });
    it("should throw in unmarshal when structure is invalid", () => {
      const invalidData = {
        operations: [],
      };

      try {
        Workflow.unmarshal(invalidData as any);
      } catch (error) {
        expect(error).toBeInstanceOf(WorkflowError);
        expect((error as any).message).toBe("invalidate operation data");
      }
    });
    it("should throw in unmarshal when the data is malformed", () => {
      const invalidData = {
        graph: "bad-data",
        operations: [],
      };

      expect(() => Workflow.unmarshal(invalidData)).toThrowError();
    });
  });

  describe("validate", () => {
    const createWorkflow = () => {
      const graph = new graphlib.Graph();
      graph.setNode("operation1");
      graph.setNode("operation2");
      graph.setEdge("operation1", "operation2");

      const operation1 = new Operation({
        id: "operation1",
        func: async () => "result1",
      });
      const operation2 = new Operation({
        id: "operation2",
        func: async () => "result2",
      });

      const operations = [operation1, operation2];
      const workflow = new Workflow({
        graph,
        operations,
      });

      return { workflow, graph, operations };
    };
    it("should pass validation for a valid workflow", () => {
      const { workflow } = createWorkflow();

      const validation = workflow.validate();

      expect(validation.value).toBe(true);
    });
    it("should fail validation if there is no source/sink nodes", () => {
      const { workflow, graph } = createWorkflow();
      graph.removeNode("operation1");
      graph.removeNode("operation2");

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe(
        "workflow graph must have exactly one source node",
      );
    });
    it("should fail validation if there is more than one source node", () => {
      const { workflow, graph } = createWorkflow();
      graph.setNode("operation3");
      graph.setEdge("operation3", "operation2");

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe(
        "workflow graph must have exactly one source node",
      );
    });
    it("should fail validation if there is more than one sink node", () => {
      const { workflow, graph } = createWorkflow();
      graph.setNode("operation3");
      graph.setEdge("operation1", "operation3");

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe(
        "workflow graph must have exactly one sink node",
      );
    });
    it("should fail validation if the graph is cyclic", () => {
      const { workflow, graph } = createWorkflow();

      graph.setNode("operation3");
      graph.setEdge("operation2", "operation3");
      graph.setEdge("operation3", "operation2");
      graph.setNode("operation4");
      graph.setEdge("operation3", "operation4");

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe("workflow graph must be acyclic");
    });
    it("should fail validation if an operation is missing from the graph", () => {
      const { workflow, graph } = createWorkflow();

      graph.removeNode("operation2");

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe(
        'workflow is missing operation "operation2" in its graph',
      );
    });
    it("should fail validation if there are duplicate operations", () => {
      const { graph, operations } = createWorkflow();
      operations.push(operations[0]);
      const workflow = new Workflow({ graph, operations });

      const validation = workflow.validate();

      expect(validation.value).toBe(false);
      expect(validation.message).toBe(
        "the workflow contains duplicate operations",
      );
    });
  });

  describe("first", () => {
    it("should add the first node to the workflow", () => {
      const workflow = new Workflow();
      workflow.first("operation1", async () => "result1");
      expect(workflow.peer.graph.hasNode("operation1")).toBe(true);
      expect(workflow.peer.operations.value.length).toEqual(1);
      expect(workflow.peer.operations.value[0].id).toEqual("operation1");
      expect(workflow.peer.operations.lookup["operation1"]?.id).toEqual(
        "operation1",
      );
    });
    it("should throw an error if a node with the same id already eixsts", () => {
      const workflow = new Workflow();
      workflow.first("operation1", async () => "result1");
      expect(() =>
        workflow.first("operation1", async () => "result1"),
      ).toThrowError('workflow graph node by id "operation1" already exists');
    });
    it("should throw an error if there is already a source node", () => {
      const workflow = new Workflow();
      workflow.first("operation1", async () => "result1");
      expect(() =>
        workflow.first("operation2", async () => "result2"),
      ).toThrowError("workflow graph already has a source node");
    });
  });

  describe("link", () => {
    it("should link input operations to the new operation", () => {
      const workflow = new Workflow();
      const operation1 = workflow.first(
        "operation1" as const,
        async () => "result1",
      );
      workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      expect(workflow.peer.graph.hasNode("operation1")).toBe(true);
      expect(workflow.peer.graph.hasNode("operation2")).toBe(true);
      expect(workflow.peer.graph.hasEdge("operation1", "operation2")).toBe(
        true,
      );
      expect(workflow.peer.operations.lookup["operation1"]).toBeDefined();
      expect(workflow.peer.operations.lookup["operation2"]).toBeDefined();
    });
    it("should work without any inputs", () => {
      const workflow = new Workflow();
      workflow.link([], "operation2", async () => "result2");
      expect(workflow.peer.graph.hasNode("operation2")).toBe(true);
      expect(workflow.peer.operations.lookup["operation2"]?.id).toEqual(
        "operation2",
      );
    });
    it("should throw an error if a node with the same id already exists", () => {
      const workflow = new Workflow();
      workflow.link([], "operation2", async () => "result2");
      expect(() =>
        workflow.link([], "operation2", async () => "result2"),
      ).toThrowError('node by id "operation2" already exists');
    });
  });

  describe("last", () => {
    it("should link input operations to the last operation", () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      const operation2 = workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      workflow.last(
        [operation2],
        "operation3",
        async ($, input) => input.operation2 + "-3",
      );
      expect(workflow.peer.graph.hasNode("operation1")).toBe(true);
      expect(workflow.peer.graph.hasNode("operation2")).toBe(true);
      expect(workflow.peer.graph.hasNode("operation3")).toBe(true);
      expect(workflow.peer.graph.hasEdge("operation1", "operation2")).toBe(
        true,
      );
      expect(workflow.peer.graph.hasEdge("operation2", "operation3")).toBe(
        true,
      );
      expect(workflow.peer.operations.lookup["operation1"]).toBeDefined();
      expect(workflow.peer.operations.lookup["operation2"]).toBeDefined();
      expect(workflow.peer.operations.lookup["operation3"]).toBeDefined();
    });
    it("should work without any inputs", () => {
      const workflow = new Workflow();
      workflow.last([], "operation3", async () => "result3");
      expect(workflow.peer.graph.hasNode("operation3")).toBe(true);
      expect(workflow.peer.operations.lookup["operation3"]).toBeDefined();
    });
    it("should throw an error if a node with the same id already exists", () => {
      const workflow = new Workflow();
      workflow.link([], "operation3", async () => "result3");
      expect(() =>
        workflow.link([], "operation3", async () => "result3"),
      ).toThrowError('node by id "operation3" already exists');
    });
  });

  describe("sync", () => {
    it("should add operations that are in the new workflow but not in the old workflow", () => {
      const workflowOld = new Workflow();
      workflowOld.first("operation1", async () => "result1");

      const workflowNew = new Workflow();
      const operation1 = workflowNew.first("operation1", async () => "result1");
      workflowNew.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      workflowOld.sync(workflowNew);

      expect(workflowOld.peer.graph.hasNode("operation2")).toBe(true);
      expect(workflowOld.peer.graph.hasEdge("operation1", "operation2")).toBe(
        true,
      );
      expect(workflowOld.peer.operations.value.length).toEqual(2);
      expect(workflowOld.peer.operations.lookup["operation2"]).toBeDefined();
    });
    it("should replace operations if the function has changed in the new workflow", async () => {
      const workflowOld = new Workflow();
      workflowOld.first("operation1", async () => "result1");

      const workflowNew = new Workflow();
      workflowNew.first("operation1", async () => "result1+");

      workflowOld.sync(workflowNew);

      // TODO(jv): Mabye expose a way to access the function itself rather than
      // also sort-of testing run here.
      const result = await workflowOld.run({}, {});
      expect(result).toEqual("result1+");
    });
    it("should remove operations that are in the old workflow but not in the new workflow", () => {
      const workflowOld = new Workflow();
      const operation1 = workflowOld.first("operation1", async () => "result1");
      workflowOld.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      const workflowNew = new Workflow();
      workflowNew.first("operation1", async () => "result1");

      workflowOld.sync(workflowNew);

      expect(workflowOld.peer.graph.hasNode("operation2")).toBe(false);
      expect(workflowOld.peer.graph.hasEdge("operation1", "operation2")).toBe(
        false,
      );
      expect(workflowOld.peer.operations.value.length).toEqual(1);
      expect(workflowOld.peer.operations.lookup["operation2"]).toBeUndefined();
    });
    it("should handle no chnages gracefully", () => {
      const workflowOld = new Workflow();
      workflowOld.first("operation1", async () => "result1");

      const workflowNew = new Workflow();
      workflowNew.first("operation1", async () => "result1+");

      workflowOld.sync(workflowNew);

      expect(workflowOld.peer.graph.hasNode("operation1")).toBe(true);
      expect(workflowOld.peer.operations.value.length).toEqual(1);
      expect(workflowOld.peer.operations.lookup["operation1"]).toBeDefined();
    });
    it("should update the operation value only when the function itself has changed", async () => {
      const workflowOld = new Workflow();
      workflowOld.first("operation1", async () => "result1");

      expect(workflowOld.peer.operations.lookup["operation1"]?.done).toBe(
        false,
      );
      await workflowOld.run({}, {});
      expect(workflowOld.peer.operations.lookup["operation1"]?.done).toBe(true);

      const workflowNew = new Workflow();
      workflowNew.first("operation1", async () => "result1");

      workflowOld.sync(workflowNew);
      expect(workflowOld.peer.operations.lookup["operation1"]?.done).toBe(true);
    });
  });

  describe("eval", () => {
    it("should evaluate a source operation with the provided input", async () => {
      const workflow = new Workflow();
      workflow.first("operation1", async () => "result1");
      const result = await workflow.eval("operation1", { $: {}, input: {} });
      expect(result).toEqual("result1");
    });
    it("should throw an error if the source operation is evaluated without input", async () => {
      const workflow = new Workflow();
      workflow.first("operation1", async () => "result1");
      await expect(
        workflow.eval("operation1", { $: {}, input: undefined }),
      ).rejects.toThrowError(
        `operation "operation1" is the graph's source node but input has not been provided`,
      );
    });
    it("should evaluate an operation with dependencies", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.last(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      {
        const result = await workflow.eval("operation1", { $: {}, input: {} });
        expect(result).toEqual("result1");
      }
      {
        const result = await workflow.eval("operation2", { $: {}, input: {} });
        expect(result).toEqual("result1-2");
      }
    });
    it("should fail to evaluate an operation if the dependencies are not evaluated", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.last(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      await expect(
        workflow.eval("operation2", { $: {}, input: {} }),
      ).rejects.toThrowError(
        'input operation "operation1" has not been evaluated',
      );
    });
  });

  describe("step", () => {
    it("should evaluate the first unprocessed operation", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      const result = await workflow.step({}, {});
      expect(result).toEqual("result1");
      expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(false);
    });
    it("should evaluate the next unprocessed operation", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );

      {
        const result = await workflow.eval("operation1", { $: {}, input: {} });
        expect(result).toEqual("result1");
        expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
        expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(false);
      }

      const result = await workflow.step({}, {});
      expect(result).toEqual("result1-2");
      expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(true);
    });
    it("should return null when all operations are processed", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      {
        const result = await workflow.step({}, {});
        expect(result).toEqual("result1");
        expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
        expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(false);
      }

      {
        const result = await workflow.step({}, {});
        expect(result).toEqual("result1-2");
        expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
        expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(true);
      }

      {
        const result = await workflow.step({}, {});
        expect(result).toEqual(null);
        expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
        expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(true);
      }
    });
  });

  describe("upto", () => {
    it("should execute operations up to a given operation", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      const operation2 = workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      workflow.last(
        [operation2],
        "operation3",
        async ($, input) => input.operation2 + "-3",
      );

      const result = await workflow.upto("operation2", { $: {}, input: {} });
      expect(result).toEqual("result1-2");
      expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation3"]?.done).toBe(false);
    });
  });

  describe("run", () => {
    it("should run the entire workflow and return the output", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      const operation2 = workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      workflow.last(
        [operation2],
        "operation3",
        async ($, input) => input.operation2 + "-3",
      );

      const result = await workflow.run({}, {});
      expect(result).toEqual("result1-2-3");
      expect(workflow.peer.operations.lookup["operation1"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation2"]?.done).toBe(true);
      expect(workflow.peer.operations.lookup["operation3"]?.done).toBe(true);
    });
  });

  describe("test", () => {
    it("should return true if the source operation value in the graph is cached", async () => {
      const workflow = new Workflow();
      const operation1 = workflow.first("operation1", async () => "result1");
      const operation2 = workflow.link(
        [operation1],
        "operation2",
        async ($, input) => input.operation1 + "-2",
      );
      workflow.last(
        [operation2],
        "operation3",
        async ($, input) => input.operation2 + "-3",
      );

      {
        const result = workflow.test({}, {});
        expect(result).toBe(false);
      }

      await workflow.step({}, {});

      {
        const result = workflow.test({}, {});
        expect(result).toBe(true);
      }
    });
  });
});
