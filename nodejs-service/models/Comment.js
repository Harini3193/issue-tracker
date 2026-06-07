const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema({
  issue_id: { type: Number, required: true },
  author: { type: String, required: true },
  content: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Comment', commentSchema, 'issue_comments');
