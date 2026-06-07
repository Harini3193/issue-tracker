const mongoose = require('mongoose');

const logSchema = new mongoose.Schema({
  issue_id: { type: Number, required: true },
  action: { type: String, required: true },
  details: { type: String, required: true },
  performed_by: { type: String, required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Log', logSchema, 'issue_logs');
