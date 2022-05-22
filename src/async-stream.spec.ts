import { AsyncStream, mapStream } from "./async-stream";

describe('AsyncStream', () => {
  let stream: AsyncStream<number, string>;

  beforeEach(() => stream = new AsyncStream());

  it("can push values to multiple consumers", async () => {
    let values1 = [];
    let values2 = [];

    const unsub1 = stream.subscribe((value) => values1.push(value));
    const unsub2 = stream.subscribe((value) => values2.push(value));

    stream.push(123);
    stream.push(456);

    await new Promise(resolve => setImmediate(resolve));

    expect(values1).toEqual([123, 456]);
    expect(values2).toEqual([123, 456]);

    unsub1();
    unsub2();
  });

  it("can unsubscribe", async () => {
    let values = [];

    const unsub = stream.subscribe(value => values.push(value));
    stream.push(123);
    unsub();
    stream.push(456);

    await new Promise(resolve => setImmediate(resolve));

    expect(values).toEqual([123]);
  });
  
  it("calls done when queue is aborted", async () => {
    let abortValue: string;

    stream.subscribe(() => {}, (value: string) => {
      abortValue = value;
    });

    stream.abort('done');

    await new Promise(resolve => setImmediate(resolve));

    expect(abortValue).toEqual('done');
  });
});

describe("mapStream", () => {
  let stream: AsyncStream<number, string>;

  beforeEach(() => stream = new AsyncStream());

  it("maps values", async () => {
    let values = [];
    const newStream = mapStream(stream, (value) => value * 2);
    newStream.subscribe(value => values.push(value));

    stream.push(123);

    await new Promise(resolve => setImmediate(resolve));

    expect(values).toEqual([246]);
  });

  it("aborts when original stream is aborted", async () => {
    let abortValue1;
    let abortValue2;
    const newStream1 = mapStream(stream, value => value);
    const newStream2 = mapStream(stream, value => value, abortValue => [abortValue]);

    newStream1.subscribe(() => {}, value => abortValue1 = value);
    newStream2.subscribe(() => {}, value => abortValue2 = value);

    stream.abort('done');

    await new Promise(resolve => setImmediate(resolve));

    expect(abortValue1).toEqual('done');
    expect(abortValue2).toEqual(['done'])
  });
});
