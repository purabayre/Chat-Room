require('dotenv').config();

const mongoose = require('mongoose');
const http = require('http');
const { Server } = require('socket.io');

const { app, sessionMiddleware } = require('./src/app');
const socketSetup = require('./src/socket');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGO_URI;

mongoose
  .connect(MONGODB_URI)
  .then(() => {
    const server = http.createServer(app);

    const io = new Server(server);

    io.use((socket, next) => {
      sessionMiddleware(socket.request, {}, next);
    });

    socketSetup(io);

    server.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => console.error(err));
