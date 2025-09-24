require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const apiRoutes = require('./apiRoutes');
const dashboardRoutes = require('./dashboardRoutes');

const app = express();
const PORT = 8000;

// DB 연결
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// DB 연결 테스트
pool.connect((err, client, release) => {
  if (err) {
    console.error('DB 연결 실패:', err.stack);
  } else {
    console.log('DB 연결 성공!');
    release();
  }
});

// 라우터에서 DB 사용하기 위해, req.db 붙여서 전달
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// CORS 사용
app.use(cors({
  origin: 'https://dashboard.binzaridot.duckdns.org',
  credentials: true,
}));

// 로컬 이미지 보여주기 사용
app.use('/uploads/users', express.static('uploads/users'));
app.use('/uploads/partners', express.static('uploads/partners'));

// JSON 방식 사용
app.use(express.json());

// 사용자용 라우터 연결
app.use('/api', apiRoutes);

// 대시보드 라우터 연결
app.use('/dashboard', dashboardRoutes);

app.listen(PORT, () => {
  console.log(`서버 켜짐 http://localhost:${PORT}`);
})
