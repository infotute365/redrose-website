import { NextResponse } from "next/server";
import { MongoError } from "mongodb";
import { DatabaseConfigurationError, DatabaseUnavailableError } from "../config/mongo-client.mjs";
import { JsonInputError } from "./json.mjs";

export function isDatabaseFailure(error: unknown) {
  return (
    error instanceof MongoError ||
    error instanceof DatabaseConfigurationError ||
    error instanceof DatabaseUnavailableError
  );
}
export function withApiBoundary<T extends unknown[]>(handler: (...args: T) => Promise<Response>) {
  return async (...args: T): Promise<Response> => {
    try {
      return await handler(...args);
    } catch (error) {
      if (error instanceof JsonInputError)
        return NextResponse.json({ error: error.message }, { status: error.status });
      if (isDatabaseFailure(error))
        return NextResponse.json(
          { error: "Database service temporarily unavailable." },
          { status: 503 },
        );
      if (error instanceof SyntaxError)
        return NextResponse.json({ error: "Invalid request." }, { status: 400 });
      return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
    }
  };
}
