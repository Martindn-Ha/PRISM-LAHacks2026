const fs = require('fs');
const path = require('path');
const {
  withInfoPlist,
  withDangerousMod,
  withXcodeProject,
  IOSConfig,
} = require('expo/config-plugins');

const NATIVE_SOURCE = 'HealthKitGlucoseObserver.m';

function withHealthKitGlucoseBackground(config) {
  config = withInfoPlist(config, (config) => {
    const modes = new Set(config.modResults.UIBackgroundModes ?? []);
    modes.add('location');
    modes.add('processing');
    config.modResults.UIBackgroundModes = Array.from(modes);

    config.modResults.NSLocationWhenInUseUsageDescription =
      config.modResults.NSLocationWhenInUseUsageDescription ??
      'PRISM logs your location over time to connect glucose spikes with where you were.';
    config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription =
      config.modResults.NSLocationAlwaysAndWhenInUseUsageDescription ??
      'PRISM records location in the background so glucose events can be matched to places even when the app is closed.';
    config.modResults.NSLocationAlwaysUsageDescription =
      config.modResults.NSLocationAlwaysUsageDescription ??
      'PRISM records location in the background so glucose events can be matched to places even when the app is closed.';
    config.modResults.BGTaskSchedulerPermittedIdentifiers = [
      ...(config.modResults.BGTaskSchedulerPermittedIdentifiers ?? []),
      'com.expo.modules.backgroundtask.processing',
    ];
    return config;
  });

  config = withDangerousMod(config, [
    'ios',
    async (config) => {
      const iosRoot = config.modRequest.platformProjectRoot;
      const expoRoot = config.modRequest.projectRoot;
      const projectName = IOSConfig.XcodeUtils.getProjectName(expoRoot);
      const targetDir = path.join(iosRoot, projectName);
      const source = path.join(__dirname, 'native', NATIVE_SOURCE);
      const destination = path.join(targetDir, NATIVE_SOURCE);
      fs.mkdirSync(targetDir, { recursive: true });
      fs.copyFileSync(source, destination);
      return config;
    },
  ]);

  config = withXcodeProject(config, (config) => {
    const project = config.modResults;
    const expoRoot = config.modRequest.projectRoot;
    const projectName = IOSConfig.XcodeUtils.getProjectName(expoRoot);
    const filePath = `${projectName}/${NATIVE_SOURCE}`;
    const groupKey = project.findPBXGroupKey({ name: projectName });
    if (!groupKey) {
      return config;
    }
    if (!project.hasFile(filePath)) {
      project.addSourceFile(filePath, {}, groupKey);
    }
    return config;
  });

  return config;
}

module.exports = withHealthKitGlucoseBackground;
