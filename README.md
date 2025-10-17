# "제비: 제휴의 비밀" - 백엔드 (Express)

## 🛠 Tech Stack
- **Node.js** + **Express.js**
- **PostgreSQL**
- **JWT Authentication**
- **Multer** (파일 업로드)

## 📂 프로젝트 구조
```
src/
├── routes/
│   ├── apiRoutes.js          # 사용자 앱 API
│   └── dashboardRoutes.js    # 관리자 대시보드 API
├── middlewares/
│   ├── auth_middleware.js    # JWT 인증
│   └── multer_middleware.js  # 파일 업로드
└── services/
    └── mapService.js          # 지도 생성 로직
```

## 📱 API 기능

### apiRoutes.js - 사용자 앱
| 기능 | 엔드포인트 | 설명 |
|------|-----------|------|
| 인증 | `/api/login`, `/api/refresh` | JWT 기반 로그인/토큰 갱신 |
| 대학 인증 | `/api/college-auth/request` | 학생증 이미지로 단과대 인증 |
| 프로필 | `/api/me`, `/api/getUserCollege` | 사용자 정보 및 인증 상태 조회 |
| 지도 | `/api/map` | 사용자 맞춤 제휴 매장 지도 HTML 생성 |
| 로그 | `/api/logUserClick` | 사용자 매장 클릭 이벤트 추적 |

### dashboardRoutes.js - 관리자
| 기능 | 엔드포인트 | 설명 |
|------|-----------|------|
| 관리자 인증 | `/dashboard/login` | bcrypt 기반 관리자 로그인 |
| 대시보드 | `/dashboard/main` | 전체 데이터 조회 (users, stores, partners 등) |
| 대학 인증 관리 | `/dashboard/college_auths/:id` | 학생 인증 요청 승인/거절 |
| 매장 관리 | `/dashboard/stores` | 제휴 매장 CRUD |
| 제휴업체 관리 | `/dashboard/partners` | 단과대 정보 및 이미지 CRUD |
| 제휴 관계 관리 | `/dashboard/partnerships` | 매장-단과대 제휴 혜택 CRUD |

## 🔑 핵심 기능

### 1. JWT 기반 이중 토큰 인증
- **Access Token**: 5일 (사용자), 2시간 (관리자)
- **Refresh Token**: 150일

### 2. 대학 인증 시스템
- 학생증 이미지 업로드
- 관리자 승인/거절 프로세스
- 승인 시 사용자의 단과대 정보 자동 업데이트

### 3. 맞춤형 지도 서비스
- 사용자의 인증된 단과대 기반 필터링
- 제휴 매장만 표시되는 HTML 지도 생성

### 4. 관리자 대시보드
- 사용자/매장/제휴 통합 관리
- 실시간 인증 요청 처리

## 📦 주요 의존성
```json
{
  "express": "^4.x",
  "jsonwebtoken": "^9.x",
  "bcrypt": "^5.x",
  "multer": "^1.x",
  "pg": "^8.x"
}
```

# 제비: 제휴의 비밀 🦅 이란?

<img width="360" alt="Group 8759-3" src="https://github.com/user-attachments/assets/33f5c517-03ce-47d5-903d-4129fe52a083" />


## 1. 어플 소개

> **경희대 국제캠퍼스 학생들을 위한 맞춤형 제휴 혜택 발견 서비스**
>
> 제비는 경희대 국제캠퍼스 학생들을 타깃으로 단과대별 맞춤 제휴 혜택을 제공합니다.
>
> 지도 기반의 직관적인 인터페이스로 주변 제휴 매장을 쉽게 찾고, 나만의 혜택을 확인할 수 있습니다.
>
> 위치 기반 매장 탐색, 카테고리별 필터링, 단과대 인증 시스템 등 대학생 제휴 혜택 관리에 필요한 모든 기능을 제공합니다.

