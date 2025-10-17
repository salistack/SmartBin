# SmartBin - Intelligent Waste Management System

A comprehensive full-stack application for managing smart waste bins with real-time monitoring, collection optimization, and user role management.

## 🚀 Features

### Core Functionality
- **Smart Bin Management**: Create, monitor, and manage different types of waste bins
- **Real-time Fill Level Tracking**: Monitor bin capacity in real-time
- **Collection Request System**: Schedule and manage waste collection requests
- **Route Optimization**: Optimize collection routes for efficiency
- **Role-based Access Control**: Support for residents, collectors, and administrators

### User Roles
- **Residents**: Manage personal bins, create collection requests
- **Collectors**: View all bins, manage collection schedules, update statuses
- **Administrators**: Full system access, user management, analytics

## 🏗️ Architecture

### Backend (Node.js/Express)
- **Clean Architecture**: Service layer pattern with separation of concerns
- **RESTful API**: Well-structured endpoints with comprehensive validation
- **Authentication**: JWT-based authentication with role-based authorization
- **Database**: MongoDB with Mongoose ODM and proper indexing
- **Error Handling**: Centralized error handling with consistent responses
- **Validation**: Comprehensive input validation and sanitization

### Frontend (React)
- **Modern React**: Functional components with hooks
- **Responsive Design**: Mobile-first approach with Tailwind CSS
- **Route Protection**: Private routes based on user roles
- **Interactive Maps**: Real-time bin locations and route visualization
- **Dashboard Views**: Role-specific dashboards with relevant data

## 📁 Project Structure

```
SmartBin/
├── backend/
│   ├── src/
│   │   ├── config/           # Configuration management
│   │   ├── constants/        # Shared constants and enums
│   │   ├── controllers/      # HTTP request handlers
│   │   ├── middlewares/      # Custom middleware (auth, validation, error)
│   │   ├── models/          # MongoDB schemas and models
│   │   ├── routes/          # API route definitions
│   │   ├── services/        # Business logic layer
│   │   └── server.js        # Application entry point
│   ├── .env.example         # Environment variables template
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── api/             # API client configuration
│   │   ├── components/      # Reusable React components
│   │   ├── pages/           # Page components
│   │   └── assets/          # Static assets
│   └── package.json
├── API_DOCUMENTATION.md     # Complete API documentation
└── README.md
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or cloud instance)
- npm or yarn package manager

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd SmartBin
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Copy environment template and configure
   cp .env.example .env
   # Edit .env with your configuration
   
   # Start development server
   npm run dev
   ```

3. **Frontend Setup**
   ```bash
   cd frontend
   npm install
   
   # Start development server
   npm run dev
   ```

### Environment Configuration

Create a `.env` file in the backend directory:

```env
# Server Configuration
PORT=5000
NODE_ENV=development

# Database
MONGO_URI=mongodb://127.0.0.1:27017/smartbin

# Authentication
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=7d

# Security
BCRYPT_ROUNDS=12
PASSWORD_MIN_LENGTH=6
USERNAME_MIN_LENGTH=3

# App Metadata
APP_NAME=SmartBin
APP_VERSION=1.0.0
```

## 📚 API Documentation

Comprehensive API documentation is available in [API_DOCUMENTATION.md](./API_DOCUMENTATION.md).

### Key Endpoints
- **Authentication**: `/api/auth/login`, `/api/auth/register`
- **Bins**: `/api/bins` (CRUD operations, fill level management)
- **Collections**: `/api/collections` (request management, status updates)
- **Users**: `/api/users/profile` (profile management)
- **Admin**: `/api/admin` (user management, system statistics)

## 🏃‍♂️ Development

### Backend Development
```bash
cd backend
npm run dev  # Start with nodemon for auto-reload
```

### Frontend Development
```bash
cd frontend
npm run dev  # Start Vite development server
```

### Production Build
```bash
# Frontend
cd frontend
npm run build

# Backend
cd backend
npm start
```

## 🧪 Code Quality Features

### Backend Best Practices
- **Service Layer Pattern**: Business logic separated from HTTP concerns
- **Centralized Configuration**: Environment-based configuration management
- **Input Validation**: Comprehensive validation middleware
- **Error Handling**: Global error handling with consistent responses
- **Security**: JWT authentication, password hashing, input sanitization
- **Database**: Proper indexing, schema validation, relationship management

### Frontend Best Practices
- **Component Architecture**: Reusable, modular components
- **State Management**: Efficient state handling with React hooks
- **Route Protection**: Role-based route access control
- **Responsive Design**: Mobile-first responsive layouts
- **Performance**: Code splitting and optimization

## 🔧 Configuration

### Database Configuration
The application uses MongoDB with the following collections:
- **users**: User accounts and authentication
- **bins**: Waste bin information and locations
- **collectionrequests**: Collection scheduling and management

### Authentication & Authorization
- JWT-based authentication
- Role-based access control (RBAC)
- Password hashing with bcrypt
- Token expiration management

## 🔒 Security Features
- Password encryption
- JWT token authentication
- Input validation and sanitization
- Role-based access control
- Environment variable protection
- Error message sanitization

## 📊 Monitoring & Analytics
- Real-time bin fill level monitoring
- Collection request tracking
- System usage statistics
- User activity analytics
- Performance metrics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Commit changes: `git commit -am 'Add new feature'`
4. Push to branch: `git push origin feature/new-feature`
5. Submit a pull request

### Code Style Guidelines
- Follow ESLint configuration
- Use meaningful variable and function names
- Write comprehensive comments for complex logic
- Follow the established project structure
- Write unit tests for new features

## 📝 License

This project is licensed under the ISC License.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Check the API documentation
- Review the code comments and documentation

## 🔮 Future Enhancements

- Real-time notifications
- Mobile application
- IoT sensor integration
- Advanced analytics dashboard
- Automated route optimization
- Integration with city waste management systems