import React, { useContext } from "react";
import { Outlet, Navigate, Link } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { Plane, LogOut } from "lucide-react";

const Layout = () => {
  const { user, logout, loading } = useContext(AuthContext);

  if (loading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        Loading...
      </div>
    );

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <Link
            to="/"
            className="flex items-center gap-2 text-primary-600 font-bold text-xl"
          >
            <Plane className="w-6 h-6" />
            <span>TripPlanner</span>
          </Link>
          <div className="flex items-center gap-3 sm:gap-4">
            <span className="text-gray-600 hidden sm:inline text-sm sm:text-base">Hi, {user.name}</span>
            <button
              onClick={logout}
              className="flex items-center gap-1 text-gray-500 hover:text-gray-700 transition text-sm sm:text-base"
            >
              <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              <span className="sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </header>
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
