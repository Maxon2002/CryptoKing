# internal-binding

Node.js internal bindings, accessible from user land.

[![npm](https://img.shields.io/npm/v/internal-binding.svg)](https://www.npmjs.com/package/internal-binding)
[![GitHub license](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Build Status](https://travis-ci.org/AlexMasterov/internal-binding.js.svg)](https://travis-ci.org/AlexMasterov/internal-binding.js)
[![Coverage Status](https://coveralls.io/repos/github/AlexMasterov/internal-binding.js/badge.svg?branch=master)](https://coveralls.io/github/AlexMasterov/internal-binding.js?branch=master)

## Installation

```
npm install internal-binding
```

## Usage
```javascript
const {
  DiffieHellman,
  DiffieHellmanGroup,
  ECDH,
  Hash,
  Hmac,
  Sign,
  Verify,
  CryptoConstants,
} = require('internal-binding').Crypto;

const { WriteWrap } = require('internal-binding').Stream;

const {
  Pipe,
  PipeConnectWrap,
  PipeConstants,
} = require('internal-binding').Pipe;

// Some wraps requires asynchronous context!
(async () => {
  const {
    TCP,
    TCPConnectWrap,
    TCPConstants,
  } = await require('internal-binding').Tcp;

  const {
    AsyncWrap,
    AsyncProviders,
  } = await require('internal-binding').Async;
})();
