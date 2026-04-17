const Room = require('../models/Room');
const Message = require('../models/Message');
const crypto = require('crypto');

exports.getRooms = (req, res, next) => {
  const user = req.session.user;

  Room.find()
    .populate('createdBy', 'name')
    .lean()
    .then((rooms) => {
      rooms = rooms.map((room) => {
        const isCreator = String(room.createdBy?._id) === String(user.id);

        return {
          ...room,
          isCreator,
          inviteLink: isCreator
            ? `/chat/rooms/${room._id}?token=${room.inviteToken}`
            : null,
        };
      });

      res.render('chat/rooms', {
        rooms,
        user,
      });
    })
    .catch((err) => {
      console.error('Find Rooms Error:', err.message);
      res.status(500).send('Server Error');
    });
};

exports.createRoom = (req, res, next) => {
  const { name, isPrivate, inviteToken } = req.body;

  if (!req.session.user) {
    return res.status(401).send('Login required');
  }
  const room = new Room({
    name,
    createdBy: req.session.user.id,
    isPrivate: isPrivate === 'true',
    inviteToken: inviteToken?.trim() || undefined,
  });

  room
    .save()
    .then(() => res.redirect('/chat'))
    .catch((err) => {
      console.log(err);

      if (err.code === 11000 && err.keyPattern && err.keyPattern.inviteToken) {
        console.error('Duplicate inviteToken, retrying...');
        room.inviteToken = crypto.randomBytes(16).toString('hex');

        return room.save().then(() => res.redirect('/chat'));
      }
      res.status(500).send('Server Error');
    });
};

exports.viewRoom = (req, res, next) => {
  const roomId = req.params.id;

  Room.findById(roomId)
    .then((room) => {
      if (!room) return res.status(404).send('Room not found');

      return Message.find({ room: roomId })
        .populate('sender', 'name avatarPath')
        .sort({ createdAt: 1 })
        .lean()
        .then((messages) => {
          res.render('chat/room', {
            user: req.session.user || null,
            room,
            messages,
          });
        });
    })
    .catch((err) => {
      console.error('Room or Message Fetch Error:', err.message);
      res.status(500).send('Server Error');
    });
};

exports.getRoomById = (req, res, next) => {
  const roomId = req.params.id;
  const token = req.query.token;
  const user = req.session.user;

  Room.findById(roomId)
    .then((room) => {
      if (!room) return res.status(404).send('Room not found');

      if (room.isPrivate) {
        const isCreator = String(room.createdBy) === String(user.id);

        if (!isCreator) {
          const hasValidToken = token && token === room.inviteToken;

          if (!hasValidToken) {
            return res
              .status(403)
              .send(
                'This room is private. You must use a valid invite link to join.',
              );
          }
        }
      }

      return Message.find({ room: room._id })
        .populate('sender', 'name avatarPath')
        .sort({ createdAt: 1 })
        .lean()
        .then((messages) => {
          res.render('chat/room', {
            user,
            room,
            messages,
          });
        });
    })
    .catch((err) => {
      console.error('getRoomById Error:', err.message);
      res.status(500).send('Server Error');
    });
};

exports.postMessage = (req, res, next) => {
  const roomId = req.params.id;
  const { text } = req.body;

  if (!text || !text.trim()) return res.redirect(`/chat/rooms/${roomId}`);

  const newMessage = new Message({
    room: roomId,
    sender: req.session.user.id,
    text: text.trim(),
  });

  newMessage
    .save()
    .then(() => res.redirect(`/chat/rooms/${roomId}`))
    .catch((err) => {
      console.error('Save Message Error:', err.message);
      res.status(500).send('Server Error');
    });
};
