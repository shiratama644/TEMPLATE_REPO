/**
 * Result type — Ok/Err pattern for error handling without exceptions
 */

export type Result<T, E = Error> = Ok<T> | Err<E>

export class Ok<T> {
  readonly ok = true
  readonly err = false
  constructor(readonly value: T) {}

  isOk(): this is Ok<T> {
    return true
  }

  isErr(): this is Err<never> {
    return false
  }

  map<U>(fn: (value: T) => U): Result<U> {
    try {
      return new Ok(fn(this.value))
    } catch (e) {
      return new Err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  flatMap<U>(fn: (value: T) => Result<U>): Result<U> {
    try {
      return fn(this.value)
    } catch (e) {
      return new Err(e instanceof Error ? e : new Error(String(e)))
    }
  }

  mapErr(_fn?: (error: never) => never): Result<T> {
    return this
  }

  unwrap(): T {
    return this.value
  }

  unwrapOr(_defaultValue: T): T {
    return this.value
  }

  unwrapOrElse(_fn: () => T): T {
    return this.value
  }

  match<U>(patterns: { ok: (value: T) => U; err: (error: never) => U }): U {
    return patterns.ok(this.value)
  }
}

export class Err<E = Error> {
  readonly ok = false
  readonly err = true
  constructor(readonly error: E) {}

  isOk(): this is Ok<never> {
    return false
  }

  isErr(): this is Err<E> {
    return true
  }

  map<U>(_fn?: (value: never) => U): Result<U, E> {
    return new Err(this.error)
  }

  flatMap<U>(_fn?: (value: never) => Result<U>): Result<U, E> {
    return new Err(this.error)
  }

  mapErr<F>(fn: (error: E) => F): Result<never, F> {
    try {
      return new Err(fn(this.error))
    } catch (e) {
      return new Err(
        e instanceof Error ? (e as unknown as F) : (new Error(String(e)) as unknown as F),
      )
    }
  }

  unwrap(): never {
    throw this.error instanceof Error ? this.error : new Error(String(this.error))
  }

  unwrapOr<T>(defaultValue: T): T {
    return defaultValue
  }

  unwrapOrElse<T>(fn: (error: E) => T): T {
    return fn(this.error)
  }

  match<U>(patterns: { ok: (value: never) => U; err: (error: E) => U }): U {
    return patterns.err(this.error)
  }
}

export function ok<T>(value: T): Result<T, never> {
  return new Ok(value)
}

export function err<E>(error: E): Result<never, E> {
  return new Err(error)
}

export function fromThrowable<T>(fn: () => T): Result<T> {
  try {
    return ok(fn())
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export async function fromPromise<T>(promise: Promise<T>): Promise<Result<T>> {
  try {
    const value = await promise
    return ok(value)
  } catch (e) {
    return err(e instanceof Error ? e : new Error(String(e)))
  }
}

export function combine<T>(results: Result<T>[]): Result<T[]> {
  const values: T[] = []
  for (const r of results) {
    if (r.isErr()) return r as unknown as Result<T[]>
    values.push(r.value)
  }
  return ok(values)
}

export function isResult(value: unknown): value is Result<unknown> {
  return value instanceof Ok || value instanceof Err
}
