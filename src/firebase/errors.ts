
export class FirestorePermissionError extends Error {
  path: string;
  operation: string;
  requestResourceData: any;

  constructor({ path, operation, requestResourceData }: { path: string, operation: string, requestResourceData: any }) {
    super(`Permission denied for ${operation} on ${path}`);
    this.name = "FirestorePermissionError";
    this.path = path;
    this.operation = operation;
    this.requestResourceData = requestResourceData;
  }
}
