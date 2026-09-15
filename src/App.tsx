import { useHashRoute } from "./useHashRoute";
import { Nav } from "./components/Nav";
import { Home } from "./pages/Home";
import { Lab } from "./pages/Lab";
import { Toast } from "./components/Toast";
import { HowItWorks } from "./components/HowItWorks";
import { PrivacyNote } from "./components/PrivacyNote";

export function App() {
  const route = useHashRoute();

  return (
    <main>
      <Nav route={route} />
      {route === "/lab" ? <Lab /> : <Home />}
      <HowItWorks />
      <PrivacyNote />
      <Toast />
    </main>
  );
}
