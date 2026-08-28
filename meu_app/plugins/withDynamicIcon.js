/**
 * Expo Config Plugin: withDynamicIcon
 *
 * This plugin modifies the native AndroidManifest.xml to add activity-alias entries
 * for each disguise icon. This is REQUIRED for the Android system to support
 * programmatic icon changes at runtime (what react-native-change-icon does).
 *
 * Icon names MUST match what react-native-change-icon.changeIcon('name') sends.
 */

const { withAndroidManifest } = require('@expo/config-plugins');
const { getMainActivity } = require('@expo/config-plugins/build/android/Manifest');

// --- ICON CONFIGURATION ---
// Each entry here creates one activity-alias in the manifest.
// 'name': The key used in your JS code when calling changeIcon('name')
// 'icon': The mipmap resource name for the launcher icon PNG you placed in android/app/src/main/res/
const ICONS = [
  { name: 'default',          icon: 'ic_launcher_default' },
  { name: 'calculator',       icon: 'ic_launcher_calculator' },
  { name: 'weather',          icon: 'ic_launcher_weather' },
  { name: 'browser_generic',  icon: 'ic_launcher_browser' },
  { name: 'safari',           icon: 'ic_launcher_safari' },
  { name: 'browser_search',   icon: 'ic_launcher_buscador' },
];

const withDynamicIcon = (config) => {
  return withAndroidManifest(config, async (config) => {
    const manifest = config.modResults;
    const application = manifest.manifest.application[0];
    
    // Get the package name
    const packageName = config.android?.package ?? 'com.ksafe.vault';

    // Step 1: Remove LAUNCHER intent from the main <activity> so we control it via aliases
    const mainActivity = application.activity?.find(
      (a) => a.$['android:name'] === '.MainActivity'
    );
    if (mainActivity && mainActivity['intent-filter']) {
      mainActivity['intent-filter'] = mainActivity['intent-filter'].filter(
        (filter) => {
          const categories = filter.category ?? [];
          return !categories.some(
            (c) => c.$['android:name'] === 'android.intent.category.LAUNCHER'
          );
        }
      );
    }

    // Step 2: Remove any previously-added aliases (to avoid duplicates on re-build)
    if (application['activity-alias']) {
      application['activity-alias'] = application['activity-alias'].filter(
        (alias) => !alias.$['android:name']?.startsWith(`.MainActivityIcon_`)
      );
    } else {
      application['activity-alias'] = [];
    }

    // Step 3: Add one activity-alias per icon
    for (const { name, icon } of ICONS) {
      const isDefault = name === 'default';
      application['activity-alias'].push({
        $: {
          'android:name': `.MainActivityIcon_${name}`,
          'android:enabled': isDefault ? 'true' : 'false',  // only default is enabled initially
          'android:exported': 'true',
          'android:icon': `@mipmap/${icon}`,
          'android:targetActivity': '.MainActivity',
          'android:roundIcon': `@mipmap/${icon}`,
        },
        'intent-filter': [
          {
            action: [{ $: { 'android:name': 'android.intent.action.MAIN' } }],
            category: [{ $: { 'android:name': 'android.intent.category.LAUNCHER' } }],
          },
        ],
      });
    }

    return config;
  });
};

module.exports = withDynamicIcon;
