import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";

const clientDir = resolve(dirname(new URL(import.meta.url).pathname), "..");
const tauriDir = join(clientDir, "src-tauri");
const binaryPath = join(tauriDir, "target", "release", "loam");
const tauriAppPath = join(tauriDir, "target", "release", "bundle", "macos", "Loam.app");
const iconPath = join(tauriDir, "icons", "icon.icns");
const distIndex = join(clientDir, "dist", "index.html");
const releaseDir = join(clientDir, "release");
const appPath = join(releaseDir, "Loam.app");
const contentsDir = join(appPath, "Contents");
const macOSDir = join(contentsDir, "MacOS");
const resourcesDir = join(contentsDir, "Resources");
const appBinary = join(macOSDir, "Loam");
const version = "0.1.0";
const zipPath = join(releaseDir, `Loam-${version}-mac-arm64.zip`);

for (const requiredPath of [binaryPath, iconPath, distIndex]) {
  if (!existsSync(requiredPath)) {
    throw new Error(`Missing required build artifact: ${requiredPath}`);
  }
}

rmSync(appPath, { recursive: true, force: true });

if (existsSync(tauriAppPath)) {
  mkdirSync(releaseDir, { recursive: true });
  execFileSync("ditto", [tauriAppPath, appPath]);
} else {
  mkdirSync(macOSDir, { recursive: true });
  mkdirSync(resourcesDir, { recursive: true });
  copyFileSync(binaryPath, appBinary);
  copyFileSync(iconPath, join(resourcesDir, "icon.icns"));
  execFileSync("chmod", ["755", appBinary]);
  writeFileSync(
    join(contentsDir, "Info.plist"),
    `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>zh_CN</string>
  <key>CFBundleDisplayName</key>
  <string>Loam</string>
  <key>CFBundleExecutable</key>
  <string>Loam</string>
  <key>CFBundleIconFile</key>
  <string>icon.icns</string>
  <key>CFBundleIdentifier</key>
  <string>com.loam.client</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Loam</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${version}</string>
  <key>CFBundleVersion</key>
  <string>${version}</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
`,
  );
}

try {
  execFileSync("xattr", ["-cr", appPath]);
  execFileSync("codesign", ["--force", "--deep", "--sign", "-", appPath], { stdio: "inherit" });
} catch {
  console.warn("Ad-hoc signing failed; continuing with an unsigned local package.");
}

rmSync(zipPath, { force: true });
execFileSync("ditto", ["-c", "-k", "--sequesterRsrc", "--keepParent", appPath, zipPath], {
  cwd: releaseDir,
  stdio: "inherit",
});

console.log(`Created ${appPath}`);
console.log(`Created ${zipPath}`);
