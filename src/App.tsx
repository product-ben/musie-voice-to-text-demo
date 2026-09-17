import { useHashRoute } from "./useHashRoute";
import { Nav } from "./components/Nav";
import { Home } from "./pages/Home";
import { Lab } from "./pages/Lab";
import { Musie } from "./pages/Musie";
import { Toast } from "./components/Toast";
import { HowItWorks } from "./components/HowItWorks";
import { PrivacyNote } from "./components/PrivacyNote";

export function App() {
  const route = useHashRoute();

  return (
    <main>
      <Nav route={route} />
      {route === "/rules" ? (
        <Musie view="rules" />
      ) : route === "/states" ? (
        <Musie view="states" />
      ) : route === "/musie" ? (
        // The design-system page stands on its own: the explainers below are
        // written in this app's voice and styling, and would undercut it.
        <Musie />
      ) : (
        <>
          {route === "/lab" ? <Lab /> : <Home />}
          <HowItWorks />
          <PrivacyNote />
        </>
      )}
      <Toast />
    </main>
  );
}
