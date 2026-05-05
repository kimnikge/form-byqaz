'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const { basicAuth } = require('./middleware/auth');
const leadsRouter = require('./routes/leads');
const exportRouter = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Health check
app.get('/health', (req, res) => res.json({ status: 'ok' }));

// Admin panel — protected, served from views/
app.get('/admin', basicAuth, (req, res) => {
  res.sendFile(path.join(__dirname, '../views/admin.html'));
});

// API routes
app.use('/api', leadsRouter);
app.use('/api', basicAuth, exportRouter);

app.listen(PORT, () => {
  console.log(`byQAZ server running on http://localhost:${PORT}`);
});
