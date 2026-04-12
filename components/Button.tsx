import React from "react";

interface ButtonProps {
  onClick: (event: any) => void;
  children: React.ReactNode;
  className?: string; // Add className prop for custom sizing
}

const Button: React.FC<ButtonProps> = ({ onClick, children, className = "" }) => {
  return (
    <button
      className={`btn ${className}`}
      onClick={onClick}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

export const OutlinedButton = ({ children, onClick, className = "" }: ButtonProps) => {
  return (
    <button
      className={`btn-outline ${className}`}
      onClick={onClick}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">{children}</span>
    </button>
  );
};

export default Button;
