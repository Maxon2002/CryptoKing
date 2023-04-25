'use strict';

const { Socket, _createServerHandle } = require('net');

function extractTcp() {
  return new Promise((resolve, reject) => {
    const handle = _createServerHandle('0.0.0.0', 1337);

    handle.connect = function (req, address, port) {
      resolve({
        TCP: handle.constructor,
        TCPConnectWrap: req.constructor,
        TCPConstants: {
          SOCKET: 0,
          SERVER: 1,
        },
      });

      return 0;
    };

    const socket = new Socket({ handle });

    socket.on('error', err => reject(err));
    socket.connect({ port: 1337, host: '0.0.0.0' });
  });
}

module.exports = extractTcp();
