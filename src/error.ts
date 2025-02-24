import { ValueError } from "@sinclair/typebox/errors";

type WorkflowErrorData =
  | {
      type: "OPERATION_FAILED";
      id: string;
      error: unknown;
    }
  | {
      type: "VALUE_VALIDATION_FAILED";
      errors: ValueError[];
    }
  | {
      type: "VALUE_NOT_COMPUTED";
    };

export class WorkflowError extends Error {
  public data: WorkflowErrorData;

  constructor({
    message,
    cause,
    stack,
    data,
  }: {
    message: string;
    cause?: unknown;
    stack?: string;
    data: WorkflowErrorData;
  }) {
    super(message);
    this.name = "WorkflowError";
    this.message = message;
    this.cause = cause;
    this.stack = stack;
    this.data = data;
  }
}
