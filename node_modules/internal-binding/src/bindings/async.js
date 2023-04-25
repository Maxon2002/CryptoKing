'use strict';

const { randomBytes } = require('crypto');

const AsyncProviders = {
  NONE: 0,
  DNSCHANNEL: 1,
  FILEHANDLE: 2,
  FILEHANDLECLOSEREQ: 3,
  FSEVENTWRAP: 4,
  FSREQWRAP: 5,
  FSREQPROMISE: 6,
  GETADDRINFOREQWRAP: 7,
  GETNAMEINFOREQWRAP: 8,
  HTTP2SESSION: 9,
  HTTP2STREAM: 10,
  HTTP2PING: 11,
  HTTP2SETTINGS: 12,
  HTTPPARSER: 13,
  JSSTREAM: 14,
  MESSAGEPORT: 15,
  PIPECONNECTWRAP: 16,
  PIPESERVERWRAP: 17,
  PIPEWRAP: 18,
  PROCESSWRAP: 19,
  PROMISE: 20,
  QUERYWRAP: 21,
  SHUTDOWNWRAP: 22,
  SIGNALWRAP: 23,
  STATWATCHER: 24,
  STREAMPIPE: 25,
  TCPCONNECTWRAP: 26,
  TCPSERVERWRAP: 27,
  TCPWRAP: 28,
  TIMERWRAP: 29,
  TTYWRAP: 30,
  UDPSENDWRAP: 31,
  UDPWRAP: 32,
  WORKER: 33,
  WRITEWRAP: 34,
  ZLIB: 35,
  PBKDF2REQUEST: 36,
  RANDOMBYTESREQUEST: 37,
  SCRYPTREQUEST: 38,
  TLSWRAP: 39,
  INSPECTORJSBINDING: 40,
};

function extractAsync() {
  return new Promise((resolve, reject) => {
    randomBytes(0, function () {
      resolve({
        AsyncWrap: this.constructor,
        AsyncProviders,
      });
    });
  });
}

module.exports = extractAsync();
