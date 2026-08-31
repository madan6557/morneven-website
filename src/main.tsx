import { createRoot } from "react-dom/client";
import "@fontsource/inter/latin.css";
import "@fontsource/orbitron/latin.css";
import "@fontsource/rajdhani/latin.css";
import App from "./App.tsx";
import "./index.css";

createRoot(document.getElementById("root")!).render(<App />);
