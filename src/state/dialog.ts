import { create } from 'zustand';

export interface DialogRequest {
  id: number;
  title: string;
  message?: string;
  confirmLabel: string;
  cancelLabel: string | null;
  destructive: boolean;
  resolve: (ok: boolean) => void;
}

interface DialogState {
  current: DialogRequest | null;
  open: (req: DialogRequest) => void;
  close: (ok: boolean) => void;
}

let seq = 0;

export const useDialogStore = create<DialogState>((set, get) => ({
  current: null,
  open: (req) => {
    get().current?.resolve(false);
    set({ current: req });
  },
  close: (ok) => {
    const cur = get().current;
    set({ current: null });
    cur?.resolve(ok);
  },
}));

/**
 * Cross-platform confirm dialog (RN's Alert.alert is a no-op on web).
 *   if (await confirm({ title: 'Delete post?', destructive: true })) { ... }
 */
export function confirm(opts: {
  title: string;
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string | null;
  destructive?: boolean;
}): Promise<boolean> {
  return new Promise((resolve) => {
    useDialogStore.getState().open({
      id: ++seq,
      title: opts.title,
      message: opts.message,
      confirmLabel: opts.confirmLabel ?? 'Confirm',
      cancelLabel: opts.cancelLabel === undefined ? 'Cancel' : opts.cancelLabel,
      destructive: !!opts.destructive,
      resolve,
    });
  });
}

/** Single-button informational dialog. */
export function alertDialog(title: string, message?: string) {
  return confirm({ title, message, confirmLabel: 'OK', cancelLabel: null });
}
