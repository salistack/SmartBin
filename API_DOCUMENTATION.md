# SmartBin API Documentation

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <your-jwt-token>
```

## Response Format
All responses follow this format:
```json
{
  "success": true|false,
  "message": "Response message",
  "data": {}, // For successful responses
  "error": "Error message" // For error responses
}
```

## Authentication Routes (`/api/auth`)

### POST `/register`
Register a new user.

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "resident", // "resident" | "collector" | "admin"
  "address": "123 Main St"
}
```

**Response:**
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "resident",
      "address": "123 Main St"
    },
    "token": "jwt-token-here"
  }
}
```

### POST `/login`
Login with email and password.

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "resident"
    },
    "token": "jwt-token-here"
  }
}
```

## Bin Routes (`/api/bins`)

### GET `/` (Protected)
Get all bins (collectors/admins see all, residents see their own).

**Response:**
```json
{
  "success": true,
  "message": "Bins retrieved successfully",
  "data": [
    {
      "_id": "...",
      "type": "organic",
      "location": {
        "type": "Point",
        "coordinates": [latitude, longitude]
      },
      "fillLevel": 75,
      "resident": "...",
      "lastEmptied": "2023-10-01T10:00:00.000Z"
    }
  ]
}
```

### POST `/` (Protected - Residents only)
Create a new bin.

**Request Body:**
```json
{
  "type": "organic", // "organic" | "recyclable" | "general"
  "location": {
    "type": "Point",
    "coordinates": [latitude, longitude]
  }
}
```

### PUT `/:binId/filth` (Protected - Residents only)
Add filth to a bin (increase fill level).

**URL Parameters:**
- `binId`: MongoDB ObjectId of the bin

**Request Body:**
```json
{
  "addedFilth": 25 // Number between 1-100
}
```

### PUT `/:binId/empty` (Protected - Collectors only)
Empty a bin (reset fill level to 0).

**URL Parameters:**
- `binId`: MongoDB ObjectId of the bin

## Collection Routes (`/api/collections`)

### GET `/` (Protected)
Get collection requests (residents see their own, collectors/admins see all).

**Response:**
```json
{
  "success": true,
  "message": "Collection requests retrieved successfully",
  "data": [
    {
      "_id": "...",
      "resident": "...",
      "bins": ["bin-id-1", "bin-id-2"],
      "scheduledDate": "2023-10-15T09:00:00.000Z",
      "status": "pending",
      "priority": "high",
      "createdAt": "2023-10-01T10:00:00.000Z"
    }
  ]
}
```

### POST `/request` (Protected - Residents only)
Create a collection request.

**Request Body:**
```json
{
  "bins": ["bin-id-1", "bin-id-2"], // Array of bin ObjectIds
  "scheduledDate": "2023-10-15T09:00:00.000Z", // ISO date string
  "priority": "high" // "low" | "medium" | "high"
}
```

### PUT `/:requestId/status` (Protected - Collectors only)
Update collection request status.

**URL Parameters:**
- `requestId`: MongoDB ObjectId of the collection request

**Request Body:**
```json
{
  "status": "completed" // "pending" | "in-progress" | "completed" | "cancelled"
}
```

## User Routes (`/api/users`)

### GET `/profile` (Protected)
Get current user's profile.

**Response:**
```json
{
  "success": true,
  "message": "Profile retrieved successfully",
  "data": {
    "_id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "role": "resident",
    "address": "123 Main St",
    "createdAt": "2023-10-01T10:00:00.000Z"
  }
}
```

### PUT `/profile` (Protected)
Update current user's profile.

**Request Body:**
```json
{
  "name": "John Smith",
  "address": "456 Oak Ave"
}
```

## Admin Routes (`/api/admin`)

### GET `/users` (Protected - Admins only)
Get all users.

**Response:**
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "_id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "role": "resident",
      "address": "123 Main St",
      "createdAt": "2023-10-01T10:00:00.000Z"
    }
  ]
}
```

### GET `/stats` (Protected - Admins only)
Get system statistics.

**Response:**
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalUsers": 150,
    "totalBins": 300,
    "totalCollections": 1250,
    "averageFillLevel": 65.5,
    "usersByRole": {
      "resident": 140,
      "collector": 8,
      "admin": 2
    },
    "binsByType": {
      "organic": 120,
      "recyclable": 100,
      "general": 80
    },
    "collectionsByStatus": {
      "pending": 15,
      "in-progress": 5,
      "completed": 1200,
      "cancelled": 30
    }
  }
}
```

## Error Codes

| Code | Description |
|------|-------------|
| 400  | Bad Request - Invalid input data |
| 401  | Unauthorized - Missing or invalid token |
| 403  | Forbidden - Insufficient permissions |
| 404  | Not Found - Resource not found |
| 409  | Conflict - Resource already exists |
| 422  | Unprocessable Entity - Validation failed |
| 500  | Internal Server Error |

## Data Types and Constraints

### User Roles
- `resident`: Can manage their own bins and collection requests
- `collector`: Can view all bins and manage collection requests
- `admin`: Full access to all resources and statistics

### Bin Types
- `organic`: For biodegradable waste
- `recyclable`: For recyclable materials
- `general`: For general waste

### Collection Status
- `pending`: Request created, waiting for assignment
- `in-progress`: Collection in progress
- `completed`: Collection finished successfully
- `cancelled`: Request cancelled

### Priority Levels
- `low`: Standard collection timing
- `medium`: Expedited collection
- `high`: Urgent collection required

### Validation Rules
- Email must be valid format and unique
- Password minimum 6 characters
- Name minimum 3 characters
- Fill level must be 0-100
- Added filth must be 1-100
- ObjectIds must be valid MongoDB ObjectIds
- Coordinates must be valid [latitude, longitude] format