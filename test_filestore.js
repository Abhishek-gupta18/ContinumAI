const { createFileStore } = require('./memory/fileStore');
const store = createFileStore();
store.listSessions().then(sessions => {
  console.log('Sessions:', JSON.stringify(sessions, null, 2));
  return store.getSessionNodes('t-failover-demo');
}).then(nodes => {
  console.log('Nodes:', JSON.stringify(nodes, null, 2));
}).catch(e => console.error(e));