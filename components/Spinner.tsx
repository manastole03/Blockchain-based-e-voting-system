import React from "react";

const Spinner: React.FC = () => (
  <div className="flex items-center justify-center w-full h-full py-8">
    <div className="relative w-10 h-10">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-transparent border-b-transparent border-l-transparent animate-spin" />
    </div>
  </div>
);

export default Spinner;
