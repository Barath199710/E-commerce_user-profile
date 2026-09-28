import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { useToast } from "../hooks/useToast";
import { LogIn, Shield, UserCheck, KeyRound, Mail } from "lucide-react";

export const Login = ({ onSuccessRedirect }) => {
  const { login } = useAuth();
  const { showToast } = useToast();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg("Please enter both email and password.");
      return;
    }

    setSubmitting(true);
    setErrorMsg("");

    try {
      const loggedUser = await login(email, password);
      showToast(
        `Welcome back, ${loggedUser.name}! (Role: ${loggedUser.role})`,
        "success",
      );
      if (onSuccessRedirect)
        onSuccessRedirect(loggedUser.role === "admin" ? "admin" : "home");
    } catch (err) {
      const msg = err.response?.data?.error || "Invalid email or password.";
      setErrorMsg(msg);
      showToast(msg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const fillQuickCredentials = (demoEmail, demoPassword) => {
    setEmail(demoEmail);
    setPassword(demoPassword);
    setErrorMsg("");
  };

  return (
    <div style={{ maxWidth: "440px", margin: "40px auto", padding: "0 16px" }}>
      <div
        style={{
          background: "var(--card-bg)",
          borderRadius: "16px",
          boxShadow: "var(--shadow-md)",
          border: "1px solid var(--border-color)",
          padding: "32px 28px",
          transition: "var(--theme-transition)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "24px" }}>
          <div
            style={{
              width: "52px",
              height: "52px",
              borderRadius: "12px",
              background: "var(--bg-surface-elevated)",
              color: "var(--accent-primary)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "12px",
              border: "1px solid var(--border-color)",
            }}
          >
            <LogIn size={26} />
          </div>
          <h2
            style={{
              fontSize: "22px",
              fontWeight: "700",
              color: "var(--text-primary)",
              margin: "0 0 6px",
            }}
          >
            Login to your account
          </h2>
          <p
            style={{
              color: "var(--text-secondary)",
              fontSize: "14px",
              margin: 0,
            }}
          >
            Enter your credentials to continue
          </p>
        </div>

        {errorMsg && (
          <div
            style={{
              background: "rgba(239, 68, 68, 0.15)",
              border: "1px solid var(--error-color)",
              color: "var(--error-color)",
              padding: "12px 14px",
              borderRadius: "8px",
              fontSize: "14px",
              marginBottom: "20px",
            }}
          >
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Email Address
            </label>
            <div style={{ position: "relative" }}>
              <Mail
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "12px",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. user@example.com"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "var(--theme-transition)",
                }}
              />
            </div>
          </div>

          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: "600",
                color: "var(--text-secondary)",
                marginBottom: "6px",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative" }}>
              <KeyRound
                size={18}
                style={{
                  position: "absolute",
                  left: "12px",
                  top: "12px",
                  color: "var(--text-muted)",
                }}
              />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                style={{
                  width: "100%",
                  padding: "10px 12px 10px 38px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  fontSize: "14px",
                  boxSizing: "border-box",
                  transition: "var(--theme-transition)",
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "8px",
              border: "none",
              background: "var(--accent-primary)",
              color: "#ffffff",
              fontSize: "15px",
              fontWeight: "600",
              cursor: submitting ? "not-allowed" : "pointer",
              boxShadow: "var(--shadow-glow)",
              transition: "all 0.2s ease",
            }}
          >
            {submitting ? "Authenticating..." : "Sign In"}
          </button>
        </form>

        {/* Demo Quick Fill Buttons */}
        <div
          style={{
            marginTop: "24px",
            paddingTop: "20px",
            borderTop: "1px solid var(--border-color)",
          }}
        >
          <p
            style={{
              fontSize: "12px",
              color: "var(--text-muted)",
              fontWeight: "600",
              marginBottom: "10px",
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            Demo Accounts:
          </p>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "10px",
            }}
          >
            <button
              type="button"
              onClick={() =>
                fillQuickCredentials("admin@example.com", "admin123")
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface-elevated)",
                color: "var(--accent-primary)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "var(--theme-transition)",
              }}
            >
              <Shield size={14} /> Admin User
            </button>

            <button
              type="button"
              onClick={() =>
                fillQuickCredentials("user@example.com", "user123")
              }
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 10px",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                background: "var(--bg-surface-elevated)",
                color: "var(--text-primary)",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "var(--theme-transition)",
              }}
            >
              <UserCheck size={14} /> Customer User
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;
