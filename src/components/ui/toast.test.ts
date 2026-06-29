import { describe, it, expect } from "vitest";
import { toastReducer as reducer, nextToastId, type Toast } from "./toast-reducer";

const make = (id: string): Toast => ({ id, message: `msg-${id}`, variant: "info" });

describe("toastReducer", () => {
  it("agrega un toast al final de la cola", () => {
    const state = reducer([], { type: "ADD_TOAST", toast: make("a") });
    expect(state).toHaveLength(1);
    expect(state[0].id).toBe("a");
  });

  it("conserva el orden al agregar varios", () => {
    let state = reducer([], { type: "ADD_TOAST", toast: make("a") });
    state = reducer(state, { type: "ADD_TOAST", toast: make("b") });
    expect(state.map((t) => t.id)).toEqual(["a", "b"]);
  });

  it("elimina el toast por id", () => {
    const initial = [make("a"), make("b")];
    const state = reducer(initial, { type: "REMOVE_TOAST", id: "a" });
    expect(state.map((t) => t.id)).toEqual(["b"]);
  });

  it("ignora la eliminación de un id inexistente", () => {
    const initial = [make("a")];
    const state = reducer(initial, { type: "REMOVE_TOAST", id: "zzz" });
    expect(state).toEqual(initial);
  });
});

describe("nextToastId", () => {
  it("genera ids únicos e incrementales", () => {
    const a = nextToastId();
    const b = nextToastId();
    expect(a).not.toBe(b);
  });
});
