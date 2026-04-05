import { ModulePage } from "../components/module-page";
import { backendModules } from "../lib/backend-routes";

const nichesModule = backendModules.find((moduleItem) => moduleItem.slug === "niches");

export default function NichesPage() {
  if (!nichesModule) {
    return <p>Modulo niches nao encontrado.</p>;
  }

  return <ModulePage moduleData={nichesModule} />;
}
