require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const Comment = require('./models/Comment');
const Log = require('./models/Log');

const app = express();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/issue_tracker_db";

app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(MONGO_URI)
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- COMMENTS ENDPOINTS ---
app.post('/api/comments', async (req, res) => {
  try {
    const comment = new Comment(req.body);
    await comment.save();
    res.status(201).json(comment);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/comments/:issue_id', async (req, res) => {
  try {
    const comments = await Comment.find({ issue_id: Number(req.params.issue_id) });
    res.json(comments);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- LOGS ENDPOINTS ---
app.post('/api/logs', async (req, res) => {
  try {
    const log = new Log(req.body);
    await log.save();
    res.status(201).json(log);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

app.get('/api/logs/:issue_id', async (req, res) => {
  try {
    const logs = await Log.find({ issue_id: Number(req.params.issue_id) });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/logs', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const logs = await Log.find().sort({ created_at: -1 }).limit(limit);
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/status', (req, res) => {
  res.json({ status: 'online', service: 'Node.js Express Backend' });
});

app.listen(PORT, () => {
  console.log(`Node.js service running on port ${PORT}`);
});
