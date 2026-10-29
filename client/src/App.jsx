
import { useEffect, useState } from "react";
import { useAuth } from "./AuthContext.jsx";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const API_URL = `${import.meta.env.VITE_API_URL}/api/transactions`;
const AUTH_URL = `${import.meta.env.VITE_API_URL}/api/auth`;

const inputClass =
  "mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:ring-4 focus:ring-violet-100";

const primaryButton =
  "inline-flex items-center justify-center rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-violet-200 transition hover:-translate-y-0.5 hover:shadow-xl disabled:cursor-not-allowed disabled:opacity-60";

function App() {
  const {
    token,
    user,
    login,
    logout: contextLogout,
    updateUser,
  } = useAuth();

  const [page, setPage] = useState("dashboard");
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  const [authMode, setAuthMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState("expense");
  const [category, setCategory] = useState("Food");

const [filterType, setFilterType] = useState("all");
const [filterCategory, setFilterCategory] = useState("all");
const [filterStartDate, setFilterStartDate] = useState("");
const [filterEndDate, setFilterEndDate] = useState("");

  const [profileName, setProfileName] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  function showMessage(text, messageKind = "success") {
    setMessage(text);
    setMessageType(messageKind);
  }

  function clearMessage() {
    setMessage("");
  }

  function logout() {
    contextLogout();
    setTransactions([]);
    setPage("dashboard");
    setPassword("");
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    showMessage("You have been logged out.");
  }

  async function loadTransactions() {
    if (!token) return;

    setLoading(true);

    try {
      const response = await fetch(API_URL, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          logout();
          showMessage(
            "Your session expired. Please log in again.",
            "error"
          );
          return;
        }

        throw new Error(data.message || "Could not load transactions.");
      }

      setTransactions(
        Array.isArray(data) ? data : data.transactions || []
      );
    } catch (error) {
      showMessage(
        error.message || "Could not connect to the server.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (token) {
      loadTransactions();
    } else {
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  async function handleAuth(event) {
    event.preventDefault();
    clearMessage();

    const endpoint =
      authMode === "login"
        ? `${AUTH_URL}/login`
        : `${AUTH_URL}/register`;

    const body =
      authMode === "login"
        ? { email: email.trim(), password }
        : { name: name.trim(), email: email.trim(), password };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Authentication failed.");
      }

      if (authMode === "register") {
        setAuthMode("login");
        setPassword("");
        showMessage("Account created successfully. Please log in.");
        return;
      }

      if (!data.token || !data.user) {
        throw new Error("The server did not return valid login details.");
      }

      login(data.user, data.token);
      setPassword("");
      setPage("dashboard");

      showMessage(
        `Welcome${data.user?.name ? `, ${data.user.name}` : ""}!`
      );
    } catch (error) {
      showMessage(
        error.message || "Could not connect to the server.",
        "error"
      );
    }
  }

  async function addTransaction(event) {
    event.preventDefault();
    clearMessage();

    const numericAmount = Number(amount);

    if (!description.trim()) {
      showMessage("Please enter a transaction description.", "error");
      return;
    }

    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      showMessage("Please enter an amount greater than zero.", "error");
      return;
    }

    try {
      const now = new Date();
      const transactionDate = [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
      ].join("-");

      const response = await fetch(API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: description.trim(),
          description: description.trim(),
          amount: numericAmount,
          type: type.charAt(0).toUpperCase() + type.slice(1).toLowerCase(),
          category,
          date: transactionDate,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add transaction.");
      }

      setDescription("");
      setAmount("");
      setType("expense");
      setCategory("Food");

      await loadTransactions();
      showMessage("Transaction added successfully.");
    } catch (error) {
      showMessage(
        error.message || "Could not add transaction.",
        "error"
      );
    }
  }

  async function deleteTransaction(id) {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    clearMessage();

    try {
      const response = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.message || "Could not delete transaction.");
      }

      await loadTransactions();
      showMessage("Transaction deleted successfully.");
    } catch (error) {
      showMessage(
        error.message || "Could not delete transaction.",
        "error"
      );
    }
  }

  async function openProfile() {
    clearMessage();

    try {
      const response = await fetch(`${AUTH_URL}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not load your profile.");
      }

      const profile = data.user || data;

      updateUser(profile);
      setProfileName(profile.name || "");
      setPage("profile");
    } catch (error) {
      showMessage(
        error.message || "Could not load your profile.",
        "error"
      );
    }
  }

  async function updateName(event) {
    event.preventDefault();
    clearMessage();

    const trimmedName = profileName.trim();

    if (!/^[A-Za-z]+(?:[ '-][A-Za-z]+)*$/.test(trimmedName)) {
      showMessage("Please enter a valid name.", "error");
      return;
    }

    try {
      const response = await fetch(`${AUTH_URL}/profile/name`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: trimmedName }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not update your name.");
      }

      const updatedUser = data.user || data;

      updateUser(updatedUser);
      setProfileName(updatedUser.name || trimmedName);

      showMessage("Your name was updated successfully.");
    } catch (error) {
      showMessage(
        error.message || "Could not update your name.",
        "error"
      );
    }
  }

  async function updatePassword(event) {
    event.preventDefault();
    clearMessage();

    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage("Please fill in all password fields.", "error");
      return;
    }

    if (newPassword.length < 8 || newPassword.length > 72) {
      showMessage("The new password must contain 8–72 characters.", "error");
      return;
    }

    if (newPassword !== confirmPassword) {
      showMessage("The new passwords do not match.", "error");
      return;
    }

    if (currentPassword === newPassword) {
      showMessage(
        "Choose a new password different from your current one.",
        "error"
      );
      return;
    }

    try {
      const response = await fetch(`${AUTH_URL}/profile/password`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not change your password.");
      }

      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");

      showMessage("Password changed successfully.");
      setPage("dashboard");
    } catch (error) {
      showMessage(
        error.message || "Could not change your password.",
        "error"
      );
    }
  }

  function openChangePassword() {
    clearMessage();
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPage("change-password");
  }

  const totalIncome = transactions
    .filter((item) => String(item.type).toLowerCase() === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenses = transactions
    .filter((item) => String(item.type).toLowerCase() === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const balance = totalIncome - totalExpenses;
  const displayName = user?.name || user?.full_name || "My Account";

  const initials =
    displayName
      .split(" ")
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "U";

  const sortedTransactions = [...transactions].sort((a, b) => {
    const dateA = new Date(a.created_at || a.date || 0).getTime();
    const dateB = new Date(b.created_at || b.date || 0).getTime();
    return dateB - dateA;
  });

  // Day 7: Filter transactions by type, category, and date
const filteredTransactions = sortedTransactions.filter((transaction) => {
  const transactionType = String(transaction.type || "").toLowerCase();

  const matchesType =
    filterType === "all" ||
    transactionType === filterType.toLowerCase();

  const transactionCategory = String(
    transaction.category || "Other"
  ).toLowerCase();

  const matchesCategory =
    filterCategory === "all" ||
    transactionCategory === filterCategory.toLowerCase();

  const rawDate = transaction.date || transaction.created_at;
  const transactionDate = rawDate ? String(rawDate).slice(0, 10) : "";

  const matchesStartDate =
    !filterStartDate ||
    (transactionDate && transactionDate >= filterStartDate);

  const matchesEndDate =
    !filterEndDate ||
    (transactionDate && transactionDate <= filterEndDate);

  return (
    matchesType &&
    matchesCategory &&
    matchesStartDate &&
    matchesEndDate
  );
});


const expenseCategoryData = Object.values(
  filteredTransactions
    .filter(
      (transaction) =>
        String(transaction.type || "").toLowerCase() === "expense"
    )
    .reduce((categories, transaction) => {
      const category = transaction.category || "Other";
      const amount = Number(transaction.amount || 0);

      if (!categories[category]) {
        categories[category] = {
          name: category,
          value: 0,
        };
      }

      categories[category].value += amount;
      return categories;
    }, {})
);

// Day 9: Prepare monthly income and expense data
const monthlyChartData = Object.values(
  transactions.reduce((months, transaction) => {
    const rawDate = transaction.date || transaction.created_at;

    if (!rawDate) {
      return months;
    }

    const date = new Date(rawDate);

    if (Number.isNaN(date.getTime())) {
      return months;
    }

    const monthKey = `${date.getFullYear()}-${String(
      date.getMonth() + 1
    ).padStart(2, "0")}`;

    const monthName = date.toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });

    if (!months[monthKey]) {
      months[monthKey] = {
        monthKey,
        month: monthName,
        income: 0,
        expenses: 0,
      };
    }

    const type = String(transaction.type || "").toLowerCase();
    const amount = Number(transaction.amount || 0);

    if (type === "income") {
      months[monthKey].income += amount;
    } else if (type === "expense") {
      months[monthKey].expenses += amount;
    }

    return months;
  }, {})
).sort((a, b) => a.monthKey.localeCompare(b.monthKey));

  function formatCurrency(value) {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  }

  return (
    <div className="min-h-screen bg-[#f6f5ff] text-slate-800">
      <header className="relative overflow-hidden bg-gradient-to-r from-violet-800 via-indigo-700 to-blue-700 text-white">
        <div className="pointer-events-none absolute -right-20 -top-32 h-80 w-80 rounded-full bg-white/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-64 w-64 rounded-full bg-fuchsia-400/20 blur-3xl" />

        <div className="relative mx-auto flex max-w-[1600px] flex-col gap-5 px-4 py-6 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
          <button
            type="button"
            onClick={() => {
              setPage("dashboard");
              clearMessage();
            }}
            className="flex items-center gap-3 text-left"
          >
            <span className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-2xl font-black shadow-lg backdrop-blur">
              F
            </span>
            <span>
              <span className="block text-2xl font-black tracking-tight">
                FinTrack
              </span>
              <span className="mt-1 block text-sm text-indigo-100">
                Personal Finance, Made Simple
              </span>
            </span>
          </button>

          {token && (
            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={openProfile}
                className="flex min-w-0 items-center gap-3 rounded-2xl border border-white/20 bg-white/10 px-3 py-2.5 text-left backdrop-blur transition hover:bg-white/20"
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-sm font-extrabold text-indigo-700">
                  {initials}
                </span>
                <span className="min-w-0">
                  <span className="block text-xs text-indigo-100">
                    Welcome back
                  </span>
                  <span className="block max-w-40 truncate text-sm font-bold">
                    {displayName}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={logout}
                className="rounded-xl border border-white/30 px-4 py-3 text-sm font-bold transition hover:bg-white/10"
              >
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      {message && (
        <div className="mx-auto max-w-[1600px] px-4 pt-5 sm:px-6 lg:px-8">
          <div
            role="status"
            className={`flex items-start justify-between gap-3 rounded-2xl border px-4 py-3 text-sm font-medium shadow-sm ${
              messageType === "error"
                ? "border-rose-200 bg-rose-50 text-rose-700"
                : "border-emerald-200 bg-emerald-50 text-emerald-700"
            }`}
          >
            <span>{message}</span>
            <button
              type="button"
              onClick={clearMessage}
              className="font-bold"
              aria-label="Dismiss message"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {!token ? (
        <main className="flex min-h-[78vh] items-center justify-center px-4 py-12">
          <section className="w-full max-w-md overflow-hidden rounded-[2rem] border border-white bg-white shadow-2xl shadow-violet-200/60">
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-700 via-indigo-600 to-blue-600 px-7 py-10 text-center text-white">
              <div className="absolute -right-10 -top-12 h-40 w-40 rounded-full bg-white/10" />
              <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-white/20 bg-white/15 text-3xl shadow-lg">
                💰
              </div>
              <h2 className="relative mt-5 text-3xl font-black">
                {authMode === "login" ? "Welcome back!" : "Join FinTrack"}
              </h2>
              <p className="relative mt-2 text-sm text-indigo-100">
                {authMode === "login"
                  ? "Your financial journey continues here."
                  : "Start building better money habits today."}
              </p>
            </div>

            <div className="p-7 sm:p-9">
              <form onSubmit={handleAuth} className="space-y-5">
                {authMode === "register" && (
                  <label className="block text-sm font-bold text-slate-700">
                    Full name
                    <input
                      className={inputClass}
                      type="text"
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="Enter your name"
                      autoComplete="name"
                      required
                    />
                  </label>
                )}

                <label className="block text-sm font-bold text-slate-700">
                  Email address
                  <input
                    className={inputClass}
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    autoComplete="email"
                    required
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Password
                  <input
                    className={inputClass}
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                    autoComplete={
                      authMode === "login"
                        ? "current-password"
                        : "new-password"
                    }
                    minLength={8}
                    maxLength={72}
                    required
                  />
                </label>

                <button type="submit" className={`${primaryButton} w-full`}>
                  {authMode === "login"
                    ? "Log In to FinTrack →"
                    : "Create My Account →"}
                </button>
              </form>

              <p className="mt-7 text-center text-sm text-slate-500">
                {authMode === "login"
                  ? "New to FinTrack?"
                  : "Already have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode(authMode === "login" ? "register" : "login");
                    clearMessage();
                  }}
                  className="font-extrabold text-violet-700 hover:text-indigo-800"
                >
                  {authMode === "login" ? "Create account" : "Log in"}
                </button>
              </p>
            </div>
          </section>
        </main>
      ) : page === "profile" ? (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-8 sm:px-6 lg:px-8">
          <PageHeading
            eyebrow="ACCOUNT SETTINGS"
            title="My Profile"
            subtitle="Manage your personal information and account security."
            onBack={() => setPage("dashboard")}
          />

          <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
            <section className="rounded-3xl border border-white bg-white p-6 shadow-lg shadow-violet-100/60 sm:p-8 xl:col-span-2">
              <div className="mb-7 flex items-center gap-4">
                <Avatar initials={initials} size="large" />
                <div>
                  <h3 className="text-xl font-extrabold text-slate-900">
                    Personal Information
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Update your account details.
                  </p>
                </div>
              </div>

              <form onSubmit={updateName} className="space-y-5">
                <label className="block text-sm font-bold text-slate-700">
                  Full name
                  <input
                    className={inputClass}
                    value={profileName}
                    onChange={(event) => setProfileName(event.target.value)}
                    required
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Email address
                  <input
                    className={`${inputClass} cursor-not-allowed bg-slate-50`}
                    value={user?.email || ""}
                    readOnly
                  />
                  <span className="mt-1 block text-xs font-normal text-slate-500">
                    Your email address cannot be changed here.
                  </span>
                </label>

                <button type="submit" className={primaryButton}>
                  Save Changes
                </button>
              </form>
            </section>

            <section className="rounded-3xl border border-white bg-gradient-to-br from-amber-50 via-white to-orange-50 p-6 shadow-lg shadow-amber-100/60">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-2xl text-white shadow-lg">
                🔐
              </div>
              <h3 className="mt-5 text-xl font-extrabold text-slate-900">
                Account Security
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Protect your personal information by keeping your password
                secure and updated.
              </p>
              <button
                type="button"
                onClick={openChangePassword}
                className={`${primaryButton} mt-6 w-full`}
              >
                Change Password
              </button>
            </section>
          </div>
        </main>
      ) : page === "change-password" ? (
        <main className="flex w-full justify-center px-4 py-8 sm:px-6 lg:px-8">
          <section className="h-fit w-full max-w-xl rounded-3xl border border-white bg-white p-6 shadow-xl shadow-violet-100/70 sm:p-9">
            <button
              type="button"
              onClick={() => setPage("dashboard")}
              className="mb-7 text-sm font-bold text-violet-700 hover:text-indigo-800"
            >
              ← Back to Dashboard
            </button>

            <div className="mb-7">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-2xl text-white shadow-lg">
                🔒
              </div>
              <h2 className="mt-5 text-2xl font-black text-slate-900">
                Change Password
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Enter your current password and choose a new password.
              </p>
            </div>

            <form onSubmit={updatePassword} className="space-y-5">
              <label className="block text-sm font-bold text-slate-700">
                Current password
                <input
                  className={inputClass}
                  type="password"
                  value={currentPassword}
                  onChange={(event) => setCurrentPassword(event.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>

              <label className="block text-sm font-bold text-slate-700">
                New password
                <input
                  className={inputClass}
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
                <span className="mt-1 block text-xs font-normal text-slate-500">
                  Use 8–72 characters.
                </span>
              </label>

              <label className="block text-sm font-bold text-slate-700">
                Confirm new password
                <input
                  className={inputClass}
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  maxLength={72}
                  required
                />
              </label>

              <div className="flex flex-col gap-3 pt-2 sm:flex-row">
                <button type="submit" className={`${primaryButton} flex-1`}>
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => setPage("dashboard")}
                  className="rounded-xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </section>
        </main>
      ) : (
        <main className="mx-auto w-full max-w-[1600px] px-4 py-7 sm:px-6 lg:px-8">
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-700">
                YOUR FINANCIAL SPACE
              </p>
              <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900 sm:text-4xl">
                Dashboard{" "}
                <span className="bg-gradient-to-r from-violet-600 via-indigo-600 to-blue-600 bg-clip-text text-transparent">
                  Overview
                </span>
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
                Here is your financial snapshot. Keep track of what comes in
                and what goes out.
              </p>
            </div>

            <div className="flex w-fit items-center gap-2 rounded-full border border-emerald-100 bg-white px-4 py-2 shadow-sm">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
              <span className="text-xs font-bold text-slate-600">
                Your account is active
              </span>
            </div>
          </div>

          <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            <SummaryCard
              title="Total Income"
              amount={formatCurrency(totalIncome)}
              icon="↗"
              theme="income"
            />
            <SummaryCard
              title="Total Expenses"
              amount={formatCurrency(totalExpenses)}
              icon="↘"
              theme="expense"
            />
            <SummaryCard
              title="Current Balance"
              amount={formatCurrency(balance)}
              icon="₹"
              theme={balance >= 0 ? "balance" : "negative"}
            />
          </section>
{/* Day 8–9: Expense Pie Chart and Monthly Bar Chart */}
<div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
  {/* Left half: Expense Pie Chart */}
  <section className="rounded-3xl border border-white bg-white p-6 shadow-lg shadow-violet-100/50">
    <h3 className="text-lg font-extrabold text-slate-900">
      Expenses by Category
    </h3>
    <p className="mt-1 text-sm text-slate-500">
      Category-wise breakdown of your expenses
    </p>

    {expenseCategoryData.length === 0 ? (
      <div className="flex h-72 items-center justify-center text-sm text-slate-500">
        No expense data available yet.
      </div>
    ) : (
      <div className="mt-4 h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={expenseCategoryData}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              outerRadius={90}
              label={({ name, percent }) =>
                `${name} ${(percent * 100).toFixed(0)}%`
              }
            >
              {expenseCategoryData.map((entry, index) => (
                <Cell
                  key={`expense-${entry.name}`}
                  fill={[
                    "#8b5cf6",
                    "#6366f1",
                    "#ec4899",
                    "#f59e0b",
                    "#10b981",
                    "#06b6d4",
                    "#f97316",
                  ][index % 7]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) =>
                `₹${Number(value).toLocaleString("en-IN")}`
              }
            />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
    )}
  </section>

  {/* Right half: Monthly Bar Chart — added in the next step */}
  <section className="rounded-3xl border border-white bg-white p-6 shadow-lg shadow-violet-100/50">
    <h3 className="text-lg font-extrabold text-slate-900">
      Monthly Income vs Expenses
    </h3>
    <p className="mt-1 text-sm text-slate-500">
      Compare income and expenses month by month
    </p>

    {monthlyChartData.length === 0 ? (
  <div className="flex h-72 items-center justify-center text-sm text-slate-500">
    No monthly transaction data available yet.
  </div>
) : (
  <div className="mt-4 h-72 w-full">
    <ResponsiveContainer width="100%" height="100%">
      <BarChart
        data={monthlyChartData}
        margin={{ top: 10, right: 10, left: 5, bottom: 5 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 11 }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickFormatter={(value) => `₹${value}`}
        />
        <Tooltip
          formatter={(value, name) => [
            `₹${Number(value).toLocaleString("en-IN")}`,
            name === "income" ? "Income" : "Expenses",
          ]}
        />
        <Legend />
        <Bar
          dataKey="income"
          name="Income"
          fill="#8b5cf6"
          radius={[5, 5, 0, 0]}
        />
        <Bar
          dataKey="expenses"
          name="Expenses"
          fill="#f59e0b"
          radius={[5, 5, 0, 0]}
        />
      </BarChart>
    </ResponsiveContainer>
  </div>
)}
  </section>
</div>
          <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
            <section className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-violet-100/50 xl:col-span-4">
              <div className="bg-gradient-to-r from-violet-700 to-indigo-600 px-6 py-5 text-white">
                <div className="flex items-center gap-3">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/15 text-xl">
                    +
                  </div>
                  <div>
                    <h3 className="text-lg font-extrabold">Add Transaction</h3>
                    <p className="mt-1 text-xs text-indigo-100">
                      Record your money activity
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={addTransaction} className="space-y-4 p-5 sm:p-6">
                <label className="block text-sm font-bold text-slate-700">
                  Description
                  <input
                    className={inputClass}
                    type="text"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    placeholder="e.g. Monthly salary"
                    required
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Amount (₹)
                  <input
                    className={inputClass}
                    type="number"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    placeholder="Enter amount"
                    min="0.01"
                    step="0.01"
                    required
                  />
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Transaction type
                  <select
                    className={inputClass}
                    value={type}
                    onChange={(event) => setType(event.target.value)}
                  >
                    <option value="expense">Expense</option>
                    <option value="income">Income</option>
                  </select>
                </label>

                <label className="block text-sm font-bold text-slate-700">
                  Category
                  <select
                    className={inputClass}
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="Food">Food</option>
                    <option value="Travel">Travel</option>
                    <option value="Shopping">Shopping</option>
                    <option value="Bills">Bills</option>
                    <option value="Education">Education</option>
                    <option value="Health">Health</option>
                    <option value="Salary">Salary</option>
                    <option value="Business">Business</option>
                    <option value="Entertainment">Entertainment</option>
                    <option value="Other">Other</option>
                  </select>
                </label>

                <button type="submit" className={`${primaryButton} w-full`}>
                  + Add Transaction
                </button>

                <p className="pt-1 text-center text-xs text-slate-400">
                  Your transactions are saved to your account.
                </p>
              </form>
            </section>

<section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900 xl:col-span-5">
  <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
    <div>
      <h2 className="text-xl font-bold text-slate-900 dark:text-white">
        Recent Transactions
      </h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        Your latest income and expenses.
      </p>
    </div>

    <span className="rounded-full bg-slate-100 px-3 py-1 text-sm font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
      {filteredTransactions.length} records
    </span>
  </div>

  {/* Day 7: Transaction filters */}
  <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Transaction Type
      </label>
      <select
        value={filterType}
        onChange={(e) => setFilterType(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="all">All Types</option>
        <option value="income">Income</option>
        <option value="expense">Expense</option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        Category
      </label>
      <select
        value={filterCategory}
        onChange={(e) => setFilterCategory(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      >
        <option value="all">All Categories</option>
        <option value="food">Food</option>
        <option value="travel">Travel</option>
        <option value="shopping">Shopping</option>
        <option value="bills">Bills</option>
        <option value="education">Education</option>
        <option value="health">Health</option>
        <option value="salary">Salary</option>
        <option value="business">Business</option>
        <option value="entertainment">Entertainment</option>
        <option value="other">Other</option>
      </select>
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        From Date
      </label>
      <input
        type="date"
        value={filterStartDate}
        onChange={(e) => setFilterStartDate(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>

    <div>
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-300">
        To Date
      </label>
      <input
        type="date"
        value={filterEndDate}
        min={filterStartDate || undefined}
        onChange={(e) => setFilterEndDate(e.target.value)}
        className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-800 outline-none focus:border-indigo-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
      />
    </div>
  </div>

  <div className="mb-5 flex flex-wrap items-center gap-3">
    <button
      type="button"
      onClick={() => {
        setFilterType("all");
        setFilterCategory("all");
        setFilterStartDate("");
        setFilterEndDate("");
      }}
      className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
    >
      Clear Filters
    </button>

    <span className="text-sm text-slate-500 dark:text-slate-400">
      Showing {filteredTransactions.length} of {transactions.length} transactions
    </span>
  </div>

  {/* Transaction list */}
  <div className="space-y-3">
    {loading ? (
      <p className="py-6 text-center text-sm text-slate-500 dark:text-slate-400">
        Loading transactions...
      </p>
    ) : filteredTransactions.length === 0 ? (
      <p className="rounded-xl bg-slate-50 px-4 py-8 text-center text-sm text-slate-500 dark:bg-slate-800 dark:text-slate-400">
        {transactions.length === 0
          ? "No transactions yet. Add your first income or expense."
          : "No transactions match your filters. Try changing or clearing them."}
      </p>
    ) : (
      filteredTransactions.map((transaction) => {
        const isIncome =
          String(transaction.type || "").toLowerCase() === "income";

        const transactionDate =
          transaction.date || transaction.created_at;

        const formattedDate = transactionDate
          ? new Date(
              `${String(transactionDate).slice(0, 10)}T12:00:00`
            ).toLocaleDateString("en-IN")
          : "Date unavailable";

        return (
          <div
            key={transaction.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 p-3 dark:border-slate-800"
          >
            <div className="flex min-w-0 items-center gap-3">
              <div
                className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-lg font-bold ${
                  isIncome
                    ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/40 dark:text-emerald-300"
                    : "bg-rose-100 text-rose-600 dark:bg-rose-900/40 dark:text-rose-300"
                }`}
              >
                {isIncome ? "↗" : "↘"}
              </div>

              <div className="min-w-0">
                <p className="break-words font-semibold text-slate-900 dark:text-white">
                  {transaction.title ||
                    transaction.description ||
                    transaction.category ||
                    "Transaction"}
                </p>

                <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                  {transaction.category || "Other"} · {formattedDate}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span
                className={`whitespace-nowrap text-sm font-bold ${
                  isIncome
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-rose-600 dark:text-rose-400"
                }`}
              >
                {isIncome ? "+" : "−"}
                {formatCurrency(Number(transaction.amount) || 0)}
              </span>

              <button
                type="button"
                onClick={() => deleteTransaction(transaction.id)}
                className="rounded-lg px-2 py-1 text-xs font-semibold text-rose-600 transition hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                Delete
              </button>
            </div>
          </div>
        );
      })
    )}
  </div>
