// create-mern-structure.js
const fs = require("fs");
const path = require("path");

const structure = {
  frontend: {
    public: {},
    src: {
      assets: {},
      components: {},
      pages: {},
      context: {},
      hooks: {},
      utils: {},
      "App.js": `import React from "react";

function App() {
  return <div>Welcome to Mindstack Frontend 🚀</div>;
}

export default App;
`,
      "index.js": `import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
`,
    },
    "package.json": `{
  "name": "mindstack-frontend",
  "version": "1.0.0",
  "private": true,
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}`,
    "README.md": "# Mindstack Frontend",
  },
  backend: {
    src: {
      config: {
        "db.js": `import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(\`MongoDB Connected: \${conn.connection.host}\`);
  } catch (error) {
    console.error(\`Error: \${error.message}\`);
    process.exit(1);
  }
};

export default connectDB;`,
      },
      controllers: {
        "userController.js": `export const getUsers = (req, res) => {
  res.json({ message: "Get all users" });
};`,
      },
      models: {
        "userModel.js": `import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
});

const User = mongoose.model("User", userSchema);
export default User;`,
      },
      routes: {
        "userRoutes.js": `import express from "express";
import { getUsers } from "../controllers/userController.js";
const router = express.Router();

router.get("/", getUsers);

export default router;`,
      },
      middleware: {
        "errorMiddleware.js": `export const errorHandler = (err, req, res, next) => {
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({ message: err.message, stack: process.env.NODE_ENV === "production" ? null : err.stack });
};`,
      },
      utils: {},
      "server.js": `import express from "express";
import dotenv from "dotenv";
import connectDB from "./config/db.js";
import userRoutes from "./routes/userRoutes.js";
import { errorHandler } from "./middleware/errorMiddleware.js";

dotenv.config();
connectDB();

const app = express();
app.use(express.json());
app.get("/", (req, res) => res.send("Mindstack Backend Running 🚀"));
app.use("/api/users", userRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(\`Server running on port \${PORT}\`));
`,
    },
    ".env": "MONGO_URI=your_mongodb_connection_string\nPORT=5000",
    "package.json": `{
  "name": "mindstack-backend",
  "version": "1.0.0",
  "main": "src/server.js",
  "type": "module",
  "scripts": {
    "start": "node src/server.js",
    "dev": "nodemon src/server.js"
  },
  "dependencies": {
    "dotenv": "^16.4.0",
    "express": "^4.19.0",
    "mongoose": "^8.2.0"
  }
}`,
  },
  ".gitignore": "node_modules\n.env\n",
  "README.md": "# Mindstack MERN Stack Application",
  "package.json": `{
  "name": "mindstack",
  "version": "1.0.0",
  "private": true
}`,
};

function createStructure(base, obj) {
  for (const name in obj) {
    const targetPath = path.join(base, name);
    if (typeof obj[name] === "object") {
      fs.mkdirSync(targetPath, { recursive: true });
      createStructure(targetPath, obj[name]);
    } else {
      fs.writeFileSync(targetPath, obj[name]);
    }
  }
}

createStructure(process.cwd(), structure);
console.log("✅ Full MERN Stack project structure created successfully!");
