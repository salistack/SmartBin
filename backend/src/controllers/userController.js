const User = require('../models/User');

// Allow residents to update their profile details
exports.updateProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (user.role !== 'resident') {
      return res.status(403).json({ message: 'Only residents can update these details' });
    }

    const { name, address } = req.body || {};

    if (typeof name === 'string') {
      const trimmed = name.trim();
      if (!trimmed) {
        return res.status(400).json({ message: 'Name is required' });
      }
      user.name = trimmed;
    }

    if (address && typeof address === 'object') {
      const nextAddress = { ...(user.address?.toObject ? user.address.toObject() : user.address || {}) };

      if ('street' in address) nextAddress.street = address.street ?? '';
      if ('city' in address) nextAddress.city = address.city ?? '';
      if ('postalCode' in address) nextAddress.postalCode = address.postalCode ?? '';

      if ('lat' in address) {
        const latValue = address.lat;
        if (latValue === null || latValue === '') {
          delete nextAddress.lat;
        } else if (typeof latValue === 'number' && Number.isFinite(latValue) && latValue >= -90 && latValue <= 90) {
          nextAddress.lat = latValue;
        } else {
          return res.status(400).json({ message: 'Latitude must be a number between -90 and 90' });
        }
      }

      if ('lng' in address) {
        const lngValue = address.lng;
        if (lngValue === null || lngValue === '') {
          delete nextAddress.lng;
        } else if (typeof lngValue === 'number' && Number.isFinite(lngValue) && lngValue >= -180 && lngValue <= 180) {
          nextAddress.lng = lngValue;
        } else {
          return res.status(400).json({ message: 'Longitude must be a number between -180 and 180' });
        }
      }

      user.address = nextAddress;
      user.markModified('address');
    }

    await user.save();

    res.json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        address: user.address,
      },
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};