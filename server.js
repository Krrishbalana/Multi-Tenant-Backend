const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();

const corsOptions = {
  origin: "http://localhost:5173",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json());

const JWT_SECRET = "your_jwt_secret_key";

const adminPasswordHash = bcrypt.hashSync("adminpassword", 10);
const superAdminPasswordHash = bcrypt.hashSync("supersecret", 10);

const users = [
  {
    tenantId: "global",
    email: "superadmin@example.com",
    passwordHash: superAdminPasswordHash,
    role: "superadmin",
    name: "Super Admin",
  },
  {
    tenantId: "tenant1",
    email: "admin1@tenant1.com",
    passwordHash: adminPasswordHash,
    role: "admin",
    name: "Tenant Admin",
  },
];

// Signup route
app.post("/api/auth/signup", async (req, res) => {
  const { tenantId, email, password } = req.body;
  if (!tenantId || !email || !password) {
    return res.status(400).json({ message: "Missing fields" });
  }

  const exists = users.find(
    (u) => u.email === email && u.tenantId === tenantId
  );
  if (exists) return res.status(409).json({ message: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  const role = "user";
  const name = email.split("@")[0];
  users.push({ tenantId, email, passwordHash, role, name });

  const token = jwt.sign({ email, role, tenantId, name }, JWT_SECRET, {
    expiresIn: "1h",
  });
  res.json({ token });
});

// Login route
app.post("/api/auth/login", async (req, res) => {
  const { tenantId, email, password } = req.body;
  const user = users.find((u) => u.email === email && u.tenantId === tenantId);
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches)
    return res.status(401).json({ message: "Invalid credentials" });

  const token = jwt.sign(
    { email, role: user.role, tenantId: user.tenantId, name: user.name },
    JWT_SECRET,
    { expiresIn: "1h" }
  );
  res.json({ token });
});

// Authentication middleware
const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader)
    return res.status(401).json({ message: "Missing auth header" });

  const token = authHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

// Tenant listing (superadmin only)
app.get("/api/tenants", authMiddleware, (req, res) => {
  if (req.user.role !== "superadmin") {
    return res.status(403).json({ message: "Forbidden" });
  }

  const tenants = [...new Set(users.map((u) => u.tenantId))].map((id) => ({
    tenantId: id,
    name: `Tenant-${id}`,
  }));

  res.json({ tenants });
});

// Tenant's users listing (admins and superadmin)
app.get("/api/tenants/:tenantId/users", authMiddleware, (req, res) => {
  const { tenantId } = req.params;
  const userRole = req.user.role;
  const userTenantId = req.user.tenantId;

  if (
    userRole !== "superadmin" &&
    !(userRole === "admin" && tenantId === userTenantId)
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const tenantUsers = users
    .filter((u) => u.tenantId === tenantId)
    .map(({ passwordHash, ...rest }) => rest);

  res.json({ users: tenantUsers });
});

// Current user profile
app.get("/api/users/me", authMiddleware, (req, res) => {
  const { email, tenantId } = req.user;
  const user = users.find((u) => u.email === email && u.tenantId === tenantId);
  if (!user) return res.status(404).json({ message: "User not found" });

  const { passwordHash, ...userData } = user;
  res.json({ user: userData });
});

// Optional: Create user (admin or superadmin)
app.post("/api/tenants/:tenantId/users", authMiddleware, async (req, res) => {
  const { tenantId } = req.params;
  const userRole = req.user.role;
  const userTenantId = req.user.tenantId;

  if (
    userRole !== "superadmin" &&
    !(userRole === "admin" && tenantId === userTenantId)
  ) {
    return res.status(403).json({ message: "Forbidden" });
  }

  const { email, password, role = "user", name } = req.body;
  if (!email || !password) {
    return res.status(400).json({ message: "Missing required fields" });
  }

  const exists = users.find(
    (u) => u.email === email && u.tenantId === tenantId
  );
  if (exists) return res.status(409).json({ message: "User already exists" });

  const passwordHash = await bcrypt.hash(password, 10);
  users.push({
    tenantId,
    email,
    passwordHash,
    role,
    name: name || email.split("@")[0],
  });

  res.status(201).json({ message: "User created" });
});

// Protected example dashboard route
app.get("/api/dashboard", authMiddleware, (req, res) => {
  res.json({
    message: `Welcome ${req.user.name}`,
    role: req.user.role,
    tenant: req.user.tenantId,
  });
});

const PORT = 5050;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
