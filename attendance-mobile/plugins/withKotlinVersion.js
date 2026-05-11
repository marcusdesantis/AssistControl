const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Forces Kotlin 1.9.25 in the classpath so Compose Compiler 1.5.15 compiles correctly.
 * expo-prebuild generates the classpath without a version, causing Gradle to resolve 1.9.24
 * from the React Native Gradle plugin BOM instead of the 1.9.25 set in kotlinVersion.
 */
const withKotlinVersion = (config) => {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      config.modResults.contents = config.modResults.contents.replace(
        "classpath('org.jetbrains.kotlin:kotlin-gradle-plugin')",
        'classpath("org.jetbrains.kotlin:kotlin-gradle-plugin:${kotlinVersion}")'
      );
    }
    return config;
  });
};

module.exports = withKotlinVersion;
