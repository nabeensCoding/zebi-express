// 사용자 모델 (users 테이블)
class User {
  /**
   * @param {Object} param
   * @param {string} param.id - UUID
   * @param {string} param.refresh_token
   * @param {string} param.name - 이름
   * @param {string} param.image - 이미지 (NOT NULL)
   * @param {string} param.phone - 전화번호 (NOT NULL, 유니크)
   * @param {boolean} [param.is_verified] - 인증 여부 (기본 false)
   * @param {string[]} [param.college_auth] - 인증된 단과대 UUID 리스트 (UUID 문자열 배열)
   * @param {string} [param.created_at] - 생성일 (ISO 문자열)
   */
  constructor({ id, refresh_token, name, image, phone, is_verified = false, college_auth = [], created_at }) {
    this.id = id;
    this.refresh_token = refresh_token;
    this.name = name;
    this.image = image;
    this.phone = phone;
    this.is_verified = is_verified;
    this.college_auth = college_auth; // UUID 배열 (문자열)
    this.created_at = created_at;
  }
}


// 단과대 인증 모델 (college_auths 테이블)
class CollegeAuth {
  /**
   * @param {Object} param
   * @param {string} param.id - UUID
   * @param {string} param.user_id - users.id 참조
   * @param {string} param.info21_image - 이미지 (NOT NULL)
   * @param {string} [param.created_at] - 생성일 (ISO 문자열)
   * @param {string} [param.updated_at] - 수정일 (ISO 문자열)
   */
  constructor({ id, user_id, info21_image, created_at, updated_at }) {
    this.id = id;
    this.user_id = user_id;
    this.info21_image = info21_image;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }
}

// 가게 모델 (stores 테이블)
class Store {
  /**
   * @param {Object} param
   * @param {string} param.id - UUID
   * @param {string} param.name - 이름 (NOT NULL)
   * @param {string} [param.image] - 이미지 (NULL 가능)
   * @param {string} param.category - 카테고리 (NOT NULL)
   * @param {number} [param.lat] - 위도
   * @param {number} [param.lon] - 경도
   * @param {string} [param.created_at] - 생성일 (ISO 문자열)
   */
  constructor({ id, name, image = null, category, lat = null, lon = null, created_at }) {
    this.id = id;
    this.name = name;
    this.image = image;
    this.category = category;
    this.lat = lat;
    this.lon = lon;
    this.created_at = created_at;
  }
}

// 제휴업체 모델 (partners 테이블)
class Partner {
  /**
   * @param {Object} param
   * @param {string} param.id - UUID
   * @param {string} param.name - 이름 (NOT NULL)
   * @param {string} param.image - 이미지 (NOT NULL)
   * @param {string} [param.created_at] - 생성일 (ISO 문자열)
   */
  constructor({ id, name, image, created_at }) {
    this.id = id;
    this.name = name;
    this.image = image;
    this.created_at = created_at;
  }
}

// 제휴 관계 모델 (partnerships 테이블)
class Partnership {
  /**
   * @param {Object} param
   * @param {string} param.id - UUID
   * @param {string} param.store_id - stores.id 참조
   * @param {string} param.partner_id - partners.id 참조
   * @param {string} param.short_description - 간략 설명 (NOT NULL)
   * @param {string} param.long_description - 상세 설명 (NOT NULL)
   * @param {string} [param.created_at] - 생성일 (ISO 문자열)
   * @param {string} [param.updated_at] - 수정일 (ISO 문자열)
   */
  constructor({ id, store_id, partner_id, short_description, long_description, created_at, updated_at }) {
    this.id = id;
    this.store_id = store_id;
    this.partner_id = partner_id;
    this.short_description = short_description;
    this.long_description = long_description;
    this.created_at = created_at;
    this.updated_at = updated_at;
  }
}

module.exports = {
  User,
  CollegeAuth,
  Store,
  Partner,
  Partnership,
};

