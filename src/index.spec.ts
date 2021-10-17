import { filter, FilterFunction, map, MapFunction, pipe, ReducerFunction } from ".";

const increment: MapFunction<number, number> = (i) => i + 1;

const isEven: FilterFunction<number> = (i) => i % 2 === 0;

const identity: ReducerFunction<number, number[]> = (array, n) => [...array, n];

const sum: ReducerFunction<number, number> = (acc, cur) => acc + cur;

const count: ReducerFunction<number, number> = (acc, _) => acc + 1;

const incrementAndFilterEvenNumbers = pipe(map(increment), filter(isEven));

describe("Simple reducers", () => {
  test("Identity reducer", () => {
    expect([0, 1, 2, 3].reduce(identity, [])).toEqual([0, 1, 2, 3]);
  });

  test("Sum reducer", () => {
    expect([0, 1, 2, 3].reduce(sum, 0)).toEqual(6);
  });

  test("Count reducer", () => {
    expect([0, 1, 2, 3].reduce(count, 0)).toEqual(4);
  });
});

describe("Transducers", () => {
  test("Array.map", () => {
    expect([0, 1, 2, 3].map(increment)).toEqual([1, 2, 3, 4]);
  });

  test("Array.map rewritten with Array.reduce", () => {
    expect([0, 1, 2, 3].reduce(map(increment)(identity), [])).toEqual([1, 2, 3, 4]);
  });

  test("Array.filter", () => {
    expect([0, 1, 2, 3].filter(isEven)).toEqual([0, 2]);
  });

  test("Array.filter rewritten with Array.reduce", () => {
    expect([0, 1, 2, 3].reduce(filter(isEven)(identity), [])).toEqual([0, 2]);
  });

  test("Regular composition with array's map and filter functions", () => {
    expect(
      [0, 1, 2, 3]
        .map(increment) // [1, 2, 3, 4]
        .filter(isEven) // [2, 4]
    ).toEqual([2, 4]);
  });

  test("Composition of map and filter functions", () => {
    expect([0, 1, 2, 3].reduce(map(increment)(filter(isEven)(identity)), [])).toEqual([2, 4]);
  });

  test("Composition of map and filter functions with a transducer", () => {
    expect([0, 1, 2, 3].reduce(incrementAndFilterEvenNumbers(identity), [])).toEqual([2, 4]);
  });

  test("Regular composition with array's map, filter and reduce functions", () => {
    expect(
      [0, 1, 2, 3]
        .map(increment) // [1, 2, 3, 4]
        .filter(isEven) // [2, 4]
        .reduce(sum, 0) // 6
    ).toEqual(6);
  });

  test("Composition of map, filter and reduce functions with a transducer", () => {
    expect([0, 1, 2, 3].reduce(incrementAndFilterEvenNumbers(sum), 0)).toEqual(6);
  });

  test("Regular composition with array's map, filter and reduce functions", () => {
    expect(
      [0, 1, 2, 3]
        .map(increment) // [1, 2, 3, 4]
        .filter(isEven) // [2, 4]
        .reduce(count, 0) // 2
    ).toEqual(2);
  });

  test("Composition of map, filter and reduce functions with a transducer", () => {
    expect([0, 1, 2, 3].reduce(incrementAndFilterEvenNumbers(count), 0)).toEqual(2);
  });
});

describe("Exploration with generators", () => {
  function* naturalNumbers(): Generator<number> {
    let n = 0;
    while (true) {
      yield n++;
    }
  }

  test("Simple generator", () => {
    const generator = naturalNumbers();
    expect(generator.next().value).toEqual(0);
    expect(generator.next().value).toEqual(1);
    expect(generator.next().value).toEqual(2);
    expect(generator.next().value).toEqual(3);
  });

  function createIterable<U>(getGenerator: () => Generator<U>): Iterable<U> {
    return {
      [Symbol.iterator]: getGenerator,
    };
  }

  test("Use this generator to create an iterable object", function () {
    const iterable = createIterable(naturalNumbers);
    const result = [0, 1, 2, 3];
    // @ts-ignore
    for (const i of iterable) {
      if (i > 3) {
        break;
      }
      expect(i).toEqual(result[i]);
    }
  });

  interface Reducible<U> {
    reduce<R>(reducer: ReducerFunction<U, R>, seed: R): Iterable<R>;
  }

  type IterableAndReducible<U> = Iterable<U> & Reducible<U>;

  function createIterableAndReducible<U>(getGenerator: () => Generator<U>): IterableAndReducible<U> {
    function reduce<R>(reducer: ReducerFunction<U, R>, seed: R): Iterable<R> {
      const generator = getGenerator();
      let acc = seed;
      return {
        [Symbol.iterator]: function* () {
          let next = generator.next();
          while (!next.done) {
            const cur = next.value;
            acc = reducer(acc, cur);
            next = generator.next();
            yield acc;
          }
        },
      };
    }

    return {
      [Symbol.iterator]: getGenerator,
      reduce,
    };
  }

  test("Add a reduce function", function () {
    const iterable = createIterableAndReducible(naturalNumbers).reduce(sum, 0);
    const iterator = iterable[Symbol.iterator]();
    expect(iterator.next().value).toEqual(0); // 0 => 0 + 0 = 0
    expect(iterator.next().value).toEqual(1); // 1 => 0 + 1 = 1
    expect(iterator.next().value).toEqual(3); // 2 => 1 + 2 = 3
    expect(iterator.next().value).toEqual(6); // 3 => 3 + 3 = 6
  });

  test("Use with transducers", function () {
    const iterable = createIterableAndReducible(naturalNumbers).reduce(incrementAndFilterEvenNumbers(sum), 0);
    const iterator = iterable[Symbol.iterator]();
    expect(iterator.next().value).toEqual(0); // 0 => 0 + 1 = 1 odd => /; 0
    expect(iterator.next().value).toEqual(2); // 1 => 1 + 1 = 2 even => 2; 0 + 2 = 2
    expect(iterator.next().value).toEqual(2); // 2 => 2 + 1 = 3 odd => /; 2
    expect(iterator.next().value).toEqual(6); // 3 => 3 + 1 = 4 even => 4; 2 + 4 = 6
  });
});
