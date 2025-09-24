const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyAccessToken, verifyRefreshToken } = require('./middlewares/auth_middleware');
const { partnersUpload } = require('./middlewares/multer_middleware');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const SERVER_URL = process.env.SERVER_URL;

// POST /dashboard/login
router.post('/login', async (req, res) => {
  try {
    const { name, password } = req.body;
    if (!name || !password)
      return res.status(400).json({ message: '이름과 비밀번호를 입력해주세요.' });

    // 0) 이름과 동일한 사용자 찾기
    const { rows } = await req.db.query(
      'SELECT id, name, password FROM dashboard_users WHERE name = $1',
      [name]
    );
    const user = rows[0];
    if (!user) return res.status(401).json({ message: '사용자가 없습니다.' });

    // 1) 비밀번호 비교하기
    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: '비밀번호가 틀렸습니다.' });

    // 2) 액세스 토큰 생성
    const accessToken = jwt.sign({id: user.id, name: user.name}, ACCESS_TOKEN_SECRET, { expiresIn: '2h' });

    // 4) 클라이언트에 토큰 응답
    res.status(200).json({accessToken});

  } catch (e) {
    res.status(500).json({message: e.message});
  }
});

// POST /dashboard/main
router.get('/main', verifyAccessToken, async (req, res) => {
  try {
    // 1) 모든 정보 가져오기
    const usersResult = await req.db.query('SELECT * FROM users');
    const collegeAuthsResult = await req.db.query('SELECT * FROM college_auths');
    const storesResult = await req.db.query('SELECT * FROM stores');
    const partnersResult = await req.db.query('SELECT * FROM partners');
    const partnershipsResult = await req.db.query('SELECT * FROM partnerships');

    res.status(200).json({
      users: usersResult.rows,
      college_auths: collegeAuthsResult.rows,
      stores: storesResult.rows,
      partners: partnersResult.rows,
      partnerships: partnershipsResult.rows,
    });
  } catch(e) {
    res.status(500).json({ message: e.message });
  }
});

// PATCH /dashboard/college_auths/:user_id
router.patch('/college_auths/:user_id', verifyAccessToken, async (req, res) => {
  try {
    const userId = req.params.user_id;
    const { status, colleges } = req.body;

    if (!userId) return res.status(400).json({ message: '사용자 ID 필요' });

    // DB에서 사진 가져오기
    const { rows } = await req.db.query(
      'SELECT info21_image FROM college_auths WHERE user_id = $1',
      [userId]
    );

    if (status === 'accepted' && (!colleges || !colleges.length))
      return res.status(400).json({ message: '단과대 리스트 필요' });

    if (status === 'accepted') {
      await req.db.query(
        'UPDATE users SET college_auth = $1, is_verified = $2 WHERE id = $3',
        [colleges, true, userId]
      );
    }

    // 요청 삭제
    await req.db.query('DELETE FROM college_auths WHERE user_id = $1', [userId]);

    // 사진 삭제
const filePath = path.join(__dirname, '..', 'src', 'uploads', 'users', path.basename(r.info21_image));
if (fs.existsSync(filePath)) {
  fs.unlinkSync(filePath); // 동기 삭제
}

    res.status(200).json({ message: status === 'accepted' ? '인증 수락' : '인증 거절' });
  } catch (e) {
console.log(e.message);
	  res.status(500).json({ message: e.message });
  }
});


