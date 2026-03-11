import React, { useState, useContext, useMemo } from "react";
import { AuthContext } from "../context/AuthContext";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";

const Login = () => {
  const { login, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [formError, setFormError] = useState("");
  const [oauthLoading, setOauthLoading] = useState(""); // "google" | "github" | ""
  const serverUrl = import.meta.env.VITE_SERVER_URL;

  // Derive OAuth error directly from URL — no effect needed
  const urlError = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get("error") === "OAuthFailed"
      ? "Authentication via OAuth provider failed. Please try again."
      : "";
  }, [location.search]);

  const error = formError || urlError;

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setFormError(err.response?.data?.message || "Login failed");
    }
  };


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
        </div>
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {error && (
            <div className="text-red-500 text-sm text-center bg-red-50 py-2 rounded">
              {error}
            </div>
          )}
          <div className="rounded-md shadow-sm space-y-4">
            <div>
              <input
                name="email"
                type="email"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div>
              <input
                name="password"
                type="password"
                required
                className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-primary-500 focus:border-primary-500 focus:z-10 sm:text-sm"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <div className="flex items-center justify-end">
            <div className="text-sm">
              <Link
                to="/forgot-password"
                className="font-medium text-primary-600 hover:text-primary-500"
              >
                Forgot your password?
              </Link>
            </div>
          </div>

          <div>
            <button
              type="submit"
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 transition shadow"
            >
              Sign in
            </button>
          </div>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-300"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white text-gray-500">
                Or continue with
              </span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3">
            <a
              href={oauthLoading ? undefined : `${serverUrl}/api/v1/auth/google`}
              onClick={(e) => {
                if (oauthLoading) { e.preventDefault(); return; }
                setOauthLoading("google");
              }}
              aria-disabled={!!oauthLoading}
              className={`w-full inline-flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-500 transition ${
                oauthLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-50"
              }`}
            >
              {oauthLoading === "google" ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span className="sr-only">Sign in with Google</span>
              Google
            </a>
            <a
              href={oauthLoading ? undefined : `${serverUrl}/api/v1/auth/github`}
              onClick={(e) => {
                if (oauthLoading) { e.preventDefault(); return; }
                setOauthLoading("github");
              }}
              aria-disabled={!!oauthLoading}
              className={`w-full inline-flex justify-center items-center gap-2 py-2 px-4 border border-gray-300 rounded-md shadow-sm bg-gray-900 text-sm font-medium text-white transition ${
                oauthLoading ? "opacity-60 cursor-not-allowed" : "hover:bg-gray-800"
              }`}
            >
              {oauthLoading === "github" ? (
                <span className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
              ) : null}
              <span className="sr-only">Sign in with GitHub</span>
              GitHub
            </a>
          </div>
        </div>

        <div className="text-center text-sm text-gray-600 mt-6">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-primary-600 hover:text-primary-500 font-medium"
          >
            Sign up
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
