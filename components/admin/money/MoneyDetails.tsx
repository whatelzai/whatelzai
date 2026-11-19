"use client";
import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";
export default function MoneyDetails({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current;
    const overflow = document.body.style.overflow;
    el?.showModal();
    document.body.style.overflow = "hidden";
    return () => {
      el?.close();
      document.body.style.overflow = overflow;
    };
  }, []);
  return (
    <dialog
      ref={ref}
      className="money-dialog money-detail-dialog"
      aria-labelledby="money-detail-title"
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
    >
      <header>
        <h2 id="money-detail-title">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close details">
          <X size={20} aria-hidden="true" />
        </button>
      </header>
      {children}
    </dialog>
  );
}
