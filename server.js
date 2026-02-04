import express from 'express';
import multer from 'multer';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import sharp from 'sharp';
import axios from 'axios';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3005;

app.use(cors());
app.use(express.json());

// 图片代理与压缩接口
app.get('/api/image-proxy', async (req, res) => {
  const { url, w, q = 80 } = req.query;

  if (!url) {
    return res.status(400).send('URL is required');
  }

  try {
    // 获取原始图片
    const response = await axios({
      url: decodeURIComponent(url),
      method: 'GET',
      responseType: 'arraybuffer',
      timeout: 10000, // 10秒超时
    });

    const buffer = Buffer.from(response.data);
    let image = sharp(buffer).rotate();
    
    // 如果指定了宽度，进行缩放
    if (w) {
      image = image.resize(parseInt(w), null, {
        withoutEnlargement: true,
        fit: 'inside'
      });
    }

    // 转换为 WebP 格式并进行压缩
    const outputBuffer = await image
      .webp({ quality: parseInt(q) })
      .toBuffer();

    // 设置缓存头，减少重复处理
    res.set('Content-Type', 'image/webp');
    res.set('Cache-Control', 'public, max-age=31536000'); // 缓存一年
    res.send(outputBuffer);
  } catch (error) {
    console.error('Image proxy error:', error.message);
    // 如果处理失败，重定向到原图
    res.redirect(decodeURIComponent(url));
  }
});

// Ensure uploads directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadDir));

// Configure Multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate unique filename: timestamp-random-originalName
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, uniqueSuffix + ext);
  }
});

const upload = multer({ storage: storage });

// Upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }
  
  // Construct URL
  const protocol = req.protocol;
  const host = req.get('host');
  const fileUrl = `${protocol}://${host}/uploads/${req.file.filename}`;
  
  res.json({ url: fileUrl });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
