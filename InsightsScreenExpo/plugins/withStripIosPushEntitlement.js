/**
 * Removes `aps-environment` from the iOS entitlements plist after other config plugins
 * (notably expo-notifications) add it. That avoids Xcode errors when the provisioning
 * profile does not include the Push Notifications capability.
 *
 * Remote push / device push tokens will not work until you enable Push on the App ID
 * and remove this plugin (or stop stripping the entitlement). Local scheduled
 * notifications from expo-notifications generally still work without APS.
 */
const { withEntitlementsPlist } = require('expo/config-plugins');

function withStripIosPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
}

module.exports = withStripIosPushEntitlement;
