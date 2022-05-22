import { AbortableAsyncQueue, AsyncQueue, done } from "./async-queue";

async function * takeN<T>(n: number, iter: AsyncIterable<T>) {
  if (n <= 0) return;

  for await (let value of iter) {
    yield value;

    if (--n <= 0) return;
  }
}

describe("AsyncQueue", () => {
  let queue: AsyncQueue<number>;
  beforeEach(() => queue = new AsyncQueue<number>());

  it("can pull buffered values", async () => {
    queue.push(1);
    expect(await queue.pop()).toEqual(1);
  });

  it("can await value", async () => {
    const p = queue.pop();
    queue.push(1);

    expect(await p).toEqual(1);
  });

  it("can await multiple values in order", async () => {
    const p1 = queue.pop();
    const p2 = queue.pop();

    queue.push(1);
    queue.push(2);

    expect(await p1).toEqual(1);
    expect(await p2).toEqual(2);
  });

  it("can be iterated", async () => {
    const values = [];
    queue.push(1, 2, 3);

    for await (let value of takeN(3, queue)) {
      values.push(value);
    }

    expect(values).toEqual([1, 2, 3]);
  });
});

describe("AbortableAsyncQueue", () => {
  let queue: AbortableAsyncQueue<number, string>;

  beforeEach(() => queue = new AbortableAsyncQueue<number, string>());

  it("returns abort value when aborted", async () => {
    const p = queue.pop();
    queue.abort('done');

    expect(await p).toEqual('done');
  });

  it("ends iterator with value when aborted", async () => {
    const p = (async () => {
      const iter = queue[Symbol.asyncIterator]();

      for (;;) {
        const {done, value} = await iter.next();
        
        if (done) return value;
      }
    })();

    queue.abort('done');

    await expect(p).resolves.toEqual("done");
  });
});
