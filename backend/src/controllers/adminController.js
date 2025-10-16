const User = require('../models/User');

let Bin = null;
let Collection = null;

try {
  Bin = require('../models/Bin');
} catch (_) {
  Bin = null;
}

try {
  Collection = require('../models/Collection');
} catch (_) {
  Collection = null;
}

exports.getDashboard = async (req, res) => {
  try {
    const windowDays = 7;
    const now = new Date();
    const startWindow = new Date(now);
    startWindow.setDate(now.getDate() - (windowDays - 1));
    startWindow.setHours(0, 0, 0, 0);

    const [totalUsers, roleBreakdown, recentUsers, registrationAgg] = await Promise.all([
      User.countDocuments(),
      User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
      User.find().sort({ createdAt: -1 }).limit(6).select('name email role createdAt'),
      User.aggregate([
        { $match: { createdAt: { $gte: startWindow } } },
        {
          $group: {
            _id: {
              day: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
              role: '$role',
            },
            count: { $sum: 1 },
          },
        },
      ]),
    ]);

    const roleOrder = ['resident', 'collector', 'admin'];
    const roleMap = roleOrder.reduce((acc, role) => ({ ...acc, [role]: 0 }), {});
    roleBreakdown.forEach(({ _id, count }) => {
      if (roleMap[_id] !== undefined) {
        roleMap[_id] = count;
      }
    });

    const [binTotals, collectionTotals] = await Promise.all([
      Bin ? Bin.countDocuments() : Promise.resolve(null),
      Collection ? Collection.countDocuments() : Promise.resolve(null),
    ]);

    const dayKeys = [];
    const registrationSeries = {
      labels: [],
      series: {
        resident: new Array(windowDays).fill(0),
        collector: new Array(windowDays).fill(0),
        admin: new Array(windowDays).fill(0),
      },
    };

    for (let i = 0; i < windowDays; i += 1) {
      const day = new Date(startWindow);
      day.setDate(startWindow.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      dayKeys.push(key);
      registrationSeries.labels.push(day.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
    }

    registrationAgg.forEach(({ _id, count }) => {
      const dayIndex = dayKeys.indexOf(_id.day);
      if (dayIndex >= 0 && registrationSeries.series[_id.role] != null) {
        registrationSeries.series[_id.role][dayIndex] = count;
      }
    });

    let collectionStatuses = null;
    if (Collection) {
      try {
        const collectionAgg = await Collection.aggregate([
          { $group: { _id: '$status', count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]);
        if (collectionAgg.length) {
          collectionStatuses = {
            labels: collectionAgg.map(({ _id }) => (_id || 'Unknown').toString()),
            series: collectionAgg.map(({ count }) => count),
          };
        }
      } catch (err) {
        console.warn('[ADMIN][DASHBOARD][COLLECTIONS]', err.message);
      }
    }

    let binStatus = null;
    if (Bin && Bin.schema) {
      const groupField = Bin.schema.path('status') ? '$status' : Bin.schema.path('type') ? '$type' : null;
      const dimension = Bin.schema.path('status') ? 'status' : Bin.schema.path('type') ? 'type' : null;
      if (groupField && dimension) {
        try {
          const binAgg = await Bin.aggregate([
            { $group: { _id: groupField, count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]);
          if (binAgg.length) {
            binStatus = {
              labels: binAgg.map(({ _id }) => (_id || 'Unknown').toString()),
              series: binAgg.map(({ count }) => count),
              dimension,
            };
          }
        } catch (err) {
          console.warn('[ADMIN][DASHBOARD][BINS]', err.message);
        }
      }
    }

    res.json({
      metrics: {
        users: { total: totalUsers, byRole: roleMap },
        bins: binTotals != null ? { total: binTotals } : null,
        collections: collectionTotals != null ? { total: collectionTotals } : null,
      },
      charts: {
        registrations: registrationSeries,
        roleDistribution: {
          labels: roleOrder,
          series: roleOrder.map((role) => roleMap[role] ?? 0),
        },
        collectionStatuses,
        binStatus,
      },
      recentUsers,
    });
  } catch (err) {
    console.error('[ADMIN][DASHBOARD]', err);
    res.status(500).json({ message: 'Failed to load admin dashboard data' });
  }
};

exports.getUsersReport = async (req, res) => {
  try {
    const users = await User.find().select('name email role createdAt');
    res.json(users);
  } catch (err) {
    console.error('[ADMIN][USERS REPORT]', err);
    res.status(500).json({ message: 'Failed to generate users report' });
  }
};

exports.getBinsReport = async (req, res) => {
  try {
    if (!Bin) return res.status(404).json({ message: 'Bins model not available' });
    const bins = await Bin.find().select('_id status type createdAt');
    res.json(bins);
  } catch (err) {
    console.error('[ADMIN][BINS REPORT]', err);
    res.status(500).json({ message: 'Failed to generate bins report' });
  }
};

exports.getCollectionsReport = async (req, res) => {
  try {
    if (!Collection) return res.status(404).json({ message: 'Collections model not available' });
    const collections = await Collection.find().select('_id status createdAt');
    res.json(collections);
  } catch (err) {
    console.error('[ADMIN][COLLECTIONS REPORT]', err);
    res.status(500).json({ message: 'Failed to generate collections report' });
  }
};

exports.getOverviewReport = async (req, res) => {
  try {
    const [totalUsers, totalBins, totalCollections] = await Promise.all([
      User.countDocuments(),
      Bin ? Bin.countDocuments() : Promise.resolve(0),
      Collection ? Collection.countDocuments() : Promise.resolve(0),
    ]);
    res.json({ totalUsers, totalBins, totalCollections });
  } catch (err) {
    console.error('[ADMIN][OVERVIEW REPORT]', err);
    res.status(500).json({ message: 'Failed to generate overview report' });
  }
};

exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('name email role createdAt');
    res.json(users);
  } catch (err) {
    console.error('[ADMIN][USERS]', err);
    res.status(500).json({ message: 'Failed to fetch users' });
  }
};

exports.getBins = async (req, res) => {
  try {
    if (!Bin) {
      console.warn('[ADMIN][BINS] Bin model unavailable; returning empty list.');
      return res.json([]);
    }
    const bins = await Bin.find().select('_id status type createdAt');
    res.json(bins);
  } catch (err) {
    console.error('[ADMIN][BINS]', err);
    res.status(500).json({ message: 'Failed to fetch bins' });
  }
};

exports.getCollections = async (req, res) => {
  try {
    if (!Collection) {
      console.warn('[ADMIN][COLLECTIONS] Collection model unavailable; returning empty list.');
      return res.json([]);
    }
    const collections = await Collection.find().select('_id status createdAt');
    res.json(collections);
  } catch (err) {
    console.error('[ADMIN][COLLECTIONS]', err);
    res.status(500).json({ message: 'Failed to fetch collections' });
  }
};

function buildSampleRoute(area, schedule, truck, extraWarnings = []) {
  const timestamp = new Date().toISOString();
  const route = [
    {
      sequence: 1,
      binId: 'SAMPLE-001',
      displayName: 'Sample Bin Alpha',
      status: 'full',
      fillLevel: 94,
      capacity: 240,
      location: { street: '101 Prototype Ave', city: area || 'Demo District' },
      lastUpdated: timestamp,
    },
    {
      sequence: 2,
      binId: 'SAMPLE-002',
      displayName: 'Sample Bin Beta',
      status: 'needs-pickup',
      fillLevel: 87,
      capacity: 240,
      location: { street: '22 Simulation Blvd', city: area || 'Demo District' },
      lastUpdated: timestamp,
    },
    {
      sequence: 3,
      binId: 'SAMPLE-003',
      displayName: 'Sample Bin Gamma',
      status: 'overflow',
      fillLevel: 99,
      capacity: 360,
      location: { street: '7 Benchmark Way', city: area || 'Demo District' },
      lastUpdated: timestamp,
    },
  ];

  return {
    summary: {
      area: area || 'Sample Test Area',
      window: schedule || {},
      totalBinsConsidered: route.length,
      selectedBins: route.length,
      assignedTruck: truck?.id || 'SIM-TRK-01',
    },
    estimated: {
      distanceKm: Number((route.length * 2.1).toFixed(1)),
      durationMinutes: route.length * 10,
    },
    route,
    warnings: [
      'Live optimization unavailable; displaying sample route.',
      ...extraWarnings.filter(Boolean),
    ],
    generatedAt: timestamp,
    delivery: { status: 'sample' },
  };
}

exports.optimizeRoute = async (req, res) => {
  const { area, schedule = {}, truck = {} } = req.body || {};
  try {
    if (!area || !schedule.start || !schedule.end) {
      return res.status(400).json({ message: 'Area and schedule (start/end) are required.' });
    }

    if (!Bin) {
      return res.json(buildSampleRoute(area, schedule, truck, ['Bin model unavailable.']));
    }

    let bins;
    try {
      bins = await Bin.find().select('_id status type fillLevel capacity location address updatedAt createdAt');
    } catch (queryErr) {
      console.error('[ADMIN][ROUTE OPTIMIZATION][QUERY]', queryErr);
      return res.json(buildSampleRoute(area, schedule, truck, ['Bin query failed; using simulation data.']));
    }

    const totalConsidered = bins.length;
    const candidateBins = bins.filter((bin) => {
      const fill = typeof bin.fillLevel === 'number' ? bin.fillLevel : null;
      const status = (bin.status || '').toLowerCase();
      if (fill != null) return fill >= 60;
      if (status) return !['empty', 'available'].includes(status);
      return true;
    });

    if (!candidateBins.length) {
      return res.json({
        summary: {
          area,
          window: schedule,
          totalBinsConsidered,
          selectedBins: 0,
          assignedTruck: truck.id || null,
        },
        estimated: { distanceKm: 0, durationMinutes: 0 },
        route: [],
        warnings: ['No bins in the selected area require collection.'],
        generatedAt: new Date().toISOString(),
        delivery: { status: truck.id ? 'pending-dispatch' : 'queued' },
      });
    }

    const prioritized = [...candidateBins].sort((a, b) => {
      const fillA = typeof a.fillLevel === 'number' ? a.fillLevel : 0;
      const fillB = typeof b.fillLevel === 'number' ? b.fillLevel : 0;
      if (fillA !== fillB) return fillB - fillA;
      return (b.updatedAt || b.createdAt || 0) - (a.updatedAt || a.createdAt || 0);
    });

    const capacity = Number(truck.capacity) > 0 ? Number(truck.capacity) : prioritized.length;
    const selected = prioritized.slice(0, capacity);

    const route = selected.map((bin, idx) => ({
      sequence: idx + 1,
      binId: bin._id,
      displayName: bin.code || bin.name || `Bin ${idx + 1}`,
      status: bin.status || 'unknown',
      fillLevel: typeof bin.fillLevel === 'number' ? bin.fillLevel : null,
      capacity: bin.capacity || null,
      location: bin.location || bin.address || null,
      lastUpdated: bin.updatedAt || bin.createdAt || null,
    }));

    const estimatedDistance = Number((route.length * 2.4).toFixed(1));
    const estimatedDuration = route.length * 12;
    const assignedTruck = truck.id || `TRK-${Math.floor(Math.random() * 900 + 100)}`;
    const deliveryStatus = truck.id ? 'dispatched' : 'queued';

    res.json({
      summary: {
        area,
        window: schedule,
        totalBinsConsidered,
        selectedBins: route.length,
        assignedTruck,
      },
      estimated: {
        distanceKm: estimatedDistance,
        durationMinutes: estimatedDuration,
      },
      route,
      warnings: [],
      generatedAt: new Date().toISOString(),
      delivery: { status: deliveryStatus },
    });
  } catch (err) {
    console.error('[ADMIN][ROUTE OPTIMIZATION]', err);
    res.json(buildSampleRoute(area, schedule, truck, [err.message]));
  }
};
