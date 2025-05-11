# MPP X App

A full-stack web application with user monitoring and authentication features.

## Features

- User Authentication (Register/Login)
- Role-based Access Control (User/Admin)
- Activity Monitoring System
- Suspicious Activity Detection
- Admin Dashboard
- Real-time Post Generation
- File Upload Support

## Tech Stack

- Frontend: React.js
- Backend: Node.js, Express.js
- Database: MySQL
- Authentication: JWT
- Real-time: WebSocket

## Prerequisites

- Node.js (v14 or higher)
- MySQL Server
- npm or yarn

## Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd MPP_x_app
```

2. Install dependencies:
```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../src
npm install
```

3. Configure the database:
- Create a MySQL database named `mpp_x_db`
- Update database configuration in `backend/config/database.js` if needed

4. Start the application:
```bash
# Start backend server
cd backend
npm start

# Start frontend development server
cd ../src
npm start
```

## Project Structure

```
MPP_x_app/
├── backend/
│   ├── config/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── scripts/
│   ├── services/
│   └── uploads/
├── src/
│   ├── components/
│   ├── App.js
│   └── index.js
└── README.md
```

## API Endpoints

### Authentication
- POST `/api/auth/register` - Register new user
- POST `/api/auth/login` - User login

### Admin
- GET `/api/admin/monitored-users` - Get list of monitored users
- GET `/api/admin/user-activity/:userId` - Get user activity logs
- GET `/api/admin/suspicious-activity` - Get suspicious activity summary
- POST `/api/admin/toggle-monitoring/:userId` - Toggle user monitoring status

### Posts
- GET `/posts` - Get all posts
- POST `/posts` - Create new post
- PUT `/posts/:id` - Update post
- DELETE `/posts/:id` - Delete post

## Testing

To run the attack simulation:
```bash
cd backend
node scripts/simulateAttack.js
```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## License

This project is licensed under the MIT License - see the LICENSE file for details.