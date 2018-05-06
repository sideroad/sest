// @flow
import fs from "fs-extra";
import sizeOf from "image-size";
import path from "path";
import puppeteer from "puppeteer";
import { PNG } from "pngjs";
import pixelmatch from "pixelmatch";
import chalk from "chalk";

const log = console.log;

const setupDirs = dist => {
  log(chalk.white(`initialize dist directory ${dist}`));
  const beforeDir = path.join(dist, "before");
  const afterDir = path.join(dist, "after");
  const failDir = path.join(dist, "fail");
  const diffDir = path.join(dist, "diff");
  fs.ensureDirSync(afterDir);
  fs.removeSync(diffDir);
  fs.ensureDirSync(diffDir);
  fs.removeSync(failDir);
  fs.ensureDirSync(failDir);
  fs.copySync(afterDir, beforeDir);
  return {
    beforeDir,
    afterDir,
    diffDir,
    failDir
  };
};

const readFile = file =>
  new Promise(resolve => {
    const stream = fs
      .createReadStream(file)
      .pipe(new PNG())
      .on("parsed", () => resolve(stream));
  });

module.exports = async ({
  targets,
  dist,
  threshold = 10,
  width = 1280,
  height = 800,
  cookies,
  proxy
}) => {
  const { beforeDir, afterDir, failDir, diffDir } = setupDirs(dist);
  const results = [];
  const browser = await puppeteer.launch({
    args: proxy ? [`--proxy-server=${proxy}`] : []
  });
  const page = await browser.newPage();
  const counts = {
    fail: 0,
    passed: 0,
    new: 0,
    total: 0
  };
  if (cookies && cookies.length) {
    await page.setCookie(...cookies);
  }
  await page.setViewport({
    width,
    height
  });
  for (const target of targets) {
    log(chalk.white(`${target.url} - ${target.name}`));
    try {
      await page.goto(target.url);
      const fileName = `${target.name}.png`;
      const afterFilePath = path.join(afterDir, fileName);
      const beforeFilePath = path.join(beforeDir, fileName);
      const diffFilePath = path.join(diffDir, fileName);

      for (const action of target.actions) {
        await page.click(action);
        await new Promise(resolve => setTimeout(() => resolve(), 1000));
      }

      await page.screenshot({ path: afterFilePath, fullPage: true });
      if (fs.existsSync(beforeFilePath)) {
        const dimensions = sizeOf(afterFilePath);
        const diff = new PNG(dimensions);
        const before = await readFile(beforeFilePath);
        const after = await readFile(afterFilePath);
        const numberOfPixels = pixelmatch(
          before.data,
          after.data,
          diff.data,
          dimensions.width,
          dimensions.height,
          {
            threshold: 0.1
          }
        );
        await new Promise(resolve =>
          diff
            .pack()
            .pipe(fs.createWriteStream(diffFilePath))
            .on("finish", () => {
              const ratio =
                Math.floor(
                  numberOfPixels /
                    (dimensions.width * dimensions.height) *
                    100 *
                    Math.pow(10, 2)
                ) / Math.pow(10, 2);

              if (ratio > threshold) {
                log(chalk.red.bold(`fail: ${ratio}% difference`));

                const failBeforeName = `${target.name}.before.png`;
                const failAfterName = `${target.name}.after.png`;
                const failDiffName = `${target.name}.diff.png`;
                fs.copySync(beforeFilePath, path.join(failDir, failBeforeName));
                fs.copySync(afterFilePath, path.join(failDir, failAfterName));
                fs.copySync(diffFilePath, path.join(failDir, failDiffName));
                counts.fail++;
              } else {
                counts.passed++;
              }
              results.push({
                name: target.name,
                url: target.url,
                file: fileName,
                ratio
              });
              resolve();
            })
        );
      } else {
        log(chalk.blue.bold("create new page snapshot"));
        fs.copySync(afterFilePath, beforeFilePath);
        counts.new++;
      }
    } catch (err) {
      log(chalk.red(err.stack));
      counts.fail++;
    }
    counts.total++;
  }
  await browser.close();
  const fails = results
    .filter(item => item.ratio >= threshold)
    .sort((a, b) => a.ratio < b.ratio);
  const passed = results.length - fails.length;
  fs.writeJSONSync(path.join(dist, "results.json"), results);
  fs.writeFileSync(
    path.join(dist, "results.txt"),
    results
      .map(item => `${item.name},${item.url},${item.ratio},${item.file}`)
      .join("\n")
  );
  fs.writeFileSync(
    path.join(dist, "fail.txt"),
    fails
      .map(item => `${item.name},${item.url},${item.ratio},${item.file}`)
      .join("\n")
  );

  log("");
  fails.map(fail =>
    log(
      `${chalk.black.bgRed.bold("FAIL")} ${chalk.red.bold(
        `${fail.ratio}% difference ${fail.url} ${fail.name}`
      )}`
    )
  );
  log("");
  log(
    `Tests: ${counts.fail ? chalk.red.bold(`${counts.fail} fail, `) : ""}${
      counts.passed ? chalk.green.bold(`${counts.passed} passed, `) : ""
    }${counts.new ? chalk.blue.bold(`${counts.new} new, `) : ""}${
      results.length
    } total`
  );
};