</section>

            <aside className="space-y-5 xl:col-span-3">
              <section className="overflow-hidden rounded-3xl border border-white bg-white shadow-lg shadow-violet-100/50">
                <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white">
                  <div className="flex items-center gap-4">
                    <Avatar initials={initials} size="large" light />
                    <div className="min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wider text-violet-100">
                        Your Account
                      </p>
                      <h3 className="mt-1 break-words text-lg font-extrabold">
                        {displayName}
                      </h3>
                      <p className="mt-1 break-all text-xs text-violet-100">
                        {user?.email || ""}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  <button
                    type="button"
                    onClick={openProfile}
                    className="w-full rounded-xl border border-violet-100 bg-violet-50 px-4 py-3 text-sm font-bold text-violet-800 transition hover:bg-violet-100"
                  >
                    ✎ Edit Profile
                  </button>

                  <button
                    type="button"
                    onClick={openChangePassword}
                    className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
                  >
                    🔒 Change Password
                  </button>

                  <button
                    type="button"
                    onClick={logout}
                    className="w-full rounded-xl border border-rose-100 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 transition hover:bg-rose-100"
                  >
                    Log Out
                  </button>
                </div>
              </section>

              <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-amber-300 via-orange-300 to-rose-300 p-6 text-slate-900 shadow-lg shadow-orange-100">
                <div className="absolute -right-8 -top-8 h-28 w-28 rounded-full bg-white/30" />
                <div className="relative">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/60 text-2xl shadow-sm">
                    💡
                  </div>
                  <h3 className="mt-4 text-lg font-black">Money Tip</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">
                    Track your daily spending and review your expenses
                    regularly to stay in control of your budget.
                  </p>
                </div>
              </section>
            </aside>
          </div>

          <footer className="mt-10 border-t border-violet-100 py-6 text-center text-xs text-slate-400">
            <p className="font-bold text-slate-500">
              FinTrack · Personal Finance Tracker
            </p>
            <p className="mt-1">
              Small steps today. Better finances tomorrow.
            </p>
          </footer>
        </main>
      )}
    </div>
  );
}

function Avatar({ initials, size = "normal", light = false }) {
  const sizeClass =
    size === "large" ? "h-14 w-14 text-lg" : "h-10 w-10 text-sm";

  return (
    <div
      className={`flex shrink-0 items-center justify-center rounded-2xl font-black ${
        light
          ? "border border-white/30 bg-white/20 text-white"
          : "bg-gradient-to-br from-violet-100 to-indigo-100 text-violet-800"
      } ${sizeClass}`}
    >
      {initials}
    </div>
  );
}

function PageHeading({ eyebrow, title, subtitle, onBack }) {
  return (
    <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
      <div>
        <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-violet-700">
          {eyebrow}
        </p>
        <h2 className="mt-2 text-3xl font-black tracking-tight text-slate-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
      </div>

      <button
        type="button"
        onClick={onBack}
        className="rounded-xl border border-violet-100 bg-white px-4 py-3 text-sm font-bold text-violet-800 shadow-sm transition hover:bg-violet-50"
      >
        ← Back to Dashboard
      </button>
    </div>
  );
}

function SummaryCard({ title, amount, icon, theme }) {
  const styles = {
    income: {
      card: "from-emerald-500 via-green-500 to-teal-600",
      icon: "bg-white/20 text-white",
      label: "Total money received",
      badge: "INCOME",
      progress: "w-full",
    },
    expense: {
      card: "from-rose-500 via-pink-500 to-fuchsia-600",
      icon: "bg-white/20 text-white",
      label: "Total money spent",
      badge: "EXPENSES",
      progress: "w-3/4",
    },
    balance: {
  card: "from-violet-600 via-indigo-600 to-blue-700",
  icon: "bg-white/20 text-white",
  label: "Income minus expenses",
  badge: "BALANCE",
  progress: "w-5/6",
},
    negative: {
      card: "from-orange-500 via-rose-500 to-red-600",
      icon: "bg-white/20 text-white",
      label: "Expenses exceed income",
      badge: "BALANCE",
      progress: "w-1/3",
    },
  };

  const style = styles[theme] || styles.balance;

  return (
    <article
      className={`group relative isolate overflow-hidden rounded-3xl bg-gradient-to-br ${style.card} p-6 text-white shadow-xl shadow-violet-100/60 transition duration-300 hover:-translate-y-1 hover:shadow-2xl`}
    >
      <div className="pointer-events-none absolute -right-10 -top-12 -z-10 h-40 w-40 rounded-full border-[24px] border-white/10 transition-transform duration-500 group-hover:scale-125" />
      <div className="pointer-events-none absolute -bottom-14 right-20 -z-10 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-white/85">{title}</p>
          <p className="mt-5 break-words text-2xl font-black tracking-tight sm:text-3xl">
            {amount}
          </p>
          <p className="mt-3 text-xs font-medium text-white/75">
            {style.label}
          </p>
        </div>

        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-lg backdrop-blur ${style.icon}`}
        >
          {icon}
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-[10px] font-extrabold tracking-[0.16em]">
          {style.badge}
        </span>
        <span className="text-xl font-bold text-white/70">↗</span>
      </div>

      <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/20">
        <div
          className={`h-full rounded-full bg-white/90 ${style.progress}`}
        />
      </div>
    </article>
  );
}

export default App;
