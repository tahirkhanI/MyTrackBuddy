import express from 'express';
import { createServer as createViteServer } from 'vite';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database('finance.db');
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';

// Initialize Database
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('income', 'expense')) NOT NULL,
    amount REAL NOT NULL,
    category TEXT NOT NULL,
    date TEXT NOT NULL,
    payment_method TEXT,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS budgets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    amount REAL NOT NULL,
    month TEXT NOT NULL, -- YYYY-MM
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id),
    UNIQUE(user_id, month)
  );

  CREATE TABLE IF NOT EXISTS savings_goals (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    target_amount REAL NOT NULL,
    current_amount REAL DEFAULT 0,
    deadline TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(user_id) REFERENCES users(id)
  );
`);

async function startServer() {
  const app = express();
  app.use(express.json());

  // Auth Middleware
  const authenticateToken = (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access denied' });

    jwt.verify(token, JWT_SECRET, (err: any, user: any) => {
      if (err) return res.status(403).json({ error: 'Invalid token' });
      req.user = user;
      next();
    });
  };

  // --- Auth Routes ---
  app.post('/api/auth/register', async (req, res) => {
    const { name, email, password } = req.body;
    try {
      const hashedPassword = await bcrypt.hash(password, 10);
      const stmt = db.prepare('INSERT INTO users (name, email, password) VALUES (?, ?, ?)');
      const result = stmt.run(name, email, hashedPassword);
      const token = jwt.sign({ id: result.lastInsertRowid, email, name }, JWT_SECRET);
      res.json({ token, user: { id: result.lastInsertRowid, name, email } });
    } catch (err: any) {
      res.status(400).json({ error: 'Email already exists' });
    }
  });

  app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    const user: any = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, JWT_SECRET);
    res.json({ token, user: { id: user.id, name: user.name, email: user.email } });
  });

  app.get('/api/auth/me', authenticateToken, (req: any, res) => {
    res.json({ user: req.user });
  });

  // --- Transaction Routes ---
  app.get('/api/transactions', authenticateToken, (req: any, res) => {
    const transactions = db.prepare('SELECT * FROM transactions WHERE user_id = ? ORDER BY date DESC').all(req.user.id);
    res.json(transactions);
  });

  app.post('/api/transactions', authenticateToken, (req: any, res) => {
    const { type, amount, category, date, payment_method, notes } = req.body;
    const stmt = db.prepare('INSERT INTO transactions (user_id, type, amount, category, date, payment_method, notes) VALUES (?, ?, ?, ?, ?, ?, ?)');
    const result = stmt.run(req.user.id, type, amount, category, date, payment_method, notes);
    res.json({ id: result.lastInsertRowid, ...req.body });
  });

  app.delete('/api/transactions/:id', authenticateToken, (req: any, res) => {
    db.prepare('DELETE FROM transactions WHERE id = ? AND user_id = ?').run(req.params.id, req.user.id);
    res.json({ success: true });
  });

  // --- Budget Routes ---
  app.get('/api/budgets', authenticateToken, (req: any, res) => {
    const budgets = db.prepare('SELECT * FROM budgets WHERE user_id = ?').all(req.user.id);
    res.json(budgets);
  });

  app.post('/api/budgets', authenticateToken, (req: any, res) => {
    const { amount, month } = req.body;
    const stmt = db.prepare(`
      INSERT INTO budgets (user_id, amount, month) VALUES (?, ?, ?)
      ON CONFLICT(user_id, month) DO UPDATE SET amount = excluded.amount
    `);
    stmt.run(req.user.id, amount, month);
    res.json({ success: true });
  });

  // --- Savings Routes ---
  app.get('/api/savings', authenticateToken, (req: any, res) => {
    const goals = db.prepare('SELECT * FROM savings_goals WHERE user_id = ?').all(req.user.id);
    res.json(goals);
  });

  app.post('/api/savings', authenticateToken, (req: any, res) => {
    const { name, target_amount, deadline } = req.body;
    const stmt = db.prepare('INSERT INTO savings_goals (user_id, name, target_amount, deadline) VALUES (?, ?, ?, ?)');
    const result = stmt.run(req.user.id, name, target_amount, deadline);
    res.json({ id: result.lastInsertRowid, ...req.body });
  });

  app.patch('/api/savings/:id/contribute', authenticateToken, (req: any, res) => {
    const { amount } = req.body;
    db.prepare('UPDATE savings_goals SET current_amount = current_amount + ? WHERE id = ? AND user_id = ?').run(amount, req.params.id, req.user.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  const PORT = 3000;
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
