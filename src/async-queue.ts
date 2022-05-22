export const done = Symbol();

export class AsyncQueue<T = any> {
  protected _push: T[] = [];
  protected _pull: ((t: T) => void)[] = [];

  push(...values: T[]): void {
    for (let value of values) {
      if (this._pull.length) {
        this._pull.pop()(value);
      } else {
        this._push.unshift(value);
      }
    }
  }

  async pop(): Promise<T> {
    if (this._push.length) {
      return this._push.pop();
    } else {
      return await new Promise((resolve) => this._pull.unshift(resolve));
    }
  }

  

  [Symbol.asyncIterator](): AsyncIterator<T> {
    return {
      next: async () => {
        return { done: false, value: await this.pop() };
      },
    };
  }
}

export class AbortableAsyncQueue<T, A = any> extends AsyncQueue<T | A> {
  #abortValue: A;

  push(...values: T[]) {
    super.push(...values);
  }

  async pop(): Promise<T | A> {
    const value = await super.pop();

    if (value === done) return this.#abortValue;

    return value;
  }

  private async _pop(): Promise<T | typeof done> {
    return (await super.pop()) as T | typeof done;
  }

  abort(value: A) {
    this._push = [done as any];
    for (let pull of this._pull) {
      pull(done as any);
    }

    this.#abortValue = value;
  }

  [Symbol.asyncIterator](): AsyncIterator<T, A> {
    return {
      next: async () => {
        const value = await this._pop();

        if (value === done) {
          return { done: true, value: this.#abortValue };
        } else {
          return { done: false, value };
        }
      }
    }
  }
}

export async function * asyncQueueIterator<T>(queue: AsyncQueue<T>) {
  for await (let value of queue) {}
}
