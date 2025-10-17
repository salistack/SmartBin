// Shared constants to ensure consistency across the application

// Bin types - single source of truth
const BIN_TYPES = {
  PLASTIC: 'Plastic',
  ORGANIC: 'Organic',
  PAPER: 'Paper',
  GLASS: 'Glass',
  METAL: 'Metal'
};

// User roles
const USER_ROLES = {
  RESIDENT: 'resident',
  COLLECTOR: 'collector',
  ADMIN: 'admin'
};

// Collection request statuses
const COLLECTION_STATUS = {
  PENDING: 'PENDING',
  COLLECTED: 'COLLECTED'
};

// Route delivery statuses
const DELIVERY_STATUS = {
  PENDING: 'pending',
  QUEUED: 'queued',
  DISPATCHED: 'dispatched',
  COMPLETED: 'completed',
  SAMPLE: 'sample'
};

// Validation limits
const VALIDATION_LIMITS = {
  NAME_MIN_LENGTH: 2,
  NAME_MAX_LENGTH: 100,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 128,
  ADDRESS_STREET_MAX: 200,
  ADDRESS_CITY_MAX: 100,
  ADDRESS_POSTAL_MAX: 20,
  FILTH_LEVEL_MAX: 1000,
  BIN_MAX_LEVEL_MIN: 1,
  BIN_MAX_LEVEL_MAX: 1000,
  COORDINATE_LAT_MIN: -90,
  COORDINATE_LAT_MAX: 90,
  COORDINATE_LNG_MIN: -180,
  COORDINATE_LNG_MAX: 180
};

// HTTP status codes for consistency
const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500
};

// Array exports for validation
const BIN_TYPES_ARRAY = Object.values(BIN_TYPES);
const USER_ROLES_ARRAY = Object.values(USER_ROLES);
const COLLECTION_STATUS_ARRAY = Object.values(COLLECTION_STATUS);
const PUBLIC_REGISTRATION_ROLES = [USER_ROLES.RESIDENT, USER_ROLES.COLLECTOR];

module.exports = {
  BIN_TYPES,
  USER_ROLES,
  COLLECTION_STATUS,
  DELIVERY_STATUS,
  VALIDATION_LIMITS,
  HTTP_STATUS,
  BIN_TYPES_ARRAY,
  USER_ROLES_ARRAY,
  COLLECTION_STATUS_ARRAY,
  PUBLIC_REGISTRATION_ROLES
};
