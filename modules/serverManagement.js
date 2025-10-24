// 🏰 serverManagement.js v1.4.2 — Full Integration
import logging from './logging.js';
import vcManagement from './vcManagement.js';
import scanLinks from './scanLinks.js';
import setupMusicPro from './musicCommands.js';

export default async function serverManagement(client) {
  try {
    await logging(client);
    await vcManagement(client);
    await scanLinks(client);
    await setupMusicPro(client);

    client.once('clientReady', () => {
      console.log('✅ Server Management fully operational. Ready for commands.');
    });

    client.on('error', (err) => console.error('[CLIENT ERROR]', err));
    client.on('warn', (warn) => console.warn('[CLIENT WARN]', warn));

  } catch (err) {
    console.error('[SERVER MANAGEMENT] Initialization failed:', err);
  }
}
