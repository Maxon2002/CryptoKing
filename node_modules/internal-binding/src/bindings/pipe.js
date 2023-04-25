'use strict';

const { Socket, _createServerHandle } = require('net');

function extractPipe() {
  let Pipe;
  let PipeConnectWrap;

  const path = `\\\\.\\pipe\\node-binding.pipe.${process.pid}`;
  const handle = _createServerHandle(path, -1, -1);

  handle.connect = (req, address, port) => {
    Pipe = handle.constructor;
    PipeConnectWrap = req.constructor;
    return 0;
  };

  const socket = new Socket({ handle });

  socket.on('error', err => {});
  socket.connect({ path });

  return {
    Pipe,
    PipeConnectWrap,
    PipeConstants: {
      SOCKET: 0,
      SERVER: 1,
      IPC: 2,
    },
  };
}

module.exports = extractPipe();
