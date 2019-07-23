const { promisify } = require('util');
const sizeOfBuffer = require('buffer-image-size');
const sizeOf = require('image-size');
const sharp = require('sharp');

function measureImageFileSize(filePath) {
  return sizeOf(filePath);
}

function measureImageStreamSize(stream) {
  return sizeOfBuffer(stream);
}

module.exports = {
  measureImageFileSize,
  measureImageStreamSize,
}
