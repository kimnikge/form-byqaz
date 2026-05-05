'use strict';

const express = require('express');
const ExcelJS = require('exceljs');
const { PrismaClient } = require('@prisma/client');

const router = express.Router();
const prisma = new PrismaClient();

const ROLE_LABELS = {
  manufacturer: 'Производитель',
  supplier: 'Поставщик',
  buyer: 'Закупщик',
};

const STATUS_LABELS = {
  new: 'Новая',
  contacted: 'Контакт',
  closed: 'Закрыта',
};

// GET /api/leads/export
router.get('/leads/export', async (req, res) => {
  try {
    const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'byQAZ.kz';
    const sheet = workbook.addWorksheet('Заявки');

    sheet.columns = [
      { header: 'ID',                    key: 'id',          width: 6  },
      { header: 'Дата',                  key: 'createdAt',   width: 20 },
      { header: 'Роль',                  key: 'role',        width: 16 },
      { header: 'Имя',                   key: 'name',        width: 22 },
      { header: 'Телефон',               key: 'phone',       width: 18 },
      { header: 'Регион',                key: 'region',      width: 20 },
      { header: 'Отрасль',               key: 'industry',    width: 28 },
      { header: 'Отрасли (поставщик)',   key: 'industries',  width: 36 },
      { header: 'Тип закупщика',         key: 'buyerType',   width: 20 },
      { header: 'Статус',                key: 'status',      width: 12 },
    ];

    // Style header row
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1A56DB' },
    };
    sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

    for (const lead of leads) {
      sheet.addRow({
        id:         lead.id,
        createdAt:  new Date(lead.createdAt).toLocaleString('ru-RU'),
        role:       ROLE_LABELS[lead.role] || lead.role,
        name:       lead.name,
        phone:      lead.phone,
        region:     lead.region,
        industry:   lead.industry || '',
        industries: lead.industries ? JSON.parse(lead.industries).join(', ') : '',
        buyerType:  lead.buyerType || '',
        status:     STATUS_LABELS[lead.status] || lead.status,
      });
    }

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', 'attachment; filename=leads.xlsx');

    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Ошибка экспорта' });
  }
});

module.exports = router;
