import ReactDOM from "react-dom/client";
import "leaflet/dist/leaflet.css";
import "./index.css";
import App from "./App";

// Note: React.StrictMode is intentionally omitted. Its double-invoked mount in
// development conflicts with Leaflet's map initialisation ("Map container is
// already initialized").
ReactDOM.createRoot(document.getElementById("root")!).render(<App />);
