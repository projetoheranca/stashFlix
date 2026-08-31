import { InterstitialAd, RewardedAd, TestIds, AdEventType, RewardedAdEventType, AdsConsent, AdsConsentStatus } from 'react-native-google-mobile-ads';
import * as SecureStore from '@/src/services/SecureStoreManager';
import { Alert } from 'react-native';

// Use Test IDs in development to avoid getting banned by Google AdMob!
// Replace these with your actual production Ad Unit IDs from the AdMob dashboard before publishing.
const INTERSTITIAL_AD_UNIT_ID = __DEV__
  ? TestIds.INTERSTITIAL
  : 'ca-app-pub-2265796955368754/5450205558';

const REWARDED_AD_UNIT_ID = __DEV__
  ? TestIds.REWARDED
  : 'ca-app-pub-2265796955368754/7191601983';

// Instances
let interstitial = InterstitialAd.createForAdRequest(INTERSTITIAL_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

let rewarded = RewardedAd.createForAdRequest(REWARDED_AD_UNIT_ID, {
  requestNonPersonalizedAdsOnly: true,
});

/**
 * Initializes and preloads ads if the user is on the FREE plan.
 */
export const initializeAds = async () => {
  const userPlan = await SecureStore.getItemAsync('user_plan');
  if (userPlan === 'PRO') return; // Do not load ads for PRO users

  try {
    // 1. Request GDPR Consent info from Google
    const consentInfo = await AdsConsent.requestInfoUpdate();
    
    // 2. If user is in Europe (REQUIRED) and form is available, show it
    if (
      consentInfo.isConsentFormAvailable &&
      consentInfo.status === AdsConsentStatus.REQUIRED
    ) {
      await AdsConsent.showForm();
    }
  } catch (error) {
    console.error("GDPR Consent error:", error);
  }

  // Preload Interstitial
  interstitial.load();
  
  // Preload Rewarded
  rewarded.load();
};

let lastInterstitialTime = 0;
const INTERSTITIAL_COOLDOWN_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Shows an Interstitial Ad (Full screen ad that can be closed).
 * Typically shown between screen transitions or after completing an action.
 */
export const showInterstitialAd = async (onClose?: () => void) => {
  const userPlan = await SecureStore.getItemAsync('user_plan');
  if (userPlan === 'PRO') {
    if (onClose) onClose();
    return;
  }

  // Prevent spamming ads (cooldown limit)
  const now = Date.now();
  if (now - lastInterstitialTime < INTERSTITIAL_COOLDOWN_MS) {
    if (onClose) onClose();
    return;
  }

  try {
    if (interstitial.loaded) {
      const unsubscribe = interstitial.addAdEventListener(AdEventType.CLOSED, () => {
        interstitial.load(); // Preload next ad
        unsubscribe();
        if (onClose) onClose();
      });
      lastInterstitialTime = Date.now();
      interstitial.show();
    } else {
      // If ad failed to load, proceed normally so we don't block the user
      interstitial.load();
      if (onClose) onClose();
    }
  } catch (error) {
    if (onClose) onClose();
  }
};

/**
 * Shows a Rewarded Ad (User must watch the video to get a reward).
 * e.g., "Watch an ad to unlock a temporary premium feature"
 */
export const showRewardedAd = async (onReward: () => void, onClose?: () => void) => {
  const userPlan = await SecureStore.getItemAsync('user_plan');
  if (userPlan === 'PRO') {
    onReward();
    if (onClose) onClose();
    return;
  }

  try {
    if (rewarded.loaded) {
      const unsubscribeEarned = rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, reward => {
        onReward();
      });
      const unsubscribeClosed = rewarded.addAdEventListener(AdEventType.CLOSED, () => {
        rewarded.load(); // Preload next ad
        unsubscribeEarned();
        unsubscribeClosed();
        if (onClose) onClose();
      });
      rewarded.show();
    } else {
      rewarded.load();
      Alert.alert("Aviso", "O anúncio ainda não carregou ou você está sem internet. Aguarde alguns segundos e tente novamente.");
      if (onClose) onClose();
    }
  } catch (error) {
    if (onClose) onClose();
  }
};
