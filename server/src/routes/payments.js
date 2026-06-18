const router  = require('express').Router();
const express = require('express');
const { v4: uuid } = require('uuid');
const db      = require('../db');
const auth    = require('../middleware/auth');
const { userSockets } = require('../socketState');
const { sendPush }    = require('../pushService');

// Stripe is optional — if key is missing, checkout returns 503
const stripe = process.env.STRIPE_SECRET_KEY
  ? require('stripe')(process.env.STRIPE_SECRET_KEY)
  : null;

const CURRENCY     = process.env.STRIPE_CURRENCY || 'usd';
const FRONTEND_URL = process.env.FRONTEND_URL    || 'http://localhost:5173';

// ── POST /api/payments/checkout ────────────────────────────────
// Creates a Stripe Checkout session and returns the redirect URL
router.post('/checkout', auth, async (req, res) => {
  if (!stripe) return res.status(503).json({ error: 'Payments not configured yet' });

  const { receiver_id, amount, message, hangout_id } = req.body;

  if (!receiver_id || typeof receiver_id !== 'string')
    return res.status(400).json({ error: 'receiver_id required' });

  const parsed = parseFloat(amount);
  if (!Number.isFinite(parsed) || parsed < 1 || parsed > 500)
    return res.status(400).json({ error: 'Amount must be between 1 and 500' });

  if (receiver_id === req.user.id)
    return res.status(400).json({ error: 'Cannot send to yourself' });

  const receiver = db.findOne('users', u => u.id === receiver_id);
  if (!receiver) return res.status(404).json({ error: 'Receiver not found' });

  const baseUrl = `${FRONTEND_URL}/hangout/${hangout_id}/send-round`;

  try {
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: CURRENCY,
          unit_amount: Math.round(parsed * 100), // Stripe wants cents
          product_data: {
            name:        `A round for ${receiver.name} 🥂`,
            description: message || 'Sent via CLINK',
          },
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${baseUrl}?paid=1&to=${encodeURIComponent(receiver.name)}&amt=${parsed}`,
      cancel_url:  baseUrl,
      metadata: {
        sender_id:     req.user.id,
        sender_name:   req.user.name,
        receiver_id,
        receiver_name: receiver.name,
        hangout_id:    hangout_id || '',
        amount:        String(parsed),
        message:       message || '',
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error('[stripe] checkout error:', err.message);
    res.status(500).json({ error: 'Could not create payment session' });
  }
});

// ── POST /api/payments/webhook ─────────────────────────────────
// Called by Stripe after a successful payment
// ⚠️  Needs raw body — see index.js where express.raw() is applied to this path
router.post('/webhook', async (req, res) => {
  const sig    = req.headers['stripe-signature'];
  const secret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;
  try {
    if (secret && stripe) {
      event = stripe.webhooks.constructEvent(req.body, sig, secret);
    } else if (process.env.NODE_ENV === 'production') {
      // In production, never accept unsigned webhooks — this is a misconfiguration
      console.error('[stripe] webhook received in production without STRIPE_WEBHOOK_SECRET set');
      return res.status(500).json({ error: 'Webhook secret not configured' });
    } else {
      // Dev only — accept without verification so local testing works
      event = JSON.parse(req.body.toString());
    }
  } catch (err) {
    console.error('[stripe] webhook signature failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  if (event.type === 'checkout.session.completed') {
    const session  = event.data.object;
    const meta     = session.metadata || {};

    const { sender_id, sender_name, receiver_id, receiver_name, hangout_id, amount, message } = meta;
    if (!sender_id || !receiver_id) {
      return res.status(400).json({ error: 'Missing metadata' });
    }

    // Record in DB
    const txId = uuid();
    db.insert('transactions', {
      id:          txId,
      hangout_id:  hangout_id || null,
      sender_id,
      receiver_id,
      amount:      parseFloat(amount),
      message:     message || '',
      status:      'paid',
      stripe_id:   session.id,
      created_at:  Date.now(),
    });

    // Notify receiver via socket (if online)
    const { io } = require('../socketState');
    if (io) {
      const sid = userSockets[receiver_id];
      if (sid) {
        io.to(sid).emit('round-sent', {
          amount: parseFloat(amount),
          message,
          sender_name,
          receiver_name,
        });
        if (hangout_id) {
          io.to(hangout_id).emit('round-sent', {
            amount: parseFloat(amount),
            message,
            sender_name,
            receiver_name,
          });
        }
      }
    }

    // Push if receiver is offline
    if (!userSockets[receiver_id]) {
      sendPush(receiver_id, {
        title: `${sender_name} bought you a round 🥂`,
        body:  message || `$${amount} sent your way`,
        icon:  '/icon-192.png',
        tag:   `round-${txId}`,
        url:   '/home',
      });
    }

    console.log(`[payments] ✅ ${sender_name} → ${receiver_name}: $${amount}`);
  }

  res.json({ received: true });
});

// ── GET /api/payments/history ──────────────────────────────────
router.get('/history', auth, (req, res) => {
  const history = db
    .find('transactions', t => t.sender_id === req.user.id || t.receiver_id === req.user.id)
    .sort((a, b) => b.created_at - a.created_at)
    .slice(0, 50)
    .map(t => {
      const sender   = db.findOne('users', u => u.id === t.sender_id);
      const receiver = db.findOne('users', u => u.id === t.receiver_id);
      return {
        ...t,
        sender_name:    sender?.name,
        sender_color:   sender?.avatar_color,
        receiver_name:  receiver?.name,
        receiver_color: receiver?.avatar_color,
      };
    });
  res.json(history);
});

module.exports = router;
