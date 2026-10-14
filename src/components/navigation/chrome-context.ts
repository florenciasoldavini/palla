import { createContext } from "react";
export const NavigationChromeContext = createContext(false);
export const RoleModeContext = createContext<"player" | "organizer">("player");
