import fs from 'fs-extra';
import path from 'path';
import puppeteer from 'puppeteer';
import sha1 from 'sha1';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const setupDirs = (dist) => {
  const beforeDir = path.join(dist, 'before');
  const afterDir = path.join(dist, 'after');
  const diffDir = path.join(dist, 'diff');
  fs.ensureDirSync(afterDir);
  fs.removeSync(diffDir);
  fs.ensureDirSync(diffDir);
  fs.copySync(afterDir, beforeDir);
  return {
    beforeDir,
    afterDir,
    diffDir
  };
};

const readFile = file =>
  new Promise((resolve) => {
    const stream = fs
      .createReadStream(file)
      .pipe(new PNG())
      .on('parsed', () => resolve(stream));
  });

module.exports = async ({ urls, dist, threshold }) => {
  const { beforeDir, afterDir, diffDir } = setupDirs(dist);
  const results = [];
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  const width = 1280;
  const height = 800;
  page.setViewport({
    width,
    height
  });
  for (const url of urls) {
    await page.goto(url);
    const fileName = `${sha1(url)}.png`;
    const afterFilePath = path.join(afterDir, fileName);
    const beforeFilePath = path.join(beforeDir, fileName);
    const diffFilePath = path.join(diffDir, fileName);
    await page.screenshot({ path: afterFilePath });
    if (fs.existsSync(beforeFilePath)) {
      const diff = new PNG({ width, height });
      const before = await readFile(beforeFilePath);
      const after = await readFile(afterFilePath);
      const numberOfPixels = pixelmatch(before.data, after.data, diff.data, width, height, {
        threshold: 0.1
      });
      await new Promise(resolve =>
        diff
          .pack()
          .pipe(fs.createWriteStream(diffFilePath))
          .on('finish', () => {
            results.push({
              url,
              file: fileName,
              ratio: Math.floor(numberOfPixels / (width * height) * 100 * Math.pow(10, 2)) / Math.pow(10, 2)
            });
            resolve();
          })
      );
    } else {
      fs.copySync(afterFilePath, beforeFilePath);
    }
  }
  await browser.close();
  fs.writeFileSync(
    path.join(dist, 'results.txt'),
    results.map(item => `${item.url},${item.ratio},${item.file}`).join('\n')
  );
  fs.writeJSONSync(path.join(dist, 'results.json'), results);
  fs.writeFileSync(
    path.join(dist, 'violate.txt'),
    results
      .filter(item => item.ratio >= threshold)
      .map(item => `${item.url},${item.ratio},${item.file}`)
      .join('\n')
  );
};
