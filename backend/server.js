import express from 'express';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
// import sqlite3 from 'sqlite3'; (Removed to avoid Render library errors)
import { fileURLToPath } from 'url';
import path from 'path';
import multer from 'multer';
import fs from 'fs';
import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();
const { Pool } = pg;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Configure Multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});
const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only images are allowed'));
    }
  }
});

const JWT_SECRET = process.env.JWT_SECRET || 'zyntra-super-secret-key-123';

// Initialize Database (PostgreSQL for production, SQLite for local)
let db;
const isProduction = process.env.DATABASE_URL;

if (isProduction) {
  console.log('Production detected! Using PostgreSQL...');
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });
  
  pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
  });

  db = {
    run: (sql, params, cb) => {
      let finalSql = sql.replace(/\?/g, (_, i) => `$${i + 1}`);
      if (finalSql.trim().toUpperCase().startsWith('INSERT')) {
        finalSql += ' RETURNING id';
      }
      pool.query(finalSql, params)
        .then(res => {
          const lastID = res.rows && res.rows[0] ? res.rows[0].id : null;
          if (cb) cb.call({ lastID }, null);
        })
        .catch(err => {
          console.error('DB Run Error:', err.message);
          if (cb) cb(err);
        });
    },
    get: (sql, params, cb) => {
      pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params)
        .then(res => cb && cb(null, res.rows[0]))
        .catch(err => {
          console.error('DB Get Error:', err.message);
          if (cb) cb(err);
        });
    },
    all: (sql, params, cb) => {
      pool.query(sql.replace(/\?/g, (_, i) => `$${i + 1}`), params)
        .then(res => cb && cb(null, res.rows))
        .catch(err => {
          console.error('DB All Error:', err.message);
          if (cb) cb(err);
        });
    },
    serialize: (fn) => fn()
  };
} else {
  console.log('Local environment! Loading SQLite...');
  // Only load sqlite3 if we are NOT on Render (to prevent build errors)
  if (!process.env.RENDER) {
    const sqlite3Module = await import('sqlite3');
    const sqlite3 = sqlite3Module.default.verbose();
    db = new sqlite3.Database(path.join(__dirname, 'database.sqlite'), (err) => {
      if (err) console.error('Database connection error:', err);
      else console.log('Connected to SQLite database.');
    });
  } else {
    console.error('CRITICAL: Running on Render but DATABASE_URL is missing!');
    process.exit(1);
  }
}

