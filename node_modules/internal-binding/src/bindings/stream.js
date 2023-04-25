'use strict';

const { Socket } = require('net');

function extractStream() {
  let WriteWrap;

  const handle = {
    writeLatin1String: (req, data) => {
      WriteWrap = req.constructor;
      return 0;
    },
    close: () => {},
  };

  const socket = new Socket({ handle });

  socket.on('error', err => {});
  socket.connecting = false;
  socket.write('\x01', 'binary', () => socket.destroy());

  return {
    WriteWrap,
  };
}

module.exports = extractStream();
