// Generated by CoffeeScript 1.10.0
(function() {
  var Buffer, DEFAULT_READ_BUFFER_SIZE, EventEmitter, FRAME_TYPE, MAX_UINT_32, TooShortError, Transform, VERSION, assert, makeUint32Frame, ref,
    extend = function(child, parent) { for (var key in parent) { if (hasProp.call(parent, key)) child[key] = parent[key]; } function ctor() { this.constructor = child; } ctor.prototype = parent.prototype; child.prototype = new ctor(); child.__super__ = parent.prototype; return child; },
    hasProp = {}.hasOwnProperty;

  assert = require('assert');

  Buffer = require('buffer').Buffer;

  EventEmitter = require('events').EventEmitter;

  Transform = require('stream').Transform;

  ref = require('./constants'), FRAME_TYPE = ref.FRAME_TYPE, VERSION = ref.VERSION, MAX_UINT_32 = ref.MAX_UINT_32;

  TooShortError = function(message) {
    Error.captureStackTrace(this, TooShortError);
    this.name = 'TooShortError';
    return this.message = message;
  };

  TooShortError.prototype = Object.create(Error.prototype);

  makeUint32Frame = function(frameType, value) {
    var b, bOffset, totalLength;
    assert(value >= 0 && value <= MAX_UINT_32, "value must be a uint32.");
    totalLength = 1 + 1 + 4;
    b = new Buffer(totalLength);
    bOffset = 0;
    bOffset += b.write("" + VERSION + frameType);
    b.writeUInt32BE(value, bOffset);
    bOffset += 4;
    assert.equal(bOffset, totalLength);
    return b;
  };

  exports.makeWindowSizeFrame = function(size) {
    return makeUint32Frame(FRAME_TYPE.WINDOW_SIZE, size);
  };

  exports.makeAckFrame = function(sequence) {
    return makeUint32Frame(FRAME_TYPE.ACK, sequence);
  };

  exports.makeDataFrame = function(sequence, data) {
    var b, bOffset, dataArray, dataLength, frameType, totalLength, version;
    assert(data != null, "Need data!");
    version = '1';
    frameType = FRAME_TYPE.DATA;
    dataLength = 0;
    dataArray = Object.keys(data).filter(function(key) {
      return data[key] != null;
    }).map(function(key) {
      var keyLength, value, valueLength;
      value = "" + data[key];
      keyLength = Buffer.byteLength(key, 'utf8');
      valueLength = Buffer.byteLength(value, 'utf8');
      dataLength += 8 + keyLength + valueLength;
      return {
        key: key,
        keyLength: keyLength,
        value: value,
        valueLength: valueLength
      };
    });
    totalLength = 2 + 8 + dataLength;
    b = new Buffer(totalLength);
    bOffset = 0;
    bOffset += b.write("" + version + frameType);
    b.writeUInt32BE(sequence, bOffset);
    bOffset += 4;
    b.writeUInt32BE(dataArray.length, bOffset);
    bOffset += 4;
    dataArray.forEach(function(datum) {
      b.writeUInt32BE(datum.keyLength, bOffset);
      bOffset += 4;
      bOffset += b.write(datum.key, bOffset);
      b.writeUInt32BE(datum.valueLength, bOffset);
      bOffset += 4;
      return bOffset += b.write(datum.value, bOffset);
    });
    assert.equal(bOffset, totalLength);
    return b;
  };

  DEFAULT_READ_BUFFER_SIZE = 4096;

  exports.Parser = (function(superClass) {
    extend(Parser, superClass);

    function Parser() {
      Parser.__super__.constructor.apply(this, arguments);
      this._writableState.objectMode = false;
      this._readableState.objectMode = true;
      this._buffer = null;
      this._readBytes = 0;
    }

    Parser.prototype._enlargeBuffer = function() {
      var newBuffer;
      newBuffer = new Buffer(Math.max(this._buffer.length * 2, DEFAULT_READ_BUFFER_SIZE));
      this._buffer.copy(newBuffer);
      return this._buffer = newBuffer;
    };

    Parser.prototype._transform = function(chunk, encoding, done) {
      var err, error;
      if (this._buffer == null) {
        this._buffer = chunk;
        this._readBytes = chunk.length;
      } else {
        while ((this._readBytes + chunk.length) > this._buffer.length) {
          this._enlargeBuffer();
        }
        chunk.copy(this._buffer, this._readBytes);
        this._readBytes += chunk.length;
      }
      try {
        this._parse();
        return done();
      } catch (error) {
        err = error;
        return this.emit('error', err);
      }
    };

    Parser.prototype._parse = function() {
      var consumed, frameType, frameTypeHex, oldBuffer, seq, version;
      consumed = 0;
      while (this._readBytes - consumed >= 6) {
        version = this._buffer.toString('UTF-8', consumed + 0, consumed + 1);
        assert(version === '1', "Version should be 1, is " + version);
        consumed += 1;
        frameType = this._buffer.toString('UTF-8', consumed + 0, consumed + 1);
        frameTypeHex = this._buffer.toString('hex', consumed + 0, consumed + 1);
        consumed += 1;
        switch (frameType) {
          case FRAME_TYPE.ACK:
            seq = this._buffer.readUInt32BE(consumed);
            this.push({
              type: 'ack',
              seq: seq
            });
            consumed += 4;
            break;
          default:
            throw new Error("Don't know how to parse frame of type '" + frameType + "'' (" + frameTypeHex + ")");
        }
      }
      if (consumed === this._readBytes) {
        return this._buffer = null;
      } else {
        oldBuffer = this._buffer;
        this._buffer = new Buffer(DEFAULT_READ_BUFFER_SIZE);
        while ((this._readBytes - consumed) > this._buffer.length) {
          this._enlargeBuffer;
        }
        oldBuffer.copy(this._buffer, 0, consumed, this._readBytes);
        return this._readBytes -= consumed;
      }
    };

    return Parser;

  })(Transform);

}).call(this);
