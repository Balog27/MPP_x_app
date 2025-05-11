### Project Setup

1. **Initialize the Project**:
   ```bash
   mkdir blog-app
   cd blog-app
   npm init -y
   ```

2. **Install Dependencies**:
   ```bash
   npm install express sequelize sqlite3 body-parser cors
   ```

   - **express**: Web framework for Node.js.
   - **sequelize**: ORM for Node.js.
   - **sqlite3**: SQLite database engine.
   - **body-parser**: Middleware to parse request bodies.
   - **cors**: Middleware to enable CORS.

3. **Project Structure**:
   ```plaintext
   blog-app/
   ├── models/
   │   ├── index.js
   │   ├── user.js
   │   └── post.js
   ├── routes/
   │   ├── userRoutes.js
   │   └── postRoutes.js
   ├── config/
   │   └── database.js
   ├── server.js
   └── package.json
   ```

### Database Configuration

4. **Create Database Configuration**:
   Create a file `config/database.js` to configure Sequelize.

   ```javascript
   const { Sequelize } = require('sequelize');

   const sequelize = new Sequelize({
     dialect: 'sqlite',
     storage: 'database.sqlite',
   });

   module.exports = sequelize;
   ```

### Define Models

5. **Create User Model**:
   Create a file `models/user.js`.

   ```javascript
   const { DataTypes } = require('sequelize');
   const sequelize = require('../config/database');

   const User = sequelize.define('User', {
     username: {
       type: DataTypes.STRING,
       allowNull: false,
       unique: true,
     },
     email: {
       type: DataTypes.STRING,
       allowNull: false,
       unique: true,
     },
   });

   module.exports = User;
   ```

6. **Create Post Model**:
   Create a file `models/post.js`.

   ```javascript
   const { DataTypes } = require('sequelize');
   const sequelize = require('../config/database');
   const User = require('./user');

   const Post = sequelize.define('Post', {
     title: {
       type: DataTypes.STRING,
       allowNull: false,
     },
     content: {
       type: DataTypes.TEXT,
       allowNull: false,
     },
   });

   // Define associations
   Post.belongsTo(User, { foreignKey: 'userId' });
   User.hasMany(Post, { foreignKey: 'userId' });

   module.exports = Post;
   ```

7. **Initialize Models**:
   Create a file `models/index.js`.

   ```javascript
   const sequelize = require('../config/database');
   const User = require('./user');
   const Post = require('./post');

   const initDb = async () => {
     await sequelize.sync({ force: true }); // Use force: true for development to reset the database
     console.log('Database & tables created!');
   };

   initDb();

   module.exports = { User, Post };
   ```

### Create Routes

8. **Create User Routes**:
   Create a file `routes/userRoutes.js`.

   ```javascript
   const express = require('express');
   const { User } = require('../models');

   const router = express.Router();

   // Create User
   router.post('/', async (req, res) => {
     try {
       const user = await User.create(req.body);
       res.status(201).json(user);
     } catch (error) {
       res.status(400).json({ error: error.message });
     }
   });

   // Get All Users
   router.get('/', async (req, res) => {
     const users = await User.findAll();
     res.json(users);
   });

   // Get User by ID
   router.get('/:id', async (req, res) => {
     const user = await User.findByPk(req.params.id);
     res.json(user);
   });

   // Update User
   router.put('/:id', async (req, res) => {
     const user = await User.findByPk(req.params.id);
     if (user) {
       await user.update(req.body);
       res.json(user);
     } else {
       res.status(404).json({ error: 'User not found' });
     }
   });

   // Delete User
   router.delete('/:id', async (req, res) => {
     const user = await User.findByPk(req.params.id);
     if (user) {
       await user.destroy();
       res.status(204).send();
     } else {
       res.status(404).json({ error: 'User not found' });
     }
   });

   module.exports = router;
   ```

9. **Create Post Routes**:
   Create a file `routes/postRoutes.js`.

   ```javascript
   const express = require('express');
   const { Post, User } = require('../models');

   const router = express.Router();

   // Create Post
   router.post('/', async (req, res) => {
     try {
       const post = await Post.create(req.body);
       res.status(201).json(post);
     } catch (error) {
       res.status(400).json({ error: error.message });
     }
   });

   // Get All Posts
   router.get('/', async (req, res) => {
     const posts = await Post.findAll({ include: User });
     res.json(posts);
   });

   // Get Post by ID
   router.get('/:id', async (req, res) => {
     const post = await Post.findByPk(req.params.id, { include: User });
     res.json(post);
   });

   // Update Post
   router.put('/:id', async (req, res) => {
     const post = await Post.findByPk(req.params.id);
     if (post) {
       await post.update(req.body);
       res.json(post);
     } else {
       res.status(404).json({ error: 'Post not found' });
     }
   });

   // Delete Post
   router.delete('/:id', async (req, res) => {
     const post = await Post.findByPk(req.params.id);
     if (post) {
       await post.destroy();
       res.status(204).send();
     } else {
       res.status(404).json({ error: 'Post not found' });
     }
   });

   module.exports = router;
   ```

### Set Up Server

10. **Create Server**:
    Create a file `server.js`.

    ```javascript
    const express = require('express');
    const bodyParser = require('body-parser');
    const cors = require('cors');
    const userRoutes = require('./routes/userRoutes');
    const postRoutes = require('./routes/postRoutes');

    const app = express();
    const PORT = process.env.PORT || 5000;

    app.use(cors());
    app.use(bodyParser.json());

    app.use('/api/users', userRoutes);
    app.use('/api/posts', postRoutes);

    app.listen(PORT, () => {
      console.log(`Server is running on http://localhost:${PORT}`);
    });
    ```

### Running the Application

11. **Run the Application**:
    ```bash
    node server.js
    ```

### Testing the API

You can use tools like Postman or curl to test the API endpoints:

- **User Endpoints**:
  - `POST /api/users`: Create a new user.
  - `GET /api/users`: Get all users.
  - `GET /api/users/:id`: Get a user by ID.
  - `PUT /api/users/:id`: Update a user by ID.
  - `DELETE /api/users/:id`: Delete a user by ID.

- **Post Endpoints**:
  - `POST /api/posts`: Create a new post.
  - `GET /api/posts`: Get all posts.
  - `GET /api/posts/:id`: Get a post by ID.
  - `PUT /api/posts/:id`: Update a post by ID.
  - `DELETE /api/posts/:id`: Delete a post by ID.

### Conclusion

This setup provides a basic CRUD API for users and posts using Sequelize with SQLite as the database. You can expand this further by adding features like filtering, sorting, and pagination as needed.