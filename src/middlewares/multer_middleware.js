const multer = require('multer');
const path = require('path');

// uploads/users/ 폴더에 저장, 파일명은 유저아이디 + 확장자
const usersStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/users/');
  },
  filename: (req, file, cb) => {
    const user_id = req.user.id;
    const ext = path.extname(file.originalname);
    cb(null, user_id + ext);
  },
});
const usersUpload = multer({ storage: usersStorage });

// uploads/partners/ 폴더에 저장, 파일명은 단과대이름 + 확장자
const partnersStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/partners/');
  },
  filename: (req, file, cb) => {
    const 단과대이름 = req.body.name;
    const ext = path.extname(file.originalname);
    cb(null, 단과대이름 + ext);
  },
});
const partnersUpload = multer({ storage: partnersStorage });

module.exports = {
  usersUpload,
  partnersUpload
};