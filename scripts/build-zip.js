const fs = require('fs');
const path = require('path');
const archiver = require('archiver');

// 获取当前日期时间作为文件名的一部分
const now = new Date();
const dateStr = now.toISOString().replace(/[:.]/g, '-').split('T')[0];
const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
const zipFileName = `yly-rag-admin-web-${dateStr}-${timeStr}.zip`;

// 路径配置
const distPath = path.join(__dirname, '..', 'dist-prod');
const zipPath = path.join(__dirname, '..', zipFileName);

// 检查dist目录是否存在
if (!fs.existsSync(distPath)) {
  console.error(`错误: ${distPath} 目录不存在，请先执行构建命令`);
  process.exit(1);
}

// 创建输出流
const output = fs.createWriteStream(zipPath);
const archive = archiver('zip', {
  zlib: { level: 9 } // 设置压缩级别
});

// 监听事件
output.on('close', () => {
  const sizeInMB = (archive.pointer() / 1024 / 1024).toFixed(2);
  console.log(`✓ 打包完成!`);
  console.log(`  文件名: ${zipFileName}`);
  console.log(`  文件大小: ${sizeInMB} MB`);
  console.log(`  保存位置: ${zipPath}`);
});

archive.on('error', (err) => {
  console.error('打包错误:', err);
  throw err;
});

// 管道连接
archive.pipe(output);

// 添加dist目录内容到zip
console.log('开始打包 dist-prod 目录...');
archive.directory(distPath, false);

// 完成打包
archive.finalize();
