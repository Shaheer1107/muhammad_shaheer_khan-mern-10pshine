import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Signup from "../pages/Auth/Signup";

const AppRoutes = () => {
  return (
    <Router>
      <Routes>
        <Route path="/signup" element={<Signup />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;
