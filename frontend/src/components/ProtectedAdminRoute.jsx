import { Navigate, useLocation } from "react-router-dom";

export default function ProtectedAdminRoute({ children }) {
  const token = localStorage.getItem("admin_token");
  const location = useLocation();

  // যদি admin token না থাকে, তাহলে login page এ redirect করুন
  if (!token) {
    return <Navigate to="/admin" state={{ from: location }} replace />;
  }

  // Token থাকলে, children render করুন
  return children;
}
