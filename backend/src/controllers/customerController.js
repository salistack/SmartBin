    const CollectionRequest = require('../models/CollectionRequest');
    const Bin = require('../models/Bin');

    // Request a collection
    exports.requestCollection = async (req, res) => {
    try {
        const { binId, customerId } = req.body;
        const request = await CollectionRequest.create({ bin: binId, customer: customerId });
        res.status(201).json({ message: 'Collection requested', request });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
    };

    // Get collection history
    exports.getCollectionHistory = async (req, res) => {
    try {
        const customerId = req.params.id;
        const history = await CollectionRequest.find({ customer: customerId })
        .populate('bin', 'location fillLevel')
        .sort({ requestedAt: -1 });

        res.json(history);
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Server error' });
    }
    };
