const { createMemory } = require('./memory');
const { createFileStore } = require('./fileStore');

const memory = createMemory(createFileStore());

module.exports = memory;
module.exports.createMemory = createMemory;
module.exports.createFileStore = createFileStore;