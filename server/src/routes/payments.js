const router = require('express').Router();
const { v4: uuid } = require('uuid');
const db = require('../db');
const auth = require('../middleware/auth');

router.post('/send', auth, (req, res) => {
  const { receiver_id, amount, message, hangout_id } = req.body;
  if (!receiver_id || !amount) return res.status(400).json({ error: 'receiver_id and amount required' });
  if (amount <= 0 || amount > 500) return res.status(400).json({ error: 'Amount must be between 1 and 500' });

  const receiver = db.findOne('users', u => u.id === receiver_id);
  if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

  const id = uuid();
  db.insert('transactions', {
    id, hangout_id: hangout_id || null, sender_id: req.user.id, receiver_id,
    amount: parseFloat(amount), message: message || '', status: 'sent', created_at: Date.now()
  });
  res.json({ ok: true, id, receiver_name: receiver.name, amount });
});

router.get('/history', auth, (req, res) => {
  const history = db.find('transactions', t => t.sender_id === req.user.id || t.receiver_id === req.user.id)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 50)
    .map(t => {
      const sender = db.findOne('users', u => u.id === t.sender_id);
      const receiver = db.findOne('users', u => u.id === t.receiver_id);
      return { ...t, sender_name: sender?.name, sender_color: sender?.avatar_color, receiver_name: receiver?.name, receiver_color: receiver?.avatar_color };
    });
  res.json(history);
});

module.exports = router;
