import { useEffect, useRef, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}

export function Modal({ open, onClose, title, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/70 backdrop-blur-sm animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-ink-900 border border-white/10 rounded-md max-h-[85vh] overflow-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/5">
          <h3 className="font-serif text-xl italic">{title}</h3>
          <button className="btn-mini" onClick={onClose}><X size={14} /></button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

// ---- Imperative prompt/confirm via context-less approach ----
type DialogState =
  | { type: 'prompt'; title: string; placeholder?: string; defaultValue?: string; resolve: (v: string | null) => void }
  | { type: 'confirm'; title: string; message?: string; resolve: (v: boolean) => void }
  | null;

let setDialogFn: ((d: DialogState) => void) | null = null;

export function dialogPrompt(title: string, defaultValue = '', placeholder = ''): Promise<string | null> {
  return new Promise((resolve) => {
    setDialogFn?.({ type: 'prompt', title, placeholder, defaultValue, resolve });
  });
}
export function dialogConfirm(title: string, message?: string): Promise<boolean> {
  return new Promise((resolve) => {
    setDialogFn?.({ type: 'confirm', title, message, resolve });
  });
}

export function DialogRoot() {
  const [dialog, setDialog] = useState<DialogState>(null);
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDialogFn = setDialog;
    return () => { setDialogFn = null; };
  }, []);

  useEffect(() => {
    if (dialog?.type === 'prompt') {
      setValue(dialog.defaultValue || '');
      setTimeout(() => inputRef.current?.select(), 0);
    }
  }, [dialog]);

  if (!dialog) return null;

  const close = (result: string | boolean | null) => {
    if (dialog.type === 'prompt') (dialog.resolve as (v: string | null) => void)(result as string | null);
    else (dialog.resolve as (v: boolean) => void)(result as boolean);
    setDialog(null);
  };

  return (
    <Modal open onClose={() => close(dialog.type === 'prompt' ? null : false)} title={dialog.title}>
      {dialog.type === 'prompt' ? (
        <input
          ref={inputRef}
          autoFocus
          className="input mb-4"
          placeholder={dialog.placeholder}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') close(value.trim() || null);
          }}
        />
      ) : (
        dialog.message && <p className="text-sm text-cream-100/70 mb-4">{dialog.message}</p>
      )}
      <div className="flex justify-end gap-2">
        <button className="btn-ghost" onClick={() => close(dialog.type === 'prompt' ? null : false)}>
          Cancel
        </button>
        <button
          className="btn-primary"
          onClick={() => close(dialog.type === 'prompt' ? (value.trim() || null) : true)}
        >
          {dialog.type === 'prompt' ? 'OK' : 'Confirm'}
        </button>
      </div>
    </Modal>
  );
}
