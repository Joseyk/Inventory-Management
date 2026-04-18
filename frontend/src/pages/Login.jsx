import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getSecureRole } from "../../utils/auth";
import "../styles/Login.css";
import logo from "../assets/logo.png";

const API_BASE = import.meta.env.VITE_API_URL;

function Login({ onLoginSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const passwordInputRef = useRef(null);

  useEffect(() => {
    const role = getSecureRole();
    if (role && localStorage.getItem("isLoggedIn") === "true") {
      navigate("/dashboard", { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    if (error && passwordInputRef.current) {
      passwordInputRef.current.focus();
    }
  }, [error]);

  const handleUsernameChange = (e) => {
    let value = e.target.value;
    if (value.length > 0) {
      value = value.charAt(0).toUpperCase() + value.slice(1);
    }
    setUsername(value);
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        localStorage.setItem("username", data.user.username);
        localStorage.setItem("branch", data.user.branch || "");
        localStorage.setItem("userRole", data.user.role);
        localStorage.setItem("isLoggedIn", "true");

        onLoginSuccess(null, data.user.role, data.user.username);

        navigate("/dashboard");
      } else {
        setError(data.error || "Invalid Credentials");
      }
    } catch (err) {
      setError("Connection failed. Check your Connection.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="login-page-container">
      <div className="login-split-card">
        <div className="login-visual-side">
          <div className="visual-content">
            <img className="visual-logo" src={logo} alt="LIC Logo" />
            <h2 className="visual-title"> LIC Inventory Management</h2>
            <div className="divider"></div>
            <p className="visual-description">
              Connecting branches through smarter inventory. Request, track, and
              manage corporate resources from a single secure terminal.
            </p>
          </div>
          <div className="visual-footer">
            <span>v0.0.1</span>
            <span>Lic inventory</span>
          </div>
        </div>

        <div className="login-form-side">
          <form
            className={`login-form ${error ? "error-shake" : ""}`}
            onSubmit={handleSubmit}
          >
            <h2 className="form-title">Login</h2>

            {error && (
              <div className="error-message">
                <span className="login-error-text">{error}</span>
              </div>
            )}

            <div className="input-group">
              <input
                type="text"
                placeholder="Username"
                autoFocus={true}
                required
                value={username}
                onChange={handleUsernameChange}
                disabled={isLoading}
              />
            </div>

            <div className="input-group" style={{ position: "relative" }}>
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Password"
                required
                ref={passwordInputRef}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
              <button
                type="button"
                className="password-toggle-icon"
                onClick={togglePasswordVisibility}
                disabled={isLoading}
                tabIndex="-1"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                ) : (
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" />
                    <path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" />
                    <path d="M6.61 6.61A13.52 13.52 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" />
                    <line x1="2" y1="2" x2="22" y2="22" />
                  </svg>
                )}{" "}
              </button>
            </div>

            <button
              type="submit"
              className="submit-btn-link"
              disabled={isLoading}
            >
              {isLoading ? "Verifying..." : "Login"}
            </button>

            <p className="form-text">Restricted To Authorized Personnel Only</p>
          </form>

          <p className="developer">
            Developed by{" "}
            <a
              href="https://portfolio-frontend-mxqp.onrender.com/"
              className="developer-link"
              target="_blank"
              rel="noopener noreferrer"
            >
              Yoseph Kiros
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

export default Login;
