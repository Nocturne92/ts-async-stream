import { AbortableAsyncQueue } from "./async-queue";

type Consumer<T> = (value: T) => void;

export class AsyncStream<T, A = any> {
  consumers: Set<Consumer<T>> = new Set();
  queues: Map<Consumer<T>, AbortableAsyncQueue<T>> = new Map();

  abort(value: A) {
    for (let queue of this.queues.values()) {
      queue.abort(value);
    }
  }

  subscribe(consumer: Consumer<T>, done?: (value: A) => void): () => void {
    this.consumers.add(consumer);
    const queue = new AbortableAsyncQueue<T, null>();
    this.queues.set(consumer, queue);

    (async () => {
      const iter = queue[Symbol.asyncIterator]();
      let abortValue: A;
      for (;;) {
        const {done, value} = await iter.next();
        if (done) {
          abortValue = value;
          break;
        };

        consumer(value);
      }

      this.consumers.delete(consumer);
      this.queues.delete(consumer);

      done?.apply(null, [abortValue]);
    })();

    return () => {
      this.consumers.delete(consumer);
      this.queues.delete(consumer);

      queue.abort(null);
    };
  }

  push(...values: T[]): void {
    for (let consumer of this.consumers) {
      this.queues.get(consumer).push(...values);
    }
  }
}

export function mapStream<T1, T2, A1, A2>(
  stream: AsyncStream<T1, A1>,
  map: (value: T1) => T2,
  mapAbort: (value: A1) => A2 = (value) => value as any
): AsyncStream<T2, A2> {
  const newStream = new AsyncStream<T2, A2>();

  const unsub1 = stream.subscribe(
    (value) => newStream.push(map(value)),
    (value) => newStream.abort(mapAbort(value))
  );
  const unsub2 = newStream.subscribe(
    () => {},
    () => {
      unsub1();
      unsub2();
    }
  );

  return newStream;
}
