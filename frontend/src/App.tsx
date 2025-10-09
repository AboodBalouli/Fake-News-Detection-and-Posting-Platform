import Login from "./pages/Login";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import MainPage from "./pages/MainPage";
import PostArticle from "./pages/PostArticle";
import Register from "./pages/Register";
import Admin from "./pages/Admin";
import AdminReportDetails from "./pages/AdminReportDetails";
import ProtectedRoute from "./components/ProtectedRoute";
function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route
          path="/main"
          element={
            <ProtectedRoute>
              <MainPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/post"
          element={
            <ProtectedRoute>
              <PostArticle />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <Admin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/feedback/:id"
          element={
            <ProtectedRoute>
              <AdminReportDetails />
            </ProtectedRoute>
          }
        />
      </Routes>
    </Router>
  );
}

export default App;
