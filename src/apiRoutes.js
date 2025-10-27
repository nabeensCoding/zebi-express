const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyAccessToken, verifyRefreshToken } = require('./middlewares/auth_middleware');
const { usersUpload } = require('./middlewares/multer_middleware');
const { getUserPartnershipsData, generateMapHTML } = require('./services/mapService');

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const SERVER_URL = process.env.SERVER_URL;

// GET /api/map?partners=id1234,id2345
router.get('/map', async (req, res) => {
  const { partners } = req.query;

  if (!partners) {
    return res.status(400).json({ message: 'partners 쿼리 파라미터가 필요합니다.' });
  }

  const enrichedStores = await getUserPartnershipsData(req.db, partners);
  const html = generateMapHTML(enrichedStores);
  res.setHeader('Content-Type', 'text/html');
  res.send(html);
});

// POST /api/logUserClick
router.post('/logUserClick', verifyAccessToken, async (req, res) => {
  const user_id = req.user.id;
  const { store_id } = req.body;

  await req.db.query(
    `INSERT INTO user_logs (user_id, store_id) VALUES ($1, $2)`,
    [user_id, store_id]
  );

  res.sendStatus(204);
});

// POST /api/login
router.post('/login', async (req, res) => {
  try {
    const { name, image, phone } = req.body;

    const result = await req.db.query(
      `
      INSERT INTO users (name, image, phone)
      VALUES ($1, $2, $3)
      ON CONFLICT (phone) DO UPDATE SET
        name = EXCLUDED.name,
        image = EXCLUDED.image
      RETURNING id, (xmax = 0) AS is_new
      `,
      [name, image, phone]
    );

    const { id, is_new } = result.rows[0];

    // 액세스 토큰 발급
    jwt.sign({ id, phone }, ACCESS_TOKEN_SECRET, { expiresIn: '5d' }, (err, accessToken) => {
      if (err || !accessToken) {
        return res.status(500).json({ message: '토큰 생성 실패' });
      }

      // 리프레시 토큰 발급
      jwt.sign({ id, phone }, REFRESH_TOKEN_SECRET, { expiresIn: '150d' }, async (err, refreshToken) => {
        if (err || !refreshToken) {
          return res.status(500).json({ message: '리프레시 토큰 생성 실패' });
        }

        // DB 업데이트
        await req.db.query(
          `UPDATE users SET refresh_token = $1 WHERE id = $2`,
          [refreshToken, id]
        );

        // 응답
        res.json({
          accessToken,
          refreshToken,
          isRegister: is_new
        });
      });
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});



// GET /api/refresh
router.get('/refresh', verifyRefreshToken, (req, res) => {
  const payload = { id: req.user.id, phone: req.user.phone };

	const newAccessToken = jwt.sign(payload, ACCESS_TOKEN_SECRET, { expiresIn: '5d' });

  res.json({ accessToken: newAccessToken });  
});

// POST /api/college-auth/request
router.post('/college-auth/request', verifyAccessToken, usersUpload.single('info21_image'), async (req, res) => {
  try {
    const userId = req.user.id;
    const imagePath = req.file && `${SERVER_URL}/uploads/users/${req.file.filename}`;

    if(!imagePath) {
      return res.status(400).json({ success: false, message: '이미지 파일이 필요합니다.' });
    }

    await req.db.query(
      `
      INSERT INTO college_auths (user_id, info21_image)
                VALUES ($1, $2)
      `,
      
      [userId, imagePath]
    );

    res.json({ success: true, message: '인증이 정상적으로 요청되었습니다.'});
  } catch(e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


router.get('/getUserCollege', verifyAccessToken, async (req, res) => {
  try {
    const result = await req.db.query(
      `SELECT college_auth FROM users WHERE id = $1`,
      [req.user.id]
    );

    const collegeAuthIds = result.rows[0]?.college_auth || [];

    let collegeAuthDetails = [];
    if (collegeAuthIds.length > 0) {
      const placeholders = collegeAuthIds.map((_, i) => `$${i + 1}`).join(',');
      const partnersResult = await req.db.query(
        `SELECT name FROM partners WHERE id IN (${placeholders})`,
        collegeAuthIds
      );
      collegeAuthDetails = partnersResult.rows.map(r => r.name);
    }

    res.json({ 
      success: true, 
      college_auth: collegeAuthDetails.join(', ') // 쉼표로 합치기
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


router.get('/me', verifyAccessToken, async (req, res) => {
  try {
    // 1. 유저 기본 정보 + college_auth 배열 조회
    const userResult = await req.db.query(
      `SELECT name, is_verified, phone, image, college_auth FROM users WHERE id = $1`,
      [req.user.id]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const user = userResult.rows[0];
    const collegeAuthIds  = user.college_auth || [];

    // 2. partners 테이블에서 college_auth 상세 조회
    let collegeAuthDetails = [];
    if (collegeAuthIds.length > 0) {
      const placeholders = collegeAuthIds.map((_, i) => `$${i + 1}`).join(',');
      const partnersResult = await req.db.query(
        `SELECT id, name, image FROM partners WHERE id IN (${placeholders})`,
        collegeAuthIds
      );
      collegeAuthDetails = partnersResult.rows;
    }

    // 3. college_request 상세
    const collegeRequestResult = await req.db.query(
      `SELECT 1 FROM college_auths WHERE user_id = $1 LIMIT 1`,
      [req.user.id]
    );

    const is_authenticating = collegeRequestResult.rowCount > 0;

    // 4. 응답
    res.json({
      success: true,
      user: {
        name: user.name,
        is_verified: user.is_verified,
        phone: user.phone,
        image: user.image,
        college_auth: collegeAuthDetails,
        is_authenticating
      }
    });
  } catch (e) {
    res.status(500).json({ success: false, message: e.message });
  }
});


module.exports = router;

