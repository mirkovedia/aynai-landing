export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

export type ToastAction =
  | { type: "ADD_TOAST"; toast: Toast }
  | { type: "REMOVE_TOAST"; id: string };

/** Reducer puro de la cola de toasts (sin efectos ni JSX → testeable). */
export const toastReducer = (state: Toast[], action: ToastAction): Toast[] => {
  switch (action.type) {
    case "ADD_TOAST":
      return [...state, action.toast];
    case "REMOVE_TOAST":
      return state.filter((t) => t.id !== action.id);
    default:
      return state;
  }
};

/** Genera ids incrementales sin depender de Date.now()/Math.random(). */
let counter = 0;
export const nextToastId = (): string => `toast-${++counter}`;
