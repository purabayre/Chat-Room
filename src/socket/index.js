const Message = require('../models/Message');
const Room = require('../models/Room');

const onlineUsers = {};

//socket.on() used for register event handlers
//socket.emit() used to send custom events with data across the network

module.exports = (io) => {
  io.on('connection', (socket) => {
    const user = socket.request.session?.user;
    if (!user) {
      return;
    }
    socket.on('get-room-counts', () => {
      socket.emit('rooms-online', getRoomCounts());
    });

    function getRoomCounts() {
      const counts = {};
      for (const roomId in onlineUsers) {
        counts[roomId] = Object.keys(onlineUsers[roomId] || {}).length;
      }
      return counts;
    }

    socket.on('join-room', async ({ roomId, token }) => {
      try {
        const room = await Room.findById(roomId);
        if (!room) {
          return;
        }

        if (room.isPrivate) {
          if (!token || token !== room.token) {
            return socket.emit(
              'error',
              'Access denied: invalid token for private room.',
            );
          }
        }

        const previousRooms = [...socket.rooms].filter((r) => r !== socket.id);

        previousRooms.forEach((prevRoomId) => {
          socket.leave(prevRoomId);

          if (!onlineUsers[prevRoomId] || !onlineUsers[prevRoomId][user.name])
            return;

          onlineUsers[prevRoomId][user.name] = onlineUsers[prevRoomId][
            user.name
          ].filter((id) => id !== socket.id);

          if (onlineUsers[prevRoomId][user.name]?.length === 0) {
            delete onlineUsers[prevRoomId][user.name];

            if (prevRoomId !== roomId) {
              socket.to(prevRoomId).emit('user-left', { name: user.name });
            }
          }

          io.to(prevRoomId).emit(
            'online-users',
            Object.keys(onlineUsers[prevRoomId] || {}),
          );
        });

        socket.join(roomId);

        if (!onlineUsers[roomId]) onlineUsers[roomId] = {};
        if (!onlineUsers[roomId][user.name])
          onlineUsers[roomId][user.name] = [];
        onlineUsers[roomId][user.name].push(socket.id);

        if (onlineUsers[roomId][user.name]?.length === 1) {
          socket.to(roomId).emit('user-joined', { name: user.name });
        }

        const messages = await Message.find({ room: roomId })
          .sort({ createdAt: -1 })
          .limit(50)
          .populate('sender', 'name avatarPath');

        socket.emit('room-history', messages.reverse());

        io.to(roomId).emit('online-users', Object.keys(onlineUsers[roomId]));

        socket.emit('room-users', Object.keys(onlineUsers[roomId]));

        io.emit('rooms-online', getRoomCounts());
      } catch (err) {
        console.error('Join room error:', err);
        socket.emit('error', 'Failed to join room.');
      }
    });

    socket.on('new-message', async ({ roomId, text }) => {
      if (!text || !text.trim()) {
        return;
      }

      const msg = await Message.create({
        room: roomId,
        sender: user.id,
        text: text.trim(),
      });

      const populated = await msg.populate('sender', 'name avatarPath');

      io.to(roomId).emit('new-message', populated);

      const mentionRegex = /@(\w+)/g;
      let match;
      const mentionedUsers = new Set();

      while ((match = mentionRegex.exec(text)) !== null) {
        mentionedUsers.add(match[1]);
      }

      mentionedUsers.forEach((mentionedName) => {
        const sockets = onlineUsers[roomId]?.[mentionedName] || [];
        sockets.forEach((sockId) => {
          io.to(sockId).emit('mention-notification', {
            from: user.name,
            roomId,
            messageId: populated._id,
            text,
          });
        });
      });
    });

    socket.on('typing', (roomId) => {
      socket.to(roomId).emit('typing', { name: user.name });
    });

    socket.on('stop-typing', (roomId) => {
      socket.to(roomId).emit('stop-typing', { name: user.name });
    });

    socket.on('get-room-users', (roomId) => {
      const users = Object.keys(onlineUsers[roomId] || {});
      socket.emit('room-users', users);
    });

    socket.on('react-message', async ({ roomId, messageId, emoji }) => {
      try {
        const msg = await Message.findById(messageId);
        if (!msg) {
          return;
        }

        if (!msg.reactions) msg.reactions = new Map();

        const existing = msg.reactions.get(emoji) || [];

        if (existing.includes(user.id)) {
          msg.reactions.set(
            emoji,
            existing.filter((u) => u.toString() !== user.id.toString()),
          );
        } else {
          msg.reactions.set(emoji, [...existing, user.id]);
        }

        await msg.save();

        io.to(roomId).emit('message-reacted', {
          messageId,
          reactions: Object.fromEntries(msg.reactions),
        });
      } catch (err) {
        console.log('Reaction error:', err);
      }
    });

    socket.on('disconnecting', () => {
      const rooms = [...socket.rooms].filter((r) => r !== socket.id);

      rooms.forEach((roomId) => {
        if (!onlineUsers[roomId] || !onlineUsers[roomId][user.name]) return;

        onlineUsers[roomId][user.name] = onlineUsers[roomId][user.name].filter(
          (id) => id !== socket.id,
        );

        if (onlineUsers[roomId][user.name]?.length === 0) {
          delete onlineUsers[roomId][user.name];
          socket.to(roomId).emit('user-left', { name: user.name });
        }

        io.to(roomId).emit('online-users', Object.keys(onlineUsers[roomId]));
      });

      io.emit('rooms-online', getRoomCounts());
    });
  });
};
