import express from "express";
import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import fs from "fs";
import { nanoid } from "nanoid";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
// console.log(__filename, "filename");
// console.log(__dirname, "dirname");

const app = express();
const PORT = process.env.PORT || 3000;
const UPLOAD_DIR = process.env.UPLOAD_DIR || "uploads";
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Ensure the upload directory exists
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Define a user
const user = {
  id: "baf609b4-cac8-4b48-b663-e149d00edc46",
};
// Configure multer storage
const storage = multer.diskStorage({
  // Set the destination directory for uploaded files
  destination: (req, file, cb) => {
    const userID = user.id;
    const userDir = path.join(UPLOAD_DIR, userID);

    // Ensure user directory exists
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }

    cb(null, userDir);
  },

  // Set the file name
  filename: (req, file, cb) => {
    const uniqueSuffix = `${nanoid(10)}_${file.originalname}`;
    // const uniqueSuffix = `${nanoid(10)}${path.extname(file.originalname)}`;
    cb(null, uniqueSuffix);
  },
});

const upload = multer({
  storage,
  limits: {
    // 500kb
    fileSize: 500 * 1024,
  },
});

// Serve static files from the uploads directory
app.use(`/${UPLOAD_DIR}`, express.static(path.join(__dirname, UPLOAD_DIR)));

// Endpoint to handle file upload
app.post("/upload", upload.single("image"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const userID = user.id;
  const fileUrl = `${BASE_URL}/${UPLOAD_DIR}/${userID}/${req.file.filename}`;
  res.status(200).json({ url: fileUrl });
});

// Endpoint to handle file deletion
app.delete("/delete", (req, res) => {
  const { imageUrl } = req.body;

  if (!imageUrl) {
    return res.status(400).json({ error: "No image URL provided" });
  }

  // Extract the filename from the URL
  const url = new URL(imageUrl);
  const filePath = path.join(__dirname, url.pathname);
  // console.log(imageUrl, "imageUrl");
  // console.log(url, "url");
  // console.log(filePath, "filePath");

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to delete file" });
    }

    res.status(200).json({ message: "File deleted successfully" });
  });
});

// Endpoint to list images in a userID folder
app.get("/images", (req, res) => {
  const userID = user.id;

  if (!userID) {
    return res.status(400).json({ error: "No userID provided" });
  }

  const userDir = path.join(UPLOAD_DIR, userID);

  fs.readdir(userDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: "Failed to read directory" });
    }

    // Filter out directories and only include files
    const imageFiles = files.filter((file) =>
      fs.statSync(path.join(userDir, file)).isFile()
    );
    const imageUrls = imageFiles.map(
      (file) => `${BASE_URL}/${UPLOAD_DIR}/${userID}/${file}`
    );

    res.status(200).json({ images: imageUrls });
  });
});

// Endpoint to handle invalid routes
app.use("*", (req, res) => {
  res.status(404).json({ error: "Invalid route" });
});

// Endpoint to handle server errors
app.use((err, req, res, next) => {
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
