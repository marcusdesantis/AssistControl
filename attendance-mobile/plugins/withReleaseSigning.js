const fs   = require('fs');
const path = require('path');
const { withAppBuildGradle, withGradleProperties } = require('@expo/config-plugins');

/**
 * Configura la firma de release para los builds locales de Gradle.
 *
 * El template de `expo prebuild` firma el release con el debug.keystore, y
 * Play Store rechaza ese AAB. Antes el bloque de firma se editaba a mano en
 * android/app/build.gradle y las contraseñas vivían en android/gradle.properties,
 * así que `prebuild --clean` los borraba junto con la carpeta android/.
 *
 * Este plugin los vuelve a inyectar en cada prebuild, leyendo las credenciales
 * de credentials/signing.json (gitignorado, nunca llega al repo).
 *
 * Si signing.json no existe — otra máquina, un CI — el plugin no hace nada y el
 * build cae al debug.keystore, que sirve para pruebas pero no para publicar.
 */

const SIGNING_FILE = path.join(__dirname, '..', 'credentials', 'signing.json');
const PROPS = ['KEYSTORE_FILE', 'KEYSTORE_PASSWORD', 'KEY_ALIAS', 'KEY_PASSWORD'];

function readSigningConfig() {
  try {
    const raw = JSON.parse(fs.readFileSync(SIGNING_FILE, 'utf8'));
    if (PROPS.every((k) => typeof raw[k] === 'string' && raw[k].length > 0)) return raw;
    console.warn('[withReleaseSigning] credentials/signing.json incompleto — se omite la firma de release');
  } catch {
    console.warn('[withReleaseSigning] sin credentials/signing.json — el release se firmará con debug.keystore');
  }
  return null;
}

const RELEASE_BLOCK = `
        release {
            if (project.hasProperty('KEYSTORE_FILE')) {
                storeFile file(KEYSTORE_FILE)
                storePassword KEYSTORE_PASSWORD
                keyAlias KEY_ALIAS
                keyPassword KEY_PASSWORD
            }
        }`;

const RELEASE_SIGNING_CONFIG =
  "signingConfig project.hasProperty('KEYSTORE_FILE') ? signingConfigs.release : signingConfigs.debug";

const withSigningGradle = (config) =>
  withAppBuildGradle(config, (cfg) => {
    if (cfg.modResults.language !== 'groovy') return cfg;
    let contents = cfg.modResults.contents;

    // Idempotente: si ya se aplicó, no duplicar.
    if (contents.includes('KEYSTORE_FILE')) return cfg;

    // 1. Añadir signingConfigs.release justo después del bloque debug.
    const before = contents;
    contents = contents.replace(
      /(signingConfigs\s*\{[\s\S]*?debug\s*\{[\s\S]*?\n\s*\})/,
      `$1\n${RELEASE_BLOCK}`,
    );
    if (contents === before) {
      throw new Error('[withReleaseSigning] no se encontró el bloque signingConfigs.debug en app/build.gradle');
    }

    // 2. En buildTypes.release, usar ese signingConfig. La última aparición de
    //    "signingConfig signingConfigs.debug" es la de release (debug va antes).
    const marker = 'signingConfig signingConfigs.debug';
    const idx = contents.lastIndexOf(marker);
    if (idx === -1) {
      throw new Error('[withReleaseSigning] no se encontró buildTypes.release en app/build.gradle');
    }
    contents = contents.slice(0, idx) + RELEASE_SIGNING_CONFIG + contents.slice(idx + marker.length);

    cfg.modResults.contents = contents;
    return cfg;
  });

const withSigningProperties = (config, signing) =>
  withGradleProperties(config, (cfg) => {
    for (const key of PROPS) {
      const i = cfg.modResults.findIndex((item) => item.type === 'property' && item.key === key);
      const entry = { type: 'property', key, value: signing[key] };
      if (i >= 0) cfg.modResults[i] = entry;
      else cfg.modResults.push(entry);
    }
    return cfg;
  });

module.exports = (config) => {
  const signing = readSigningConfig();
  if (!signing) return config;
  return withSigningProperties(withSigningGradle(config), signing);
};
