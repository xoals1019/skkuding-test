import fs from "fs";
import os from "os";
import path from "path";
import express from "express";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";

// JWT 비밀 키 설정 : 토큰의 서명을 생성하고 검증하기 위함
const SECRET_KEY = "your-secret-key";

const app = express(); // 여기서 express 애플리케이션 생성
const router = express.Router(); // Router 함수 호출
const port = 3000;

app.use(express.json()); // JSON 요청을 파싱하는 미들웨어
app.use(cookieParser()); // 쿠키를 파싱하는 미들웨어

const readJSONFile = (filePath) => {
  return new Promise((resolve, reject) => {
    if (!fs.existsSync(filePath)) {
      return resolve([]); // 파일이 없으면 빈 배열 반환
    }

    fs.readFile(filePath, "utf8", (err, data) => {
      if (err) {
        console.log("error reading file");
        reject();
      } else {
        if (!data) {
          resolve([]);
        } else {
          resolve(JSON.parse(data));
        }
      }
    });
  });
};

const writeJSONFile = (filePath, data) => {
  return new Promise((resolve, reject) => {
    fs.writeFile(filePath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.log("error writing file");
        reject(err);
      } else {
        resolve();
      }
    });
  });
};

// GET /
router.get("/", (req, res) => {
  res.sendFile(path.resolve("index.html"));
});

// POST /api/signup
router.post("/api/signup", async (req, res) => {
  const { username, password, email } = req.body;

  if (!username || !password || !email) {
    return res.status(400).send("모든 필드를 입력해야 합니다.");
  }

  try {
    const users = await readJSONFile("users.json");
    users.push({ username, password, email });
    await writeJSONFile("users.json", users);

    res.status(201).send("회원가입 완료");
  } catch (err) {
    res.status(500).send("서버 오류");
  }
});

// POST /api/login
router.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("아이디와 비밀번호를 모두 입력해야 합니다.");
  }

  try {
    const users = await readJSONFile("users.json");
    const isUser = users.find(
      (user) => user.username === username && user.password === password
    );

    // 사용자가 있다면 JWT 생성
    if (isUser) {
      const token = jwt.sign({ username }, SECRET_KEY, { expiresIn: "1h" });

      res.cookie("auth_token", token, {
        httpOnly: true,
        maxAge: 60 * 60 * 1000, // 1시간
      });
      res.status(200).send("로그인 성공");
    } else {
      res.status(401).send("아이디 또는 비밀번호가 잘못되었습니다.");
    }
  } catch (err) {
    res.status(500).send("서버 오류");
  }
});

// 인증 미들웨어 (토큰 확인)
const authenticate = (req, res, next) => {
  // 쿠키에서 토큰 가져오기
  const token = req.cookies.auth_token;

  if (!token) {
    return res.status(401).send("인증되지 않은 사용자입니다.");
  }

  // jwt.verify()는 토큰이 서버에서 발급한 것인지,
  // 토큰이 아직 유효한지 확인
  jwt.verify(token, SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(403).send("토큰이 유효하지 않습니다.");
    }
    // 인증된 사용자 정보 저장
    // 이후의 미들웨어나 라우트 핸들러에서 사용자가 누군인지 알 수 O
    req.username = decoded.username;
    next();
  });
};

// GET /api/users
router.get("/api/users", authenticate, async (req, res) => {
  try {
    const users = await readJSONFile("users.json");
    const safeUsers = users.map(({ username, email }) => ({ username, email }));
    res.json(safeUsers);
  } catch (err) {
    res.status(500).send("서버 오류");
  }
});

// GET /api/os
router.get("/api/os", authenticate, (req, res) => {
  const osInfo = {
    type: os.type(),
    hostname: os.hostname(),
    cpu_num: os.cpus().length,
    total_mem: `${Math.round(os.totalmem() / 1024 / 1024)} MB`,
  };
  res.json(osInfo);
});

app.use("/", router); // 라우터 사용하기

// 라우터에서 설정되어 있지 않은 주소로 접속하려 할 때
app.all("*", (req, res) => {
  res.status(404).send("PAGE NOT FOUND");
});

app.listen(port, () => {
  console.log(`서버 실행 중`);
});

export default router;
