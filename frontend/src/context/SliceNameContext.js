// src/context/SliceNameContext.js
import { createContext, useContext, useState } from "react";

const SliceNameContext = createContext();

export function SliceNameProvider({ children }) {
  const [sliceName, setSliceName] = useState("JAN");
  return (
    <SliceNameContext.Provider value={{ sliceName, setSliceName }}>
      {children}
    </SliceNameContext.Provider>
  );
}

export function useSliceName() {
  return useContext(SliceNameContext);
}