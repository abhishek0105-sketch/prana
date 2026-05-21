// Shared in-memory state between socket handler and API routes
// userId → socketId, used to send real-time events from REST routes
const userSockets = {};
module.exports = { userSockets };
