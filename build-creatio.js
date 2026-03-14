/**
 * Build script for Creatio integration.
 *
 * Takes the Creatio-specific Angular build output and packages it
 * into creatio-package/Files/src/js/ ready for deployment.
 */
const fs = require('fs-extra');
const path = require('path');

const DIST_DIR = path.resolve(__dirname, 'dist/creatio-build/browser');
const PACKAGE_JS_DIR = path.resolve(__dirname, 'creatio-package/Files/src/js');
const OUTPUT_FILE = path.resolve(PACKAGE_JS_DIR, 'forecast-hierarchy.js');

(async function build() {
  const mainJs = path.join(DIST_DIR, 'main.js');

  if (!await fs.pathExists(mainJs)) {
    console.error('main.js not found. Run the Angular build-creatio target first.');
    process.exit(1);
  }

  await fs.ensureDir(PACKAGE_JS_DIR);

  let content = await fs.readFile(mainJs, 'utf-8');
  // Wrap as anonymous AMD module (RequireJS assigns the name from the path)
  // and execute immediately to register the custom element
  content = `(function(){\n${content}\n})();\n`;

  await fs.writeFile(OUTPUT_FILE, content);

  // Also copy to deployed Creatio content directory if it exists (Creatio doesn't follow symlinks)
  const creatioContentDir = path.resolve(__dirname,
    'creatio-pulled/creatio-local/conf/content/UsrComponentPackage/src/js');
  if (await fs.pathExists(creatioContentDir)) {
    await fs.copy(OUTPUT_FILE, path.join(creatioContentDir, 'forecast-hierarchy.js'));
    console.log(`Copied to ${creatioContentDir}`);
  }

  const size = (await fs.stat(OUTPUT_FILE)).size;
  console.log(`Created ${OUTPUT_FILE} (${(size / 1024).toFixed(1)} kB)`);
  console.log(`\ncreatio-package/ is ready to deploy.`);
})();
