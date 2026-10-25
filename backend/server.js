
const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { rateLimit } = require("express-rate-limit");
const { randomBytes, scryptSync, timingSafeEqual } = require("crypto");

const app = express();
const PORT = 5050;

app.use(helmet());

app.use(
  cors({
    origin: "http://localhost:5173",
    methods: ["GET", "POST"],
    allowedHeaders: ["Content-Type"],
  })
);

app.use(express.json({ limit: "10kb" }));

function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${hash}`;
}

function verifyPassword(password, storedHash) {
  try {
    const [salt, key] = storedHash.split(":");
    const savedHash = Buffer.from(key, "hex");
    const submittedHash = scryptSync(password, salt, 64);

    return (
      savedHash.length === submittedHash.length &&
      timingSafeEqual(savedHash, submittedHash)
    );
  } catch {
    return false;
  }
}

// In-memory account store: reset when the server restarts.
const users = new Map();

// Existing demo credentials.
const demoEmail = "demo@inertia.dev";

users.set(demoEmail, {
  name: "Demo User",
  email: demoEmail,
  passwordHash: hashPassword("Inertia@123"),
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many login attempts. Please try again in 15 minutes.",
  },
});

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    message: "Too many registration attempts. Please try again later.",
  },
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "KEYFLOW authentication server is running.",
  });
});

app.post("/api/register", registerLimiter, (req, res) => {
  const { name, email, password } = req.body || {};

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return res.status(400).json({
      message: "Name, email, and password are required.",
    });
  }

  const cleanName = name.trim();
  const cleanEmail = email.trim().toLowerCase();

  if (cleanName.length < 2 || cleanName.length > 70) {
    return res.status(400).json({
      message: "Name must be between 2 and 70 characters.",
    });
  }

  if (
    cleanEmail.length > 254 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      message: "Please enter a valid email address.",
    });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({
      message: "Password must be between 8 and 128 characters.",
    });
  }

  if (users.has(cleanEmail)) {
    return res.status(409).json({
      message: "An account with this email already exists. Please sign in.",
    });
  }

  const user = {
    name: cleanName,
    email: cleanEmail,
    passwordHash: hashPassword(password),
  };

  users.set(cleanEmail, user);

  return res.status(201).json({
    message: "Account created successfully.",
    user: {
      name: user.name,
      email: user.email,
    },
  });
});

app.post("/api/login", loginLimiter, (req, res) => {
  const { email, password } = req.body || {};

  if (
    typeof email !== "string" ||
    typeof password !== "string" ||
    !email.trim() ||
    !password
  ) {
    return res.status(400).json({
      message: "Email and password are required.",
    });
  }

  const cleanEmail = email.trim().toLowerCase();

  if (
    cleanEmail.length > 254 ||
    password.length > 128 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
  ) {
    return res.status(400).json({
      message: "Please provide valid login details.",
    });
  }

  const user = users.get(cleanEmail);

  if (!user || !verifyPassword(password, user.passwordHash)) {
    return res.status(401).json({
      message: "Incorrect email or password. Please try again.",
    });
  }

  return res.status(200).json({
    message: "Login successful.",
    user: {
      name: user.name,
      email: user.email,
    },
  });
});

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

app.use((err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  if (err.type === "entity.parse.failed") {
    return res.status(400).json({
      message: "Invalid JSON request body.",
    });
  }

  console.error("Server error:", err.message);

  return res.status(500).json({
    message: "An unexpected server error occurred.",
  });
});

app.listen(PORT, () => {
  console.log(`KEYFLOW backend running at http://localhost:${PORT}`);
});
