// Shared in-memory state between socket handler and API routes
// userId → socketId, used to send real-time events from REST routes
const userSockets = {};

// io instance — set in index.js after server starts
// Lets webhook handler (no req context) emit socket events
let io = null;

module.exports = { userSockets, get io() { return io; }, set io(v) { io = v; } };
