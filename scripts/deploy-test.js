const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const SERVER_CONFIG = {
  host: '192.168.100.203',
  port: 22,
  username: 'kuoyi',
  password: 'password'
};

const PROJECT_ROOT = path.join(__dirname, '..');
const BACKEND_JAR_PATH = 'D:\\yliyun_project\\yliyun-rag-mini-backend\\yudao-server\\target\\yly-rag-mini-server.jar';

const REMOTE_BASE_PATH = '/opt/yly-rag-mini';
const REMOTE_SERVER_PATH = `${REMOTE_BASE_PATH}/server`;
const REMOTE_WEB_PATH = `${REMOTE_BASE_PATH}/web`;
const REMOTE_JAR_NAME = 'yly-rag-mini-server.jar';

function log(title) {
  console.log(`\n========== ${title} ==========`);
}

function execRemote(conn, command, options = {}) {
  const timeoutMs = options.timeoutMs || 120000;

  return new Promise((resolve, reject) => {
    let stdout = '';
    let stderr = '';
    let finished = false;

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        reject(new Error(`远程命令超时: ${command}`));
      }
    }, timeoutMs);

    conn.exec(command, { pty: false }, (err, stream) => {
      if (err) {
        clearTimeout(timer);
        return reject(err);
      }

      stream.on('data', data => {
        stdout += data.toString();
      });

      stream.stderr.on('data', data => {
        stderr += data.toString();
      });

      stream.on('close', code => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);

        if (code === 0) {
          resolve({ stdout, stderr });
        } else {
          reject(new Error(`命令失败，退出码 ${code}\n命令: ${command}\nSTDERR: ${stderr}`));
        }
      });
    });
  });
}

function fastPut(sftp, localPath, remotePath) {
  return new Promise((resolve, reject) => {
    sftp.fastPut(localPath, remotePath, {}, err => {
      if (err) reject(err);
      else resolve();
    });
  });
}

function getLatestFrontendZip() {
  const zipFiles = fs.readdirSync(PROJECT_ROOT)
      .filter(file => file.startsWith('yly-rag-admin-web-') && file.endsWith('.zip'))
      .map(file => path.join(PROJECT_ROOT, file))
      .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

  if (zipFiles.length === 0) {
    throw new Error('未找到前端 zip 包，请先执行 pnpm build:zip');
  }

  return zipFiles[0];
}

async function main() {
  console.log('开始部署 yly-rag-mini...\n');

  if (!fs.existsSync(BACKEND_JAR_PATH)) {
    throw new Error(`后端 jar 不存在: ${BACKEND_JAR_PATH}`);
  }

  const latestZipFile = getLatestFrontendZip();

  console.log(`后端 jar: ${BACKEND_JAR_PATH}`);
  console.log(`前端 zip: ${latestZipFile}`);

  const conn = new Client();

  await new Promise((resolve, reject) => {
    conn.on('ready', resolve);
    conn.on('error', reject);
    conn.connect(SERVER_CONFIG);
  });

  log('服务器连接成功');

  const sftp = await new Promise((resolve, reject) => {
    conn.sftp((err, sftp) => {
      if (err) reject(err);
      else resolve(sftp);
    });
  });

  try {
    log('1/6 检查远程目录权限');

    await execRemote(conn, `
      mkdir -p ${REMOTE_SERVER_PATH} ${REMOTE_WEB_PATH} &&
      test -w ${REMOTE_SERVER_PATH} &&
      test -w ${REMOTE_WEB_PATH}
    `);

    log('2/6 上传后端 jar');

    const remoteJarTmp = `${REMOTE_SERVER_PATH}/${REMOTE_JAR_NAME}.tmp`;
    const remoteJarFinal = `${REMOTE_SERVER_PATH}/${REMOTE_JAR_NAME}`;

    await fastPut(sftp, BACKEND_JAR_PATH, remoteJarTmp);
    await execRemote(conn, `mv -f ${remoteJarTmp} ${remoteJarFinal}`);

    const jarSize = (fs.statSync(BACKEND_JAR_PATH).size / 1024 / 1024).toFixed(2);
    console.log(`jar 上传完成: ${remoteJarFinal} (${jarSize} MB)`);

    log('3/6 清理前端 web 目录');

    await execRemote(conn, `find ${REMOTE_WEB_PATH} -mindepth 1 -maxdepth 1 -exec rm -rf {} +`);

    log('4/6 上传前端 zip');

    const zipFileName = path.basename(latestZipFile);
    const remoteZipPath = `${REMOTE_WEB_PATH}/${zipFileName}`;

    await fastPut(sftp, latestZipFile, remoteZipPath);

    const zipSize = (fs.statSync(latestZipFile).size / 1024 / 1024).toFixed(2);
    console.log(`zip 上传完成: ${remoteZipPath} (${zipSize} MB)`);

    log('5/6 解压前端 zip');

    await execRemote(conn, `
      cd ${REMOTE_WEB_PATH} &&
      unzip -oq ${zipFileName} &&
      rm -f ${zipFileName}
    `, { timeoutMs: 180000 });

    log('6/6 部署完成');

    console.log(`后端 jar: ${remoteJarFinal}`);
    console.log(`前端目录: ${REMOTE_WEB_PATH}`);

    // 如果你已经配置了 systemctl 免密 sudo，可以打开下面这行
    // await execRemote(conn, 'sudo /bin/systemctl restart yly-rag-mini');

    console.log('\n✅ 部署成功');
  } finally {
    sftp.end();
    conn.end();
  }
}

main().catch(err => {
  console.error('\n❌ 部署失败:');
  console.error(err.message);
  process.exit(1);
});
