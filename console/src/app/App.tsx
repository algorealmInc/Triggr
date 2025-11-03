import { BrowserRouter } from "react-router-dom";
import { AppProviders } from "@/providers/AppProviders";
import { AppRoutes } from "./routes/AppRoutes";

const App = () => {
  return (
    <BrowserRouter>
      <AppProviders>
        <AppRoutes />
      </AppProviders>
    </BrowserRouter>
  );
};

export default App;
