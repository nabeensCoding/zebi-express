/**
 * 사용자의 파트너십 데이터를 조회하고 가공
 * @param {Object} db - Database connection
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Enriched stores data
 */
async function getUserPartnershipsData(db, userId) {
  // 단일 쿼리로 모든 데이터를 조회 (DB 왕복 최소화)
  const result = await db.query(
    `SELECT
      s.id as store_id,
      s.name as store_name,
      s.lat,
      s.lon,
      s.category,
      s.url,
      p.id as partner_id,
      p.name as partner_name,
      p.image as partner_image,
      ps.id as partnership_id,
      ps.short_description,
      ps.long_description
    FROM users u
    CROSS JOIN LATERAL unnest(u.college_auth) AS user_partner_id
    JOIN partnerships ps ON ps.partner_id = user_partner_id
    JOIN stores s ON ps.store_id = s.id
    JOIN partners p ON ps.partner_id = p.id
    WHERE u.id = $1
      AND s.lat IS NOT NULL
      AND s.lon IS NOT NULL`,
    [userId]
  );

  if (result.rows.length === 0) {
    return [];
  }

  // Map을 사용해 O(n) 성능으로 그룹화
  const storesMap = new Map();

  for (const row of result.rows) {
    let store = storesMap.get(row.store_id);

    if (!store) {
      store = {
        id: row.store_id,
        name: row.store_name,
        lat: parseFloat(row.lat),
        lon: parseFloat(row.lon),
        category: row.category,
        url: row.url,
        partnerships: []
      };
      storesMap.set(row.store_id, store);
    }

    store.partnerships.push({
      id: row.partnership_id,
      short_description: row.short_description,
      long_description: row.long_description,
      partner: {
        id: row.partner_id,
        name: row.partner_name,
        image: row.partner_image
      }
    });
  }

  return Array.from(storesMap.values());
}

// 상수 분리
const KAKAO_APP_KEY = '833752abac2c28495e49b0022c9c07cd';
const DEFAULT_CENTER = { lat: 37.24821748851879, lon: 127.07832374125279 };
const DEFAULT_LEVEL = 4;
const MARKER_IMAGE_URL = 'https://iili.io/K27I8le.png';

// 오버레이 스타일 (재사용)
const OVERLAY_STYLE = 'font-size:10px;font-weight:bold;color:#3B4483;font-family:Pretendard;background-color:white;padding:2px 6px;border:1px solid #ddd;border-radius:12px;white-space:nowrap;position:relative;margin-top:5px;cursor:pointer;user-select:none;-webkit-user-select:none;-moz-user-select:none;-ms-user-select:none;-webkit-tap-highlight-color:transparent;outline:none;';

/**
 * 카카오 맵 HTML 생성 (최적화 버전)
 * @param {Array} stores - Enriched stores data
 * @returns {string} Minified HTML string
 */
function generateMapHTML(stores) {
  const storesJSON = JSON.stringify(stores);

  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8"/>
        <title>Kakao Map</title>
        <meta name="viewport" content="width=device-width,initial-scale=1.0">
        <script src="https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&libraries=services"></script>
        <style>
          html, body { margin: 0; padding: 0; height: 100%; }
          #map { width: 100%; height: 100%; border: 1px solid #ccc; }
        </style>
        <link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css"/>
      </head>
      <body>
        <div id="map"></div>
        <script>
          const stores = ${storesJSON};
          const OVERLAY_STYLE = '${OVERLAY_STYLE}';

          let map, allMarkers = [], allOverlays = [];

          const markerImage = new kakao.maps.MarkerImage('${MARKER_IMAGE_URL}', new kakao.maps.Size(24, 24));

          const panTo = (lat, lon) => map.panTo(new kakao.maps.LatLng(lat, lon));

          const postMessage = (msg) => {
            window.ReactNativeWebView?.postMessage(typeof msg === 'string' ? msg : JSON.stringify(msg));
          };

          const clearMarkers = () => {
            allMarkers.forEach(m => m.setMap(null));
            allMarkers = [];
            allOverlays.forEach(o => o.setMap(null));
            allOverlays = [];
          };

          const createOverlay = (id, name, lat, lon) => {
            const div = document.createElement('div');
            div.id = id;
            div.style.cssText = OVERLAY_STYLE;
            div.textContent = name;
            return new kakao.maps.CustomOverlay({
              position: new kakao.maps.LatLng(lat, lon),
              content: div.outerHTML,
              yAnchor: 0.2,
              xAnchor: 0.5
            });
          };

          const renderMarkers = (filteredStores) => {
            clearMarkers();
            if (!filteredStores?.length) return;

            filteredStores.forEach(store => {
              if (!store.lat || !store.lon) return;

              const pos = new kakao.maps.LatLng(store.lat, store.lon);
              const marker = new kakao.maps.Marker({
                map,
                position: pos,
                title: store.name,
                image: markerImage
              });

              const overlayId = 'o-' + store.id;
              const overlay = createOverlay(overlayId, store.name, store.lat, store.lon);

              const handleClick = () => {
                postMessage(store);
                panTo(store.lat, store.lon);
              };

              overlay.setMap(map);
              kakao.maps.event.addListener(marker, 'click', handleClick);
              setTimeout(() => {
                document.getElementById(overlayId)?.addEventListener('click', handleClick);
              }, 50);

              allMarkers.push(marker);
              allOverlays.push(overlay);
            });
          };

          const handleMessage = (event) => {
            try {
              const data = JSON.parse(event.data);
              const { type, payload } = data;

              if (type === 'mapCenter') {
                panTo(payload.lat, payload.lon);
              } else if (type === 'category') {
                if (payload === '') {
                  renderMarkers(stores);
                  postMessage({ type: 'filteredStores', payload: [] });
                  return;
                }

                const filtered = stores.filter(s => s.category === payload);
                renderMarkers(filtered);
                postMessage({ type: 'filteredStores', payload: filtered });

                if (filtered[0]) {
                  panTo(filtered[0].lat, filtered[0].lon);
                }
              } else if (type === 'search') {
                const found = stores.filter(s => s.name.toLowerCase().includes(payload.toLowerCase()));
                if (found[0]) {
                  postMessage(found[0]);
                  panTo(found[0].lat, found[0].lon);
                }
              }
            } catch (e) {
              console.error('Parse error:', e);
            }
          };

          window.onload = () => {
            if (!kakao?.maps?.LatLng) {
              return console.error('Kakao Maps unavailable');
            }

            map = new kakao.maps.Map(document.getElementById('map'), {
              center: new kakao.maps.LatLng(${DEFAULT_CENTER.lat}, ${DEFAULT_CENTER.lon}),
              level: ${DEFAULT_LEVEL}
            });

            kakao.maps.event.addListener(map, 'click', () => {
              postMessage({ type: 'mapClick' });
            });

            renderMarkers(stores);
          };

          window.addEventListener('message', handleMessage);
        </script>
      </body>
    </html>
  `;
}

module.exports = {
  getUserPartnershipsData,
  generateMapHTML
};