// ===========================
// 가게
// ===========================
// POST /dashboard/stores
router.post('/stores', verifyAccessToken, async (req, res) => {
  try {
    const { name, category, lat, lon, url } = req.body;

    if (!name || !category || !lat || !lon || !url) {
      return res.status(400).json({ message: '가게 정보를 입력해주세요.' });
    }

    // INSERT stores
    const result = await req.db.query(
      `
      INSERT INTO stores (name, category, lat, lon, url)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
      `,
      [name, category, lat, lon, url]
    );

    res.status(200).json({ message: '가게가 성공적으로 추가되었습니다.', store: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /dashboard/stores/:id
router.put('/stores/:id', verifyAccessToken, async (req, res) => {
  try {
    const store_id = req.params.id;
    const { name, category, lat, lon, url } = req.body;

    if (!store_id) {
      return res.status(400).json({ message: '가게 ID가 필요합니다.' });
    }

    if (!name || !category || !lat || !lon || !url) {
      return res.status(400).json({ message: '가게 정보를 모두 입력해주세요.' });
    }

    const result = await req.db.query(
      `
      UPDATE stores
      SET name = $1,
          category = $2,
          lat = $3,
          lon = $4,
          url = $5
      WHERE id = $6
      RETURNING *
      `,
      [name, category, lat, lon, url, store_id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: '해당 ID의 가게를 찾을 수 없습니다.' });
    }

    res.status(200).json({
      message: '가게 정보가 성공적으로 업데이트되었습니다.',
      store: result.rows[0],
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /dashboard/stores/:id
router.delete('/stores/:id', verifyAccessToken, async (req, res) => {
  try {
    const store_id = req.params.id;

    if (!store_id) {
      return res.status(400).json({ message: '가게 ID가 필요합니다.' });
    }

    await req.db.query(
      'DELETE FROM stores WHERE id = $1',
      [store_id]
    );

    res.status(200).json({ message: '가게가 성공적으로 삭제되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ===========================
// 제휴업체(단과대)
// ===========================
// POST /dashboard/partners - 단과대 추가
router.post('/partners', verifyAccessToken, partnersUpload.single('image'), async (req, res) => {
  try {
    const { name } = req.body;
    const imagePath = req.file && `${SERVER_URL}/uploads/partners/${req.file.filename}`;
    if (!name || !imagePath) {
      return res.status(400).json({ message: '이름과 이미지를 입력해주세요.' });
    }

    const result = await req.db.query(
      `
      INSERT INTO partners (name, image)
      VALUES ($1, $2)
      RETURNING *
      `,
      [name, imagePath]
    );

    res.status(200).json({ message: '단과대가 추가되었습니다.', partner: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /dashboard/partners/:id - 단과대 업데이트
router.put('/partners/:id', verifyAccessToken, partnersUpload.single('image'), async (req, res) => {
  try {
    const partner_id = req.params.id;
    const { name } = req.body;

    if (!partner_id) {
      return res.status(400).json({ message: '파트너 ID가 필요합니다.' });
    }

    if (!name) {
      return res.status(400).json({ message: '이름을 입력해주세요.' });
    }

    // 기존 파트너 데이터 불러오기
    const existing = await req.db.query('SELECT image FROM partners WHERE id = $1', [partner_id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: '단과대를 찾을 수 없습니다.' });
    }

    const imagePath = 
      req.file
      ? `${SERVER_URL}/uploads/partners/${req.file.filename}`
      : existing.rows[0].image;

    const result = await req.db.query(
      `
      UPDATE partners
      SET name = $1, image = $2
      WHERE id = $3
      RETURNING *
      `,
      [name, imagePath, partner_id]
    );

    res.status(200).json({ message: '단과대 정보가 업데이트되었습니다.', partner: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /dashboard/partners/:id - 단과대 삭제
router.delete('/partners/:id', verifyAccessToken, async (req, res) => {
  try {
    const partner_id = req.params.id;

    if (!partner_id) {
      return res.status(400).json({ message: '파트너 ID가 필요합니다.' });
    }

    await req.db.query(
      'DELETE FROM partners WHERE id = $1',
      [partner_id]
    );

    res.status(200).json({ message: '단과대가 삭제되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// ===========================
// 제휴 관계
// ===========================
// POST /dashboard/partnerships - 제휴 추가
router.post('/partnerships', verifyAccessToken, async (req, res) => {
  try {
    const { store_id, partner_id, short_description, long_description } = req.body;

    if (!store_id || !partner_id || !short_description || !long_description) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    const result = await req.db.query(
      `
      INSERT INTO partnerships (store_id, partner_id, short_description, long_description)
      VALUES ($1, $2, $3, $4)
      RETURNING *
      `,
      [store_id, partner_id, short_description, long_description]
    );

    res.status(200).json({ message: '제휴가 추가되었습니다.', partnership: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// PUT /dashboard/partnerships/:id - 제휴 업데이트
router.put('/partnerships/:id', verifyAccessToken, async (req, res) => {
  try {
    const partnership_id = req.params.id;
    const { store_id, partner_id, short_description, long_description } = req.body;

    if (!partnership_id) {
      return res.status(400).json({ message: '제휴 ID가 필요합니다.' });
    }

    if (!store_id || !partner_id || !short_description || !long_description) {
      return res.status(400).json({ message: '모든 필드를 입력해주세요.' });
    }

    const existing = await req.db.query('SELECT * FROM partnerships WHERE id = $1', [partnership_id]);
    if (existing.rows.length === 0) {
      return res.status(404).json({ message: '제휴를 찾을 수 없습니다.' });
    }

    const result = await req.db.query(
      `
      UPDATE partnerships
      SET store_id = $1, partner_id = $2, short_description = $3, long_description = $4, updated_at = CURRENT_TIMESTAMP
      WHERE id = $5
      RETURNING *
      `,
      [store_id, partner_id, short_description, long_description, partnership_id]
    );

    res.status(200).json({ message: '제휴 정보가 업데이트되었습니다.', partnership: result.rows[0] });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

// DELETE /dashboard/partnerships/:id - 제휴 삭제
router.delete('/partnerships/:id', verifyAccessToken, async (req, res) => {
  try {
    const partnership_id = req.params.id;

    if (!partnership_id) {
      return res.status(400).json({ message: '제휴 ID가 필요합니다.' });
    }

    await req.db.query('DELETE FROM partnerships WHERE id = $1', [partnership_id]);

    res.status(200).json({ message: '제휴가 삭제되었습니다.' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});


module.exports = router;
