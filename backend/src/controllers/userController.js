const User = require('../models/User');
const { validateCoordinates, sanitizeString, createErrorResponse } = require('../utils/validation');
const { HTTP_STATUS, VALIDATION_LIMITS } = require('../constants');
const { asyncHandler } = require('../middlewares/errorMiddleware');

// Allow residents to update their profile details
exports.updateProfile = asyncHandler(async(req, res) => {
  const user = await User.findById(req.user.id);
  if (!user) {
    return res.status(HTTP_STATUS.NOT_FOUND).json(
      createErrorResponse('User not found')
    );
  }

  if (user.role !== 'resident') {
    return res.status(HTTP_STATUS.FORBIDDEN).json(
      createErrorResponse('Only residents can update these details')
    );
  }

  const { name, address } = req.body || {};

  if (typeof name === 'string') {
    const trimmed = sanitizeString(name, VALIDATION_LIMITS.NAME_MAX_LENGTH);
    if (!trimmed || trimmed.length < VALIDATION_LIMITS.NAME_MIN_LENGTH) {
      return res.status(HTTP_STATUS.BAD_REQUEST).json(
        createErrorResponse(`Name must be between ${VALIDATION_LIMITS.NAME_MIN_LENGTH}-${VALIDATION_LIMITS.NAME_MAX_LENGTH} characters`)
      );
    }
    user.name = trimmed;
  }

  if (address && typeof address === 'object') {
    const nextAddress = {
      ...(user.address?.toObject ? user.address.toObject() : user.address || {})
    };

    if ('street' in address) {
      nextAddress.street = sanitizeString(address.street, VALIDATION_LIMITS.ADDRESS_STREET_MAX);
    }
    if ('city' in address) {
      nextAddress.city = sanitizeString(address.city, VALIDATION_LIMITS.ADDRESS_CITY_MAX);
    }
    if ('postalCode' in address) {
      nextAddress.postalCode = sanitizeString(address.postalCode, VALIDATION_LIMITS.ADDRESS_POSTAL_MAX);
    }

    if ('lat' in address && 'lng' in address) {
      const latValue = address.lat;
      const lngValue = address.lng;

      if (latValue === null || latValue === '' || lngValue === null || lngValue === '') {
        // Remove coordinates
        delete nextAddress.lat;
        delete nextAddress.lng;
      } else if (validateCoordinates(latValue, lngValue)) {
        nextAddress.lat = latValue;
        nextAddress.lng = lngValue;
      } else {
        return res.status(HTTP_STATUS.BAD_REQUEST).json(
          createErrorResponse(
            `Invalid coordinates. Latitude must be between ${VALIDATION_LIMITS.COORDINATE_LAT_MIN} and ${VALIDATION_LIMITS.COORDINATE_LAT_MAX}, longitude between ${VALIDATION_LIMITS.COORDINATE_LNG_MIN} and ${VALIDATION_LIMITS.COORDINATE_LNG_MAX}`
          )
        );
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
      address: user.address
    }
  });
});