// Create tables
db.serialize(() => {
  const autoInc = isProduction ? 'SERIAL PRIMARY KEY' : 'INTEGER PRIMARY KEY AUTOINCREMENT';
  
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id ${autoInc},
      handle TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      age INTEGER,
      bio TEXT,
      gender TEXT,
      preference TEXT,
      password TEXT NOT NULL,
      profile_pictures TEXT, -- JSON array of filenames
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS interactions (
      user_id INTEGER,
      target_id INTEGER,
      type TEXT NOT NULL, -- 'like' or 'skip'
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, target_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS matches (
      user1_id INTEGER,
      user2_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (user1_id, user2_id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS messages (
      id ${autoInc},
      sender_id INTEGER NOT NULL,
      receiver_id INTEGER NOT NULL,
      text TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

// Register Endpoint
app.post('/api/auth/register', async (req, res) => {
  const { handle, name, age, bio, gender, preference, password } = req.body;

  if (!handle || !name || !password || !gender || !preference) {
    return res.status(400).json({ error: 'Handle, name, password, gender, and preference are required.' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const sql = `INSERT INTO users (handle, name, age, bio, gender, preference, password) VALUES (?, ?, ?, ?, ?, ?, ?)`;
    
    db.run(sql, [handle, name, age, bio, gender, preference, hashedPassword], function (err) {
      if (err) {
        if (err.message.includes('UNIQUE constraint failed')) {
          return res.status(409).json({ error: 'Handle is already taken.' });
        }
        return res.status(500).json({ error: 'Database error.' });
      }

      const token = jwt.sign({ id: this.lastID, handle }, JWT_SECRET, { expiresIn: '7d' });
      res.status(201).json({ 
        message: 'User created successfully', 
        token, 
        user: { id: this.lastID, handle, name, age, bio, gender, preference } 
      });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Login Endpoint
app.post('/api/auth/login', (req, res) => {
  const { handle, password } = req.body;

  if (!handle || !password) {
    return res.status(400).json({ error: 'User ID and password are required.' });
  }

  db.get(`SELECT * FROM users WHERE handle = ?`, [handle], async (err, user) => {
    if (err) return res.status(500).json({ error: 'Database error.' });
    if (!user) return res.status(401).json({ error: 'Invalid User ID or password.' });

    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid User ID or password.' });

    const token = jwt.sign({ id: user.id, handle: user.handle }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ 
      message: 'Login successful', 
      token, 
      user: { id: user.id, handle: user.handle, name: user.name, age: user.age, bio: user.bio, gender: user.gender, preference: user.preference } 
    });
  });
});

// Get Current User
app.get('/api/auth/me', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    db.get(`SELECT id, handle, name, age, bio, gender, preference, created_at FROM users WHERE id = ?`, [decoded.id], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found.' });
      res.json({ user });
    });
  });
});

// Get Potential Matches
app.get('/api/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    // Fetch the current user to know their preferences
    db.get(`SELECT gender, preference FROM users WHERE id = ?`, [decoded.id], (err, currentUser) => {
      if (err || !currentUser) return res.status(500).json({ error: 'User not found.' });

      let genderFilter = "";
      let params = [decoded.id, decoded.id]; // for id != ? and user_id = ?

      if (currentUser.preference !== 'Everyone') {
        genderFilter = "AND gender = ?";
        params.push(currentUser.preference);
      }

      // We only return id, name, age, bio. We do NOT return the handle!
      const sql = `
        SELECT id, name, age, bio, profile_pictures 
        FROM users 
        WHERE id != ? 
        AND id NOT IN (SELECT target_id FROM interactions WHERE user_id = ?)
        ${genderFilter}
      `;

      db.all(sql, params, (err, users) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ users });
      });
    });
  });
});

// Interact (Like or Skip)
app.post('/api/interact', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const { target_id, type } = req.body; // type should be 'like' or 'skip'

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    
    const userId = decoded.id;

    // Record the interaction
    const interactSql = isProduction 
      ? `INSERT INTO interactions (user_id, target_id, type) VALUES (?, ?, ?) ON CONFLICT (user_id, target_id) DO NOTHING`
      : `INSERT OR IGNORE INTO interactions (user_id, target_id, type) VALUES (?, ?, ?)`;

    db.run(interactSql, [userId, target_id, type], function(err) {
      if (err) return res.status(500).json({ error: 'Database error.' });

      if (type === 'like') {
        // Check if mutual match
        db.get(`SELECT * FROM interactions WHERE user_id = ? AND target_id = ? AND type = 'like'`, [target_id, userId], (err, mutual) => {
          if (mutual) {
            // It's a match!
            const user1 = Math.min(userId, target_id);
            const user2 = Math.max(userId, target_id);
            
            const matchSql = isProduction
              ? `INSERT INTO matches (user1_id, user2_id) VALUES (?, ?) ON CONFLICT (user1_id, user2_id) DO NOTHING`
              : `INSERT OR IGNORE INTO matches (user1_id, user2_id) VALUES (?, ?)`;

            db.run(matchSql, [user1, user2], (err) => {
              if (err) return res.status(500).json({ error: 'Failed to create match.' });
              return res.json({ success: true, match: true });
            });
          } else {
            return res.json({ success: true, match: false });
          }
        });
      } else {
        return res.json({ success: true, match: false });
      }
    });
  });
});

// Get Mutual Matches
app.get('/api/matches', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    
    const userId = decoded.id;

    const sql = `
      SELECT u.id, u.handle, u.name, u.age, u.bio
      FROM users u
      JOIN matches m ON (u.id = m.user1_id OR u.id = m.user2_id)
      WHERE u.id != ? AND (m.user1_id = ? OR m.user2_id = ?)
    `;

    db.all(sql, [userId, userId, userId], (err, matches) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.json({ matches });
    });
  });
});

// Send Message
app.post('/api/messages', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const { receiver_id, text } = req.body;
  if (!receiver_id || !text) return res.status(400).json({ error: 'Receiver ID and text required.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    
    db.run(`INSERT INTO messages (sender_id, receiver_id, text) VALUES (?, ?, ?)`, [decoded.id, receiver_id, text], function(err) {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.status(201).json({ success: true, messageId: this.lastID });
    });
  });
});

// Get Messages
app.get('/api/messages/:otherUserId', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const otherUserId = req.params.otherUserId;

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    
    const userId = decoded.id;

    const sql = `
      SELECT * FROM messages 
      WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
      ORDER BY created_at ASC
    `;

    db.all(sql, [userId, otherUserId, otherUserId, userId], (err, messages) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.json({ messages });
    });
  });
});

// --- NEW PROFILE & REQUESTS ENDPOINTS ---

// Get Requests (people who liked you but aren't matches yet)
app.get('/api/requests', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });
    
    const userId = decoded.id;

    const sql = `
      SELECT u.id, u.name, u.age, u.bio, u.handle, u.profile_pictures
      FROM users u
      JOIN interactions i ON u.id = i.user_id
      WHERE i.target_id = ? AND i.type = 'like'
      AND u.id NOT IN (
        SELECT user1_id FROM matches WHERE user2_id = ?
        UNION
        SELECT user2_id FROM matches WHERE user1_id = ?
      )
    `;

    db.all(sql, [userId, userId, userId], (err, requests) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.json({ requests: requests.map(r => ({
        ...r,
        profile_pictures: r.profile_pictures ? JSON.parse(r.profile_pictures) : []
      })) });
    });
  });
});

// Get My Profile
app.get('/api/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    db.get(`SELECT id, handle, name, age, bio, gender, preference, profile_pictures FROM users WHERE id = ?`, [decoded.id], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found.' });
      res.json({ user: {
        ...user,
        profile_pictures: user.profile_pictures ? JSON.parse(user.profile_pictures) : []
      }});
    });
  });
});

// Get Public Profile (for viewing matches)
app.get('/api/user/:id', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const targetId = parseInt(req.params.id);
  if (isNaN(targetId)) return res.status(400).json({ error: 'Invalid user ID.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    db.get(`SELECT id, handle, name, age, bio, gender, profile_pictures FROM users WHERE id = ?`, [targetId], (err, user) => {
      if (err || !user) return res.status(404).json({ error: 'User not found.' });
      res.json({ user: {
        ...user,
        profile_pictures: user.profile_pictures ? JSON.parse(user.profile_pictures) : []
      }});
    });
  });
});

// Update Profile
app.post('/api/profile/update', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const { name, age, bio, gender, preference } = req.body;

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    const sql = `UPDATE users SET name = ?, age = ?, bio = ?, gender = ?, preference = ? WHERE id = ?`;
    db.run(sql, [name, age, bio, gender, preference, decoded.id], function(err) {
      if (err) return res.status(500).json({ error: 'Database error.' });
      res.json({ success: true });
    });
  });
});

// Upload Photo
app.post('/api/profile/upload-photo', upload.single('photo'), (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });
  if (!req.file) return res.status(400).json({ error: 'No photo uploaded.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    db.get(`SELECT profile_pictures FROM users WHERE id = ?`, [decoded.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      
      let photos = row.profile_pictures ? JSON.parse(row.profile_pictures) : [];
      photos.push(req.file.filename);

      db.run(`UPDATE users SET profile_pictures = ? WHERE id = ?`, [JSON.stringify(photos), decoded.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ success: true, photos, filename: req.file.filename });
      });
    });
  });
});

// Delete Photo
app.post('/api/profile/delete-photo', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });
  const { filename } = req.body;

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    db.get(`SELECT profile_pictures FROM users WHERE id = ?`, [decoded.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      
      let photos = row.profile_pictures ? JSON.parse(row.profile_pictures) : [];
      photos = photos.filter(p => p !== filename);

      db.run(`UPDATE users SET profile_pictures = ? WHERE id = ?`, [JSON.stringify(photos), decoded.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        
        // Optionally delete the file from disk
        const filePath = path.join(__dirname, 'uploads', filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

        res.json({ success: true, photos });
      });
    });
  });
});

// Simulate Instagram Sync
app.post('/api/profile/sync-instagram', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: 'No token provided.' });

  const token = authHeader.split(' ')[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Invalid token.' });

    // In a real app, we would use the Instagram API here.
    // For now, we simulate by adding 6 high-quality "Instagram-style" photos.
    const mockPhotos = [
      `https://images.unsplash.com/photo-1511367461989-f85a21fda167?w=600&q=80&rand=${Math.random()}`,
      `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=600&q=80&rand=${Math.random()}`,
      `https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=600&q=80&rand=${Math.random()}`,
      `https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=600&q=80&rand=${Math.random()}`,
      `https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&q=80&rand=${Math.random()}`,
      `https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&q=80&rand=${Math.random()}`
    ];

    db.get(`SELECT profile_pictures FROM users WHERE id = ?`, [decoded.id], (err, row) => {
      if (err) return res.status(500).json({ error: 'Database error.' });
      if (!row) return res.status(404).json({ error: 'User not found.' });
      
      let photos = row.profile_pictures ? JSON.parse(row.profile_pictures) : [];
      // Combine existing with new, limit to 6
      const updatedPhotos = [...new Set([...photos, ...mockPhotos])].slice(0, 6);

      db.run(`UPDATE users SET profile_pictures = ? WHERE id = ?`, [JSON.stringify(updatedPhotos), decoded.id], (err) => {
        if (err) return res.status(500).json({ error: 'Database error.' });
        res.json({ success: true, photos: updatedPhotos });
      });
    });
  });
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`Backend server running on http://localhost:${PORT}`);
});
