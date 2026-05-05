'use strict';

function basicAuth(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Basic ')) {
    res.set('WWW-Authenticate', 'Basic realm="byQAZ Admin"');
    return res.status(401).send('Authentication required');
  }

  const base64 = authHeader.slice(6);
  const decoded = Buffer.from(base64, 'base64').toString('utf8');
  const colonIdx = decoded.indexOf(':');
  if (colonIdx === -1) {
    res.set('WWW-Authenticate', 'Basic realm="byQAZ Admin"');
    return res.status(401).send('Invalid credentials');
  }

  const user = decoded.slice(0, colonIdx);
  const pass = decoded.slice(colonIdx + 1);

  const validUser = process.env.ADMIN_USER || 'admin';
  const validPass = process.env.ADMIN_PASSWORD;

  if (!validPass) {
    console.error('ADMIN_PASSWORD не задан в .env');
    return res.status(500).send('Server misconfiguration');
  }

  if (user === validUser && pass === validPass) {
    return next();
  }

  res.set('WWW-Authenticate', 'Basic realm="byQAZ Admin"');
  return res.status(401).send('Invalid credentials');
}

module.exports = { basicAuth };
