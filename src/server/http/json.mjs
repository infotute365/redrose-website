export class JsonInputError extends Error {
  constructor(status = 400) {
    super(status === 413 ? "Request body too large." : "Invalid JSON request.");
    this.name = "JsonInputError";
    this.status = status;
  }
}
export async function readJsonBody(request, maximumBytes = 64 * 1024) {
  const declared = request.headers.get("content-length");
  if (declared && (!/^\d+$/.test(declared) || Number(declared) > maximumBytes))
    throw new JsonInputError(413);
  if (!request.body) throw new JsonInputError();
  const reader = request.body.getReader();
  const chunks = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > maximumBytes) {
        await reader.cancel();
        throw new JsonInputError(413);
      }
      chunks.push(Buffer.from(value));
    }
    try {
      return JSON.parse(Buffer.concat(chunks).toString("utf8"));
    } catch {
      throw new JsonInputError();
    }
  } finally {
    reader.releaseLock();
  }
}
