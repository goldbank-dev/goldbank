import * as React from "react"
export type ToastActionElement = React.ReactElement
export type ToastProps = { title?: React.ReactNode; description?: React.ReactNode; action?: ToastActionElement; open?: boolean; onOpenChange?: (open: boolean) => void }
type ToasterToast = ToastProps & { id: string }
const actionTypes = { ADD_TOAST: "ADD_TOAST", UPDATE_TOAST: "UPDATE_TOAST", DISMISS_TOAST: "DISMISS_TOAST", REMOVE_TOAST: "REMOVE_TOAST" } as const
type Action = { type: keyof typeof actionTypes; toast?: Partial<ToasterToast>; toastId?: string }
interface State { toasts: ToasterToast[] }
let listeners: Array<(state: State) => void> = []
let memoryState: State = { toasts: [] }
function dispatch(action: Action) {
  if (action.type === "ADD_TOAST" && action.toast) memoryState = { toasts: [action.toast, ...memoryState.toasts].slice(0, 1) }
  else if (action.type === "REMOVE_TOAST" || action.type === "DISMISS_TOAST") memoryState = { toasts: memoryState.toasts.filter(t => action.toastId ? t.id !== action.toastId : false) }
  listeners.forEach(l => l(memoryState))
}
export function useToast() {
  const [state, setState] = React.useState<State>(memoryState)
  React.useEffect(() => { listeners.push(setState); return () => { listeners = listeners.filter(l => l !== setState) } }, [])
  const toast = (props: Omit<ToasterToast, "id">) => { const id = Math.random().toString(36).slice(2); const toastObj = { ...props, id }; dispatch({ type: "ADD_TOAST", toast: toastObj }); return { id, dismiss: () => dispatch({ type: "DISMISS_TOAST", toastId: id }) } }
  return { ...state, toast, dismiss: (id?: string) => dispatch({ type: "DISMISS_TOAST", toastId: id }) }
}