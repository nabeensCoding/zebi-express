require('dotenv').config();
const jwt = require('jsonwebtoken');

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;

// 엑세스토큰 검증 미들웨어
function verifyAccessToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: '토큰 없음' })

  jwt.verify(token, ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: '토큰 유효하지 않음' });
    req.user = user;
    next();
  });
}

// 리프레시토큰 검증 미들웨어
function verifyRefreshToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: '토큰 없음' })

  jwt.verify(token, REFRESH_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: '토큰 유효하지 않음' });
    req.user = user;
    next();
  });
}

module.exports = {
  verifyAccessToken,
  verifyRefreshToken
};
