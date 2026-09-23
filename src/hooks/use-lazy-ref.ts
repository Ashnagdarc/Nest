import * as React from "react";

type InitializedRef<T> = {
  readonly current: T;
};

function useLazyRef<T>(fn: () => T): InitializedRef<T> {
  const ref = React.useRef<T | null>(null);

  if (ref.current === null) {
    ref.current = fn();
  }

  return ref as InitializedRef<T>;
}

export { useLazyRef };
