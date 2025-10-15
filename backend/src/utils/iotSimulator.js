const Bin = require('../models/Bin');

// Generate random fill level changes
function randomFillIncrement(prevLevel) {
  const increase = Math.floor(Math.random() * 10);
  const newLevel = prevLevel + increase;
  return newLevel > 100 ? 100 : newLevel;
}

// Start the IoT simulation
async function startIoTSimulation() {
  console.log('🟢 IoT Simulation started...');

  setInterval(async () => {
    try {
      const bins = await Bin.find();
      for (const bin of bins) {
        const newLevel = randomFillIncrement(bin.fillLevel);
        bin.fillLevel = newLevel;
        bin.lastUpdated = new Date();
        await bin.save();

        if (newLevel >= 90) {
          console.log(`⚠️  Bin at ${bin.location} (${bin.type}) is almost full: ${newLevel}%`);
        }
      }
    } catch (err) {
      console.error('IoT simulation error:', err.message);
    }
  }, 10000); // every 10 seconds
}

module.exports = { startIoTSimulation };
