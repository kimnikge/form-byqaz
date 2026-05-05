'use strict';

const express = require('express');
const rateLimit = require('express-rate-limit');
const { PrismaClient } = require('@prisma/client');
const { basicAuth } = require('../middleware/auth');

const router = express.Router();
const prisma = new PrismaClient();

const VALID_STATUSES = ['new', 'contacted', 'closed'];
const VALID_ROLES = ['manufacturer', 'supplier', 'buyer'];
const PHONE_RE = /^\+7\d{10}$/;

const submitLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: { error: 'Слишком много запросов. Попробуйте позже.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// POST /api/lead
router.post('/lead', submitLimiter, async (req, res) => {
  const { role, industry, industries, buyerType, name, phone, region, _hp } = req.body;

  // Honeypot: silently discard bot submissions
  if (_hp) {
    return res.status(201).json({ ok: true });
  }

  if (!role || !phone) {
    return res.status(400).json({ error: 'Поля role и phone обязательны' });
  }

  if (!VALID_ROLES.includes(role)) {
    return res.status(400).json({ error: 'Недопустимая роль' });
  }

  if (!PHONE_RE.test(phone)) {
    return res.status(400).json({ error: 'Неверный формат телефона. Используйте +7XXXXXXXXXX' });
  }

  try {
    const lead = await prisma.lead.create({
      data: {
        role,
        industry: industry || null,
        industries: Array.isArray(industries) ? JSON.stringify(industries) : null,
        buyerType: buyerType || null,
        name: name || '',
        phone,
        region: region || '',
      },
    });
    res.status(201).json({ ok: true, id: lead.id });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// GET /api/leads
router.get('/leads', basicAuth, async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
    const result = leads.map(l => ({
      ...l,
      industries: l.industries ? JSON.parse(l.industries) : null,
    }));
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// PATCH /api/lead/:id
router.patch('/lead/:id', basicAuth, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const { status } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'Неверный ID' });
  }

  if (!VALID_STATUSES.includes(status)) {
    return res.status(400).json({ error: 'Недопустимый статус. Допустимые: new, contacted, closed' });
  }

  try {
    const lead = await prisma.lead.update({
      where: { id },
      data: { status },
    });
    res.json({ ok: true, lead });
  } catch (err) {
    if (err.code === 'P2025') {
      return res.status(404).json({ error: 'Заявка не найдена' });
    }
    console.error(err);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

module.exports = router;
