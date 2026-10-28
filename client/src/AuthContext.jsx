
import { createContext, useContext, useState } from "react";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("fintrackUser")) || null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(
    () => localStorage.getItem("fintrackToken") || ""
  );

  function login(userData, authToken) {
    localStorage.setItem("fintrackUser", JSON.stringify(userData));
    localStorage.setItem("fintrackToken", authToken);
    setUser(userData);
    setToken(authToken);
  }

  function updateUser(userData) {
    localStorage.setItem("fintrackUser", JSON.stringify(userData));
    setUser(userData);
  }

  function logout() {
    localStorage.removeItem("fintrackUser");
    localStorage.removeItem("fintrackToken");
    setUser(null);
    setToken("");
  }

  return (
    <AuthContext.Provider
      value={{ user, token, login, logout, updateUser }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
