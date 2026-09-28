import React from "react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";
import {
  Search,
  PlusCircle,
  ShoppingBag,
  ShieldCheck,
  LogOut,
  LogIn,
  UserPlus,
  Key,
  Sun,
  Moon,
  User,
} from "lucide-react";

export const Navbar = ({
  activeTab,
  setActiveTab,
  onOpenAddModal,
  searchQuery,
  setSearchQuery,
  apiCallCount,
}) => {
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const getInitials = (name) => {
    if (!name) return "U";
    const parts = name.trim().split(" ");
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  return (
    <header
      style={{
        background: "var(--navbar-bg)",
        borderBottom: "1px solid var(--border-color)",
        position: "sticky",
        top: 0,
        zIndex: 100,
        boxShadow: "var(--shadow-sm)",
        transition: "var(--theme-transition)",
      }}
    >
      <div
        style={{
          maxWidth: "1200px",
          margin: "0 auto",
          padding: "12px 24px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "16px",
        }}
      >
        {/* Brand & Logo */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            onClick={() => setActiveTab("home")}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                background: "var(--accent-gradient)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontWeight: "800",
                fontSize: "18px",
              }}
            >
              <Key size={20} />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "18px",
                  fontWeight: "800",
                  color: "var(--text-primary)",
                  margin: 0,
                  lineHeight: 1.2,
                }}
              >
                Easy Buy
              </h1>
            </div>
          </div>
        </div>

        {/* Search Input (Only visible in Products view) */}
        {activeTab === "home" && (
          <div style={{ flex: 1, maxWidth: "360px", position: "relative" }}>
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: "100%",
                padding: "8px 12px 8px 38px",
                borderRadius: "20px",
                border: "1px solid var(--border-color)",
                fontSize: "14px",
                outline: "none",
                background: "var(--bg-surface-elevated)",
                color: "var(--text-primary)",
                boxSizing: "border-box",
                transition: "var(--theme-transition)",
              }}
            />
          </div>
        )}

        {/* Navigation & Controls */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          {/* Main Navigation Tabs */}
          <button
            onClick={() => setActiveTab("home")}
            style={{
              padding: "8px 14px",
              borderRadius: "8px",
              border: "none",
              background: activeTab === "home" ? "var(--accent-primary)" : "transparent",
              color: activeTab === "home" ? "#ffffff" : "var(--text-secondary)",
              fontWeight: activeTab === "home" ? "700" : "500",
              fontSize: "14px",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              transition: "var(--theme-transition)",
            }}
          >
            <ShoppingBag size={16} /> Products
          </button>

          {isAuthenticated && (
            <>
              <button
                onClick={() => setActiveTab("my_orders")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    activeTab === "my_orders" ? "var(--accent-primary)" : "transparent",
                  color: activeTab === "my_orders" ? "#ffffff" : "var(--text-secondary)",
                  fontWeight: activeTab === "my_orders" ? "700" : "500",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "var(--theme-transition)",
                }}
              >
                My Orders
              </button>

              <button
                onClick={() => setActiveTab("profile")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background:
                    activeTab === "profile" ? "var(--accent-primary)" : "transparent",
                  color: activeTab === "profile" ? "#ffffff" : "var(--text-secondary)",
                  fontWeight: activeTab === "profile" ? "700" : "500",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "var(--theme-transition)",
                }}
              >
                <User size={16} /> My Profile
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => setActiveTab("admin")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: activeTab === "admin" ? "var(--accent-primary)" : "transparent",
                  color: activeTab === "admin" ? "#ffffff" : "var(--text-secondary)",
                  fontWeight: activeTab === "admin" ? "700" : "500",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  transition: "var(--theme-transition)",
                }}
              >
                <ShieldCheck size={16} /> Admin Orders
              </button>

              <button
                onClick={onOpenAddModal}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--accent-primary)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "14px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <PlusCircle size={16} /> Add Product
              </button>
            </>
          )}

          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
            aria-label="Toggle Dark and Light Theme"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "36px",
              height: "36px",
              borderRadius: "10px",
              border: "1px solid var(--border-color)",
              background: "var(--bg-surface-elevated)",
              color: "var(--text-primary)",
              cursor: "pointer",
              transition: "var(--theme-transition)",
              marginLeft: "4px",
            }}
          >
            {theme === "light" ? (
              <Moon size={18} style={{ color: "#475569" }} />
            ) : (
              <Sun size={18} style={{ color: "#f59e0b" }} />
            )}
          </button>

          {/* User Auth Controls */}
          {isAuthenticated ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "10px",
                marginLeft: "8px",
              }}
            >
              <div
                onClick={() => setActiveTab("profile")}
                title="Go to My Profile"
                style={{
                  background: activeTab === "profile" ? "var(--bg-surface-elevated)" : "var(--bg-surface-elevated)",
                  color: "var(--text-primary)",
                  padding: "4px 12px 4px 6px",
                  borderRadius: "24px",
                  fontSize: "13px",
                  fontWeight: "600",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  border: activeTab === "profile" ? "2px solid var(--accent-primary)" : "1px solid var(--border-color)",
                  cursor: "pointer",
                  transition: "var(--theme-transition)",
                }}
              >
                {user?.avatar_url ? (
                  <img
                    src={user.avatar_url.startsWith('/') ? user.avatar_url : `/${user.avatar_url}`}
                    alt={user?.name || "Avatar"}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      objectFit: "cover",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      background: "var(--accent-gradient)",
                      color: "#ffffff",
                      fontSize: "11px",
                      fontWeight: "700",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {getInitials(user?.name)}
                  </div>
                )}
                <span>{user?.name}</span>
                <span
                  style={{
                    fontSize: "10px",
                    textTransform: "uppercase",
                    padding: "2px 6px",
                    borderRadius: "10px",
                    background: user?.role === "admin" ? "var(--accent-primary)" : "var(--text-muted)",
                    color: "#ffffff",
                    fontWeight: "700",
                  }}
                >
                  {user?.role}
                </span>
              </div>

              <button
                onClick={() => {
                  logout();
                  setActiveTab("login");
                }}
                title="Logout"
                style={{
                  padding: "8px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: "var(--bg-surface-elevated)",
                  color: "var(--error-color)",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <LogOut size={16} />
              </button>
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginLeft: "8px",
              }}
            >
              <button
                onClick={() => setActiveTab("login")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--border-color)",
                  background: activeTab === "login" ? "var(--bg-surface-elevated)" : "transparent",
                  color: "var(--text-primary)",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <LogIn size={15} /> Login
              </button>

              <button
                onClick={() => setActiveTab("register")}
                style={{
                  padding: "8px 14px",
                  borderRadius: "8px",
                  border: "none",
                  background: "var(--accent-primary)",
                  color: "#ffffff",
                  fontWeight: "600",
                  fontSize: "13px",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                }}
              >
                <UserPlus size={15} /> Register
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
