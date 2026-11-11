import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Info, X, XCircle } from "lucide-react";
import { useToastStore, type Toast } from "../store/toasts";

const iconByTone = {
  success: CheckCircle2,
  error: XCircle,
  info: Info,
};

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const Icon = iconByTone[toast.tone ?? "info"];

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 10, scale: 0.98 }}
      className="flex w-80 gap-3 rounded-xl border border-white/10 bg-zinc-950/95 p-4 text-left shadow-2xl"
    >
      <Icon className="mt-0.5 h-5 w-5 text-blue-400" aria-hidden="true" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{toast.title}</p>
        {toast.description ? <p className="mt-1 text-xs text-zinc-400">{toast.description}</p> : null}
      </div>
      <button className="text-zinc-500 transition hover:text-white" onClick={() => dismiss(toast.id)} type="button">
        <X className="h-4 w-4" aria-hidden="true" />
      </button>
    </motion.div>
  );
}

export function Toaster() {
  const toasts = useToastStore((state) => state.toasts);

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-3">
      <AnimatePresence>{toasts.map((toast) => <ToastItem key={toast.id} toast={toast} />)}</AnimatePresence>
    </div>
  );
}
