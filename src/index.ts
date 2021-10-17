export interface MapFunction<U, V> {
  (u: U): V;
}

export interface FilterFunction<U> {
  (u: U): boolean;
}

export interface ReducerFunction<U, R> {
  (acc: R, cur: U): R;
}

export interface Transducer<U, V, R> {
  (reducer: ReducerFunction<V, R>): ReducerFunction<U, R>;
}

export const map = <U, V, R>(fn: MapFunction<U, V>): Transducer<U, V, R> => (reducer) => (acc, cur) =>
  reducer(acc, fn(cur));

export const filter = <U, R>(fn: FilterFunction<U>): Transducer<U, U, R> => (reducer) => (acc, cur) =>
  fn(cur) ? reducer(acc, cur) : acc;

export const pipe = (...transducers) => (seedReducer) =>
  transducers.reduceRight((reducer, transducer) => transducer(reducer), seedReducer);