**📱 다운로드**
- [App Store (iOS)](https://apps.apple.com/br/app/%EC%A0%9C%EB%B9%84-%EC%A0%9C%ED%9C%B4%EC%9D%98-%EB%B9%84%EB%B0%80/id6596768381?l=en-GB)
- [Google Play (Android)](https://play.google.com/store/apps/details?id=com.kkalguallo.binzari&hl=ko)

## 2. Members

| **이름** | **분야** |
| -------- | -------- |
| 김대현 | 🎨 UX/UI 디자인, 홍보물 디자인 |
| 신경수 | 📋 기획, 영업, 마케팅 |
| 양나빈 | 💻 백엔드 및 DB 구축, 화면 UI 구현, 서버 연동, 배포 |
| 윤소은 | 📋 기획, 마케팅 |

## 3. 기획

### | 타겟 분석

**타겟 유저**
- 경희대학교 국제캠퍼스 재학생
- 주변 제휴 혜택 정보가 필요한 대학생
- 단과대별 맞춤 혜택을 원하는 학생

### | User Research

**주요 Pain Points**
- 제휴 정보가 분산되어 있어 찾기 어려움
- 본인에게 해당하는 혜택인지 확인이 어려움
- 위치 기반으로 주변 제휴점을 찾기 어려움

### | Needs & Insights

> 경희대 국제캠퍼스 학생들에게 단과대별 맞춤 제휴 혜택을 지도 기반으로 쉽고 편리하게 제공하는 위치 기반 제휴 발견 서비스

### | Main Function

**핵심 기능**
1. **지도 기반 제휴점 탐색** - 카카오맵 기반 주변 제휴 매장 표시
2. **단과대 인증 시스템** - 학생 인증 후 맞춤 혜택 제공
3. **카테고리 필터링** - 음식점, 카페, 문화 등 카테고리별 검색
4. **상세 제휴 정보** - 매장별 상세한 제휴 혜택 안내

### | Brand Identity

**브랜드 컨셉**
- 제비(새): 학생들에게 좋은 소식을 전하는 메신저
- 제휴의 비밀: 숨겨진 혜택을 발견하는 즐거움

## 4. 주요 기능

- **로그인/회원가입** (카카오 소셜 로그인, 애플 소셜 로그인)
- **단과대 인증 시스템** (학생 인증 요청 및 승인)
- **지도 기반 매장 탐색** (카카오맵 연동)
- **위치 기반 제휴점 표시** (사용자 주변 매장 자동 탐색)
- **카테고리별 필터링** (음식점, 카페, 문화/엔터테인먼트 등)
- **매장 상세 정보** (제휴 혜택, 위치, 운영시간 등)
- **검색 기능** (매장명, 키워드 검색)
- **프로필 관리** (인증 상태, 사용자 정보)

## 5. 시스템 아키텍처
- **Frontend**: React Native + Expo
- **Maps**: Kakao Map API
- **Authentication**: Kakao Login, Apple Sign In
- **API Communication**: REST API
- **Storage**: Expo SecureStore (토큰 관리)

## 6. 주요 데이터 모델
- Users (사용자)
- Colleges (단과대)
- Stores (매장)
- Partnerships (제휴 정보)
- Verifications (인증 요청)

## 7. Technology

### Design

![Figma](https://img.shields.io/badge/figma-%23F24E1E.svg?style=for-the-badge&logo=figma&logoColor=white)

&nbsp;

### FrontEnd

![React Native](https://img.shields.io/badge/react_native-%2320232a.svg?style=for-the-badge&logo=react&logoColor=%2361DAFB) ![Expo](https://img.shields.io/badge/expo-1C1E24?style=for-the-badge&logo=expo&logoColor=#D04A37) ![TypeScript](https://img.shields.io/badge/typescript-%23007ACC.svg?style=for-the-badge&logo=typescript&logoColor=white)

**Core Libraries**
- React 19
- React Native 0.79.5
- Expo 53
- Expo Router 5 (File-based routing)

**UI & Animation**
- React Native Reanimated
- React Native Gesture Handler
- Pretendard Font (Korean)

**Maps & Location**
- Kakao Map SDK
- Expo Location

**Authentication**
- Kakao Login SDK
- Apple Authentication
- JWT Token Management

&nbsp;

### BackEnd

**Language & Framework**

![Node.js](https://img.shields.io/badge/node.js-6DA55F?style=for-the-badge&logo=node.js&logoColor=white) ![Express](https://img.shields.io/badge/express.js-%23404d59.svg?style=for-the-badge&logo=express&logoColor=%2361DAFB)

**Database**

![PostgreSQL](https://img.shields.io/badge/postgresql-%23316192.svg?style=for-the-badge&logo=postgresql&logoColor=white)

**Authentication & Security**

- JWT (JSON Web Token) - Access/Refresh Token 관리
- bcrypt - 비밀번호 암호화
- 카카오/애플 소셜 로그인 연동

**File Handling**

- Multer - 이미지 업로드 (학생증 인증)

**Deployment & Infrastructure**

- Docker & Docker Compose
- Nginx (Reverse Proxy)
- PostgreSQL 13
- Node.js 18

**API Features**

- RESTful API 설계
- CORS 설정 (크로스 도메인 통신)
- 사용자 로그 분석 시스템
- 관리자 대시보드 API





**제비와 함께 경희대 국제캠퍼스의 모든 제휴 혜택을 발견하세요! 🦅**
