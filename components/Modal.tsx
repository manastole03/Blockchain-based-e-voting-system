import { Fragment, ReactNode, useEffect } from "react";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  title?: string;
};

const Modal: React.FC<Props> = ({ isOpen, onClose, children, title }) => {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <Fragment>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          onClick={onClose}
        >
          {/* Backdrop */}
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />

          {/* Modal panel */}
          <div
            className="relative z-10 w-full max-w-lg bg-surface border border-border/70 rounded-2xl shadow-[0_0_60px_rgba(107,56,251,0.2)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent bar */}
            <div className="h-1 w-full bg-gradient-to-r from-primary via-accent to-secondary" />

            {title && (
              <div className="flex items-center justify-between px-6 py-4 border-b border-border/50">
                <h2 className="text-lg font-semibold font-display text-white">{title}</h2>
                <button
                  onClick={onClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-white hover:bg-border/50 transition-colors text-xl leading-none"
                >
                  ×
                </button>
              </div>
            )}

            <div className="p-6">{children}</div>
          </div>
        </div>
      )}
    </Fragment>
  );
};

export default Modal;
