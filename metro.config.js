const { getDefaultConfig } = require("expo/metro-config");

const config = getDefaultConfig(__dirname);

// Windows + OneDrive path'lerinde child process spawn hatasini engellemek icin
// Metro transformer'ini tek worker ile ayni process'te calistir.
config.maxWorkers = 1;
config.transformer.unstable_workerThreads = true;
config.watcher.unstable_workerThreads = true;

module.exports = config;
