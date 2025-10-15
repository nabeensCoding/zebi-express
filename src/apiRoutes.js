const express = require('express');
const jwt = require('jsonwebtoken');
const { verifyAccessToken, verifyRefreshToken } = require('./middlewares/auth_middleware');
const { usersUpload } = require('./middlewares/multer_middleware');

const router = express.Router();

const ACCESS_TOKEN_SECRET = process.env.ACCESS_TOKEN_SECRET;
const REFRESH_TOKEN_SECRET = process.env.REFRESH_TOKEN_SECRET;
const SERVER_URL = process.env.SERVER_URL;

// GET /api/map
router.get('/map', verifyAccessToken, async (req, res) => {
  const result = await req.db.query(
    'SELECT college_auth FROM users WHERE id = $1',
    [req.user.id]
  );
  const userPartnerIds = result.rows[0]?.college_auth || [];

  // partnerships + stores + partners를 한번에 조회
  const enrichedResult = await req.db.query(
    `SELECT 
      s.id as store_id,
      s.name as store_name,
      s.lat,
      s.lon,
      s.category,
      s.url,
      p.id as partner_id,
      p.name as partner_name,
      p.image AS partner_image,
      ps.id as partnership_id,
      ps.short_description,
      ps.long_description
    FROM partnerships ps
    JOIN stores s ON ps.store_id = s.id
    JOIN partners p ON ps.partner_id = p.id
    WHERE ps.partner_id = ANY($1::uuid[])`,
    [userPartnerIds]
  );

  // store 단위로 group
  const storesMap = {};
  enrichedResult.rows.forEach(r => {
    if (!storesMap[r.store_id]) {
      storesMap[r.store_id] = {
        id: r.store_id,
        name: r.store_name,
        lat: r.lat,
        lon: r.lon,
        category: r.category,
        url: r.url,
        partnerships: []
      };
    }

    storesMap[r.store_id].partnerships.push({
      id: r.partnership_id,
      short_description: r.short_description,
      long_description: r.long_description,
      partner: {
        id: r.partner_id,
        name: r.partner_name,
        image: r.partner_image
      }
    });
  });

  const enrichedStores = Object.values(storesMap);

  // HTML 렌더링
  const html = `
  <!DOCTYPE html>
  <html>
    <head>
      <meta charset="utf-8" />
      <title>Kakao Map</title>
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=833752abac2c28495e49b0022c9c07cd&libraries=services"></script>
      <style>
        html, body { margin: 0; padding: 0; height: 100%; }
        #map { width: 100%; height: 100%; border: 1px solid #ccc; }
      </style>
      <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />
    </head>
    <body>
      <div id="map"></div>
      <script>
        const stores = ${JSON.stringify(enrichedStores)};

        let map = null;
        let allMarkers = [];
        let allOverlays = []; // 오버레이 관리를 위한 배열 추가

        // 마커 이미지 설정
        var imageSrc = 'https://iili.io/K27I8le.png';
        var imageSize = new kakao.maps.Size(24, 24);
        var markerImage = new kakao.maps.MarkerImage(imageSrc, imageSize);

        function panTo(lat, lon) {
          var moveLatLon = new kakao.maps.LatLng(lat, lon);
          map.panTo(moveLatLon);            
        }

        function renderMarkers(filteredStores) {
          // 기존 마커들 제거
          allMarkers.forEach(marker => marker.setMap(null));
          allMarkers = [];

          // 기존 오버레이들 제거
          allOverlays.forEach(overlay => overlay.setMap(null));
          allOverlays = [];

          if (!filteredStores) return;

          filteredStores.forEach(store => {
            if (!store.lat || !store.lon) return;

            // 마커 생성
            const marker = new kakao.maps.Marker({
              map: map,
              position: new kakao.maps.LatLng(store.lat, store.lon),
              title: store.name,
              image: markerImage
            });

            // 클릭 이벤트를 위한 고유 ID 생성
            const overlayId = 'overlay-' + store.id;
            
            // 오버레이 생성 (클릭 가능하도록 cursor 스타일 추가, 클릭 효과 제거)
            const overlayContent = 
              '<div id="' + overlayId + '" style="' +
              'font-size: 10px; font-weight: bold; color: #3B4483; font-family: Pretendard;' +
              'background-color: white; padding: 2px 6px; border: 1px solid #ddd; border-radius: 12px;' +
              'white-space: nowrap; position: relative; margin-top: 5px; cursor: pointer;' +
              'user-select: none; -webkit-user-select: none; -moz-user-select: none; -ms-user-select: none;' +
              '-webkit-tap-highlight-color: transparent; outline: none;">' +
              store.name +
              '</div>';

            const customOverlay = new kakao.maps.CustomOverlay({
              position: new kakao.maps.LatLng(store.lat, store.lon),
              content: overlayContent,
              yAnchor: 0.2,
              xAnchor: 0.5,
              map: map
            });

            // 공통 클릭 이벤트 함수
            function handleClick() {
              const message = JSON.stringify(store);
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(message);
              }
              panTo(store.lat, store.lon);
            }

            // 마커 클릭 이벤트
            kakao.maps.event.addListener(marker, 'click', handleClick);

            // 오버레이 클릭 이벤트 (DOM 요소에 직접 추가)
            setTimeout(() => {
              const overlayElement = document.getElementById(overlayId);
              if (overlayElement) {
                overlayElement.addEventListener('click', handleClick);
              }
            }, 100); // 오버레이가 DOM에 추가될 시간을 기다림

            // 배열에 추가
            allMarkers.push(marker);
            allOverlays.push(customOverlay);
          });
        }

        window.onload = function() {
          if (typeof kakao !== 'undefined' && kakao.maps && kakao.maps.LatLng) {
            const container = document.getElementById('map');
            const options = {
              center: new kakao.maps.LatLng(37.24821748851879, 127.07832374125279),
              level: 4
            };
            map = new kakao.maps.Map(container, options);

            kakao.maps.event.addListener(map, 'click', function() {
              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapClick' }));
              }
            });

            renderMarkers(stores);
          } else {
            console.error('Kakao Maps not available');
          }
        };

        // 메시지 이벤트 리스너 (중복 제거 - window.addEventListener만 사용)
        window.addEventListener('message', function(event) {
          try {
            const data = JSON.parse(event.data);
            console.log(data);
            
            if (data.type === 'mapCenter') {
              const { lat, lon } = data.payload;
              panTo(lat, lon);
            } else if (data.type === 'category') {
              const selectedCategory = data.payload;
              console.log("받은 category:", selectedCategory);

              if (selectedCategory === '') {
                renderMarkers(stores);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(JSON.stringify({
                    type: 'filteredStores',
                    payload: [],
                  }));
                }
                return;
              }

              const filtered = stores.filter(store => store.category === selectedCategory);
              renderMarkers(filtered);

              if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                window.ReactNativeWebView.postMessage(JSON.stringify({
                  type: 'filteredStores',
                  payload: filtered,
                }));
              }

              if (filtered.length > 0) {
                const { lat, lon } = filtered[0];
                panTo(lat, lon);
              }
            } else if (data.type === 'search') {
              const searchText = data.payload;
              const findedStores = stores.filter(store => 
                store.name.toLowerCase().includes(searchText.toLowerCase())
              );
              
              if (findedStores.length > 0) {
                const findedStore = findedStores[0];
                const message = JSON.stringify(findedStore);
                if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                  window.ReactNativeWebView.postMessage(message);
                }
                const { lat, lon } = findedStore;
                panTo(lat, lon);
              }
            }
          } catch (e) {
            console.error('message parse error', e);
          }
        });
      </script>
    </body>
  </html>
  `;
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

