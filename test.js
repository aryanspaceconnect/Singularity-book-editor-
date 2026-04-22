import('./server.ts').then(() => { console.log('success'); setTimeout(() => process.exit(0), 1000); }).catch(e => { console.error(e); process.exit(1); })
