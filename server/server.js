
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const pool = require("./db");
const authenticateToken = require("./middleware/auth");

const app = express();
const PORT = process.env.PORT || 5000;


app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "http://localhost:4173",
      "https://personal-finance-tracker-xi-tawny.vercel.app"
    ],
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"]
  })
);

app.use(express.json());

// Authentication routes
app.use("/api/auth", require("./routes/auth"));

// Home route
app.get("/", (req, res) => {
  res.send("FinTrack backend is running!");
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({
    success: true,
    message: "FinTrack API is working correctly",
  });
});

// Get logged-in user's transactions
app.get("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, amount, type, category,
              transaction_date AS date
       FROM transactions
       WHERE user_id = $1
       ORDER BY transaction_date DESC, id DESC`,
      [req.userId]
    );

    const transactions = result.rows.map((item) => ({
      ...item,
      description: item.title,
      amount: Number(item.amount),
      type: String(item.type).toLowerCase(),
    }));

    res.json(transactions);
  } catch (error) {
    console.error("Get transactions error:", error.message);

    res.status(500).json({
      message: "Failed to fetch transactions",
    });
  }
});

// Add a transaction
app.post("/api/transactions", authenticateToken, async (req, res) => {
  try {
    const { amount, category, date } = req.body;

    // Accept either title or description
    const title = req.body.title ?? req.body.description;

    // Normalize transaction type
    const rawType = req.body.type;
    let type = null;

    if (typeof rawType === "string") {
      const normalizedType = rawType.trim().toLowerCase();

      if (normalizedType === "income") {
        type = "Income";
      } else if (normalizedType === "expense") {
        type = "Expense";
      }
    }

    // Validate the date in YYYY-MM-DD format
    let validDate = false;

    if (
      typeof date === "string" &&
      /^\d{4}-\d{2}-\d{2}$/.test(date)
    ) {
      const parsedDate = new Date(`${date}T00:00:00.000Z`);

      validDate =
        !Number.isNaN(parsedDate.getTime()) &&
        parsedDate.toISOString().slice(0, 10) === date;
    }

    // Collect validation errors
    const errors = [];

    if (typeof title !== "string" || !title.trim()) {
      errors.push("title/description is missing");
    }

    if (
      amount === null ||
      amount === undefined ||
      amount === "" ||
      !Number.isFinite(Number(amount)) ||
      Number(amount) <= 0
    ) {
      errors.push("amount is invalid");
    }

    if (!type) {
      errors.push("type must be income or expense");
    }

    if (typeof category !== "string" || !category.trim()) {
      errors.push("category is missing");
    }

    if (!validDate) {
      errors.push("date is missing or invalid");
    }

    // Print details to the backend terminal
    console.log("Transaction request:", {
      title,
      amount,
      originalType: rawType,
      normalizedType: type,
      category,
      date,
    });

    if (errors.length > 0) {
      console.log("Transaction validation errors:", errors);

      return res.status(400).json({
        message: "Please provide valid transaction details",
        errors,
      });
    }

    // Save transaction for the logged-in user
    const result = await pool.query(
      `INSERT INTO transactions
       (user_id, title, amount, type, category, transaction_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, title, amount, type, category,
                 transaction_date AS date`,
      [
        req.userId,
        title.trim(),
        Number(amount),
        type,
        category.trim(),
        date,
      ]
    );

    const savedTransaction = result.rows[0];

    res.status(201).json({
      ...savedTransaction,
      description: savedTransaction.title,
      amount: Number(savedTransaction.amount),
      type: String(savedTransaction.type).toLowerCase(),
    });
  } catch (error) {
    console.error("Add transaction error:", error.message);

    res.status(500).json({
      message: "Failed to save transaction",
    });
  }
});

// Delete only the logged-in user's transaction
app.delete(
  "/api/transactions/:id",
  authenticateToken,
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({
          message: "Invalid transaction ID",
        });
      }

      const result = await pool.query(
        `DELETE FROM transactions
         WHERE id = $1 AND user_id = $2
         RETURNING id`,
        [id, req.userId]
      );

      if (result.rowCount === 0) {
        return res.status(404).json({
          message: "Transaction not found",
        });
      }

      res.json({
        success: true,
        message: "Transaction deleted successfully",
      });
    } catch (error) {
      console.error("Delete transaction error:", error.message);

      res.status(500).json({
        message: "Failed to delete transaction",
      });
    }
  }
);

// Start server
app.listen(PORT, () => {
  console.log(`FinTrack backend running at http://localhost:${PORT}`);
});
