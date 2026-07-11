const express = require("express");
const router = express.Router();
const db = require("../config/db");
const crypto = require("crypto");

// Simple hash (no bcrypt dependency needed)
function hashPassword(password) {
  return crypto.createHash("sha256").update(password + "compliance_salt_2024").digest("hex");
}

// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ status: "error", message: "Name, email, and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ status: "error", message: "Password must be at least 6 characters" });
    }

    const existing = await db.query("SELECT id FROM users WHERE email = $1", [email.toLowerCase()]);
    if (existing.rows.length > 0) {
      return res.status(409).json({ status: "error", message: "An account with this email already exists" });
    }

    const passwordHash = hashPassword(password);
    const result = await db.query(
      "INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email, created_at",
      [name.trim(), email.toLowerCase().trim(), passwordHash]
    );

    const user = result.rows[0];
    res.status(201).json({
      status: "success",
      message: "Account created successfully",
      data: { user: { id: user.id, name: user.name, email: user.email } },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ status: "error", message: "Email and password are required" });
    }

    const result = await db.query(
      "SELECT id, name, email FROM users WHERE email = $1 AND password_hash = $2",
      [email.toLowerCase().trim(), hashPassword(password)]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ status: "error", message: "Invalid email or password" });
    }

    const user = result.rows[0];
    res.json({
      status: "success",
      message: "Login successful",
      data: { user: { id: user.id, name: user.name, email: user.email } },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

// POST /api/auth/reset-password
router.post("/reset-password", async (req, res) => {
  try {
    const { email, newPassword } = req.body;
    if (!email || !newPassword) {
      return res.status(400).json({ status: "error", message: "Email and new password are required" });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ status: "error", message: "Password must be at least 6 characters" });
    }

    const emailLower = email.toLowerCase().trim();
    const existing = await db.query("SELECT id FROM users WHERE email = $1", [emailLower]);
    
    if (existing.rows.length === 0) {
      return res.status(404).json({ status: "error", message: "User with this email not found" });
    }

    const passwordHash = hashPassword(newPassword);
    await db.query("UPDATE users SET password_hash = $1 WHERE email = $2", [passwordHash, emailLower]);

    res.json({
      status: "success",
      message: "Password updated successfully",
    });
  } catch (error) {
    console.error("Reset password error:", error);
    res.status(500).json({ status: "error", message: "Internal server error" });
  }
});

module.exports = router;
