import { GameCanvas } from "./GameCanvas";

export function App() {
  return (
    <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "100vh" }}>
      <GameCanvas />
    </div>
  );
}
