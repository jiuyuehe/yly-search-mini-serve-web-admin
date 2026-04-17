const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// 服务器配置
// const SERVER_CONFIG = {
//   host: '192.168.100.100',
//   port: 22,
//   username: 'huawei',
//   password: 'huawei123'
// };

// 服务器配置
const SERVER_CONFIG = {
  host: '192.168.0.188',
  port: 22,
  username: 'root',
  password: 'yliyun123'
};

// 文件路径配置
const PROJECT_ROOT = path.join(__dirname, '..');
const BACKEND_JAR_PATH = "D:\\yliyun_project\\yliyun-rag-mini-backend\\yudao-server\\target\\yly-rag-mini-server.jar";


// 远程路径配置
const REMOTE_SERVER_PATH = '/opt/yly-rag-mini/server';
const REMOTE_WEB_PATH = '/opt/yly-rag-mini/web';
const REMOTE_JAR_NAME = 'yly-rag-mini-server.jar';

console.log('========================================');
console.log('  开始部署到测试服务器');
console.log('========================================\n');

// 步骤1: 检查本地文件是否存在
console.log('步骤 1/6: 检查本地文件...');

if (!fs.existsSync(BACKEND_JAR_PATH)) {
  console.error(`❌ 错误: 后端jar包不存在: ${BACKEND_JAR_PATH}`);
  console.error('   请先执行后端构建: mvn clean package -DskipTests');
  process.exit(1);
}
console.log(`✓ 后端jar包存在: ${BACKEND_JAR_PATH}`);

// 查找最新的zip文件
const zipFiles = fs.readdirSync(path.join(PROJECT_ROOT))
  .filter(file => file.startsWith('yly-rag-admin-web-') && file.endsWith('.zip'))
  .map(file => path.join(PROJECT_ROOT, file));

if (zipFiles.length === 0) {
  console.error('❌ 错误: 未找到前端zip包');
  console.error('   请先执行: pnpm build:zip');
  process.exit(1);
}

// 按修改时间排序,获取最新的zip文件
zipFiles.sort((a, b) => {
  return fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs;
});

const latestZipFile = zipFiles[0];
console.log(`✓ 前端zip包存在: ${latestZipFile}\n`);

// 步骤2: 连接服务器
console.log('步骤 2/6: 连接到测试服务器...');

const conn = new Client();

conn.on('ready', () => {
  console.log('✓ 服务器连接成功\n');
  
  // 步骤3: 上传后端jar包
  console.log('步骤 3/6: 上传后端jar包...');
  
  conn.sftp((err, sftp) => {
    if (err) {
      console.error('❌ SFTP连接失败:', err);
      conn.end();
      process.exit(1);
    }
    
    const remoteJarPath = path.posix.join(REMOTE_SERVER_PATH, REMOTE_JAR_NAME);
    
    // 先删除旧文件
    sftp.unlink(remoteJarPath, (unlinkErr) => {
      if (unlinkErr && unlinkErr.code !== 2) {
        console.error('⚠️  删除旧jar包失败(可能不存在):', unlinkErr.message);
      } else {
        console.log('✓ 已删除旧的jar包');
      }
      
      // 上传新文件
      console.log('正在上传jar包...');
      sftp.fastPut(BACKEND_JAR_PATH, remoteJarPath, {}, (uploadErr) => {
        if (uploadErr) {
          console.error('❌ jar包上传失败:', uploadErr);
          sftp.end();
          conn.end();
          process.exit(1);
        }
        
        const jarSize = (fs.statSync(BACKEND_JAR_PATH).size / 1024 / 1024).toFixed(2);
        console.log(`✓ jar包上传成功 (${jarSize} MB)`);
        console.log(`   远程路径: ${remoteJarPath}\n`);
        
        // 步骤4: 清空web目录并上传zip
        console.log('步骤 4/6: 清理远程web目录...');
        
        conn.exec(`rm -rf ${REMOTE_WEB_PATH}/*`, (err, stream) => {
          if (err) {
            console.error('❌ 清理web目录失败:', err);
            sftp.end();
            conn.end();
            process.exit(1);
          }
          
          stream.on('close', (code, signal) => {
            console.log('✓ web目录已清空');
            
            // 步骤5: 上传zip文件
            console.log('\n步骤 5/6: 上传前端zip包...');
            
            const zipFileName = path.basename(latestZipFile);
            const remoteZipPath = path.posix.join(REMOTE_WEB_PATH, zipFileName);
            
            console.log('正在上传zip包...');
            sftp.fastPut(latestZipFile, remoteZipPath, {}, (uploadErr) => {
              if (uploadErr) {
                console.error('❌ zip包上传失败:', uploadErr);
                sftp.end();
                conn.end();
                process.exit(1);
              }
              
              const zipSize = (fs.statSync(latestZipFile).size / 1024 / 1024).toFixed(2);
              console.log(`✓ zip包上传成功 (${zipSize} MB)`);
              console.log(`   远程路径: ${remoteZipPath}\n`);
              
              // 步骤6: 解压zip文件
              console.log('步骤 6/6: 解压前端zip包...');
              
              conn.exec(`cd ${REMOTE_WEB_PATH} && unzip -o ${zipFileName}`, (err, stream) => {
                if (err) {
                  console.error('❌ 解压失败:', err);
                  sftp.end();
                  conn.end();
                  process.exit(1);
                }
                
                stream.on('close', (code, signal) => {
                  if (code === 0) {
                    console.log('✓ zip包解压成功');
                    
                    // 删除zip文件
                    sftp.unlink(remoteZipPath, (unlinkErr) => {
                      if (unlinkErr) {
                        console.log('⚠️  删除zip文件失败:', unlinkErr.message);
                      } else {
                        console.log('✓ 已删除zip文件');
                      }
                      
                      sftp.end();
                      conn.end();
                      
                      console.log('\n========================================');
                      console.log('  ✅ 部署完成!');
                      console.log('========================================');
                      console.log(`后端服务: ${REMOTE_SERVER_PATH}/${REMOTE_JAR_NAME}`);
                      console.log(`前端文件: ${REMOTE_WEB_PATH}/`);
                      console.log('\n请记得重启后端服务以应用更新。');
                    });
                  } else {
                    console.error(`❌ 解压失败,退出码: ${code}`);
                    sftp.end();
                    conn.end();
                    process.exit(1);
                  }
                }).on('data', (data) => {
                  console.log('STDOUT:', data.toString());
                }).stderr.on('data', (data) => {
                  console.log('STDERR:', data.toString());
                });
              });
            });
          }).on('data', (data) => {
            console.log('STDOUT:', data.toString());
          }).stderr.on('data', (data) => {
            console.log('STDERR:', data.toString());
          });
        });
      });
    });
  });
}).on('error', (err) => {
  console.error('❌ 服务器连接失败:', err);
  process.exit(1);
}).connect(SERVER_CONFIG);
