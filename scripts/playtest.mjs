import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

mkdirSync("/workspace/screenshots", { recursive: true });

const browser = await chromium.launch({
  headless: true,
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

const errors = [];
async function run(name, viewport, fn) {
  const page = await browser.newPage({ viewport });
  page.on("pageerror", (err) => errors.push(`${name}: ${err.message}`));
  page.on("console", (msg) => {
    if (msg.type() === "error") errors.push(`${name} console: ${msg.text()}`);
  });
  await page.goto("http://127.0.0.1:8080/", { waitUntil: "networkidle", timeout: 45000 });
  await page.waitForTimeout(1200);
  await fn(page);
  await page.close();
}

await run("desktop", { width: 1280, height: 800 }, async (page) => {
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: "/workspace/screenshots/play.png" });

  const probe = await page.evaluate(() => {
    const t = window.__controlsTest;
    return t
      ? { yaw: t.getYaw(), speed: t.getSpeed(), pos: t.getPos?.() }
      : { missing: true };
  });
  console.log("probe after play", probe);

  await page.evaluate(() => {
    window.__controlsTest?.setKeys?.(["KeyW"]);
  });
  await page.waitForTimeout(600);
  const afterW = await page.evaluate(() => ({
    yaw: window.__controlsTest.getYaw(),
    speed: window.__controlsTest.getSpeed(),
    pos: window.__controlsTest.getPos(),
  }));
  console.log("after W", afterW);

  const y0 = afterW.yaw;
  const p0 = afterW.pos;
  await page.evaluate(() => {
    window.__controlsTest.setKeys(["KeyW", "KeyA"]);
  });
  await page.waitForTimeout(500);
  const afterA = await page.evaluate(() => ({
    yaw: window.__controlsTest.getYaw(),
    speed: window.__controlsTest.getSpeed(),
    pos: window.__controlsTest.getPos(),
  }));
  console.log("after A", afterA);

  await page.evaluate(() => {
    window.__controlsTest.setKeys(["KeyW", "KeyD"]);
  });
  await page.waitForTimeout(500);
  const afterD = await page.evaluate(() => ({
    yaw: window.__controlsTest.getYaw(),
    speed: window.__controlsTest.getSpeed(),
    pos: window.__controlsTest.getPos(),
  }));
  console.log("after D", afterD);

  // On-foot: A strafes left relative to yaw=0 (facing -Z) => x decreases
  // Camera yaw starts at 0. Left = -X.
  const leftDx = afterA.pos.x - p0.x;
  const rightDx = afterD.pos.x - afterA.pos.x;
  console.log("strafe signs", { leftDx, rightDx, y0 });

  await page.evaluate(() => window.__controlsTest.setKeys([]));
  await page.screenshot({ path: "/workspace/screenshots/moving.png" });

  if (!(afterW.speed > 0.4)) {
    errors.push("W did not produce forward speed");
  }
  if (!(leftDx < -0.05)) {
    errors.push(`A did not strafe left (dx=${leftDx})`);
  }
  if (!(rightDx > 0.05)) {
    errors.push(`D did not strafe right (dx=${rightDx})`);
  }
});

await run("mobile", { width: 390, height: 844 }, async (page) => {
  await page.waitForTimeout(400);
  await page.screenshot({ path: "/workspace/screenshots/mobile.png" });
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth + 2,
  );
  console.log("mobile overflow", overflow);
  if (overflow) errors.push("mobile horizontal overflow");
});

await browser.close();
if (errors.length) {
  console.error("FAIL", errors);
  process.exit(1);
}
console.log("PASS");
