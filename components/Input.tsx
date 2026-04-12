interface InputProps {
  label: string;
  type: "text" | "password" | "number" | "email";
  placeholder?: string;
  value: string | number;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}

const Input: React.FC<InputProps> = ({
  label,
  type,
  placeholder,
  value,
  onChange,
  required = false,
}) => {
  return (
    <div className="flex flex-col w-full relative">
      <label htmlFor={label} className="text-sm font-medium text-muted mb-1.5 ml-1">
        {label}
      </label>
      <div className="relative group">
        <input
          id={label}
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          className="w-full bg-surface/50 border border-border/60 text-white rounded-xl px-4 py-3 text-sm 
          transition-all duration-300 ease-out focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary/50
          placeholder:text-muted/50 shadow-inner group-hover:border-primary/30"
        />
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 peer-focus:opacity-100 rounded-xl transition-opacity duration-300 pointer-events-none" />
      </div>
    </div>
  );
};

export default Input;
