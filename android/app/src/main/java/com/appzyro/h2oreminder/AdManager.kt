package com.appzyro.h2oreminder

import android.app.Activity
import android.content.Context
import android.view.View
import android.view.ViewGroup
import android.widget.FrameLayout
import com.google.android.gms.ads.*
import com.google.android.gms.ads.interstitial.InterstitialAd
import com.google.android.gms.ads.interstitial.InterstitialAdLoadCallback
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback

class AdManager private constructor(private val context: Context) {

    companion object {
        const val BANNER_AD_UNIT_ID = "ca-app-pub-1831617002289210/5267815684"
        const val INTERSTITIAL_AD_UNIT_ID = "ca-app-pub-1831617002289210/2115038732"
        const val REWARDED_AD_UNIT_ID = "ca-app-pub-1831617002289210/4362882415"

        private const val MIN_INTERSTITIAL_INTERVAL_MS = 90_000L // 90 seconds minimum gap

        @Volatile
        private var instance: AdManager? = null

        fun getInstance(context: Context): AdManager {
            return instance ?: synchronized(this) {
                instance ?: AdManager(context.applicationContext).also { instance = it }
            }
        }
    }

    private var interstitialAd: InterstitialAd? = null
    private var rewardedAd: RewardedAd? = null

    private var reminderSavesCount = 0
    private var lastInterstitialShownTime = 0L
    private var isFirstLaunch = true

    fun preloadAds() {
        loadInterstitialAd()
        loadRewardedAd()
    }

    /**
     * Load Adaptive Banner Ad into container (Home bottom or Settings bottom)
     */
    fun loadBannerAd(activity: Activity, container: FrameLayout) {
        val adView = AdView(activity)
        adView.setAdSize(getAdSize(activity))
        adView.adUnitId = BANNER_AD_UNIT_ID

        adView.adListener = object : AdListener() {
            override fun onAdLoaded() {
                container.removeAllViews()
                container.addView(adView)
                container.visibility = View.VISIBLE
            }

            override fun onAdFailedToLoad(error: LoadAdError) {
                container.visibility = View.GONE
            }
        }

        val adRequest = AdRequest.Builder().build()
        adView.loadAd(adRequest)
    }

    private fun getAdSize(activity: Activity): AdSize {
        val displayMetrics = activity.resources.displayMetrics
        val adWidthPx = displayMetrics.widthPixels.toFloat()
        val density = displayMetrics.density
        val adWidth = (adWidthPx / density).toInt()
        return AdSize.getCurrentOrientationAnchoredAdaptiveBannerAdSize(activity, adWidth)
    }

    /**
     * Call after every successful reminder save
     */
    fun onReminderSaved(activity: Activity) {
        // First launch guard
        if (isFirstLaunch) {
            isFirstLaunch = false
            return
        }

        reminderSavesCount++

        val currentTime = System.currentTimeMillis()
        val timeSinceLastAd = currentTime - lastInterstitialShownTime

        // Rule: Show interstitial after every 3 successful saves AND min 90 seconds gap
        if (reminderSavesCount > 0 && reminderSavesCount % 3 == 0 && timeSinceLastAd >= MIN_INTERSTITIAL_INTERVAL_MS) {
            showInterstitialAd(activity)
        }
    }

    private fun loadInterstitialAd() {
        val adRequest = AdRequest.Builder().build()
        InterstitialAd.load(
            context,
            INTERSTITIAL_AD_UNIT_ID,
            adRequest,
            object : InterstitialAdLoadCallback() {
                override fun onAdLoaded(ad: InterstitialAd) {
                    interstitialAd = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    interstitialAd = null
                }
            }
        )
    }

    private fun showInterstitialAd(activity: Activity) {
        if (interstitialAd != null) {
            interstitialAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedContent() {
                    interstitialAd = null
                    lastInterstitialShownTime = System.currentTimeMillis()
                    loadInterstitialAd() // Preload next interstitial
                }

                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    interstitialAd = null
                    loadInterstitialAd()
                }
            }
            interstitialAd?.show(activity)
        } else {
            loadInterstitialAd()
        }
    }

    /**
     * Rewarded Ad for unlocking Advanced Weekly Analysis in Statistics
     */
    fun loadRewardedAd() {
        val adRequest = AdRequest.Builder().build()
        RewardedAd.load(
            context,
            REWARDED_AD_UNIT_ID,
            adRequest,
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    rewardedAd = ad
                }

                override fun onAdFailedToLoad(error: LoadAdError) {
                    rewardedAd = null
                }
            }
        )
    }

    fun showRewardedAd(activity: Activity, onRewardGranted: () -> Unit) {
        if (rewardedAd != null) {
            rewardedAd?.fullScreenContentCallback = object : FullScreenContentCallback() {
                override fun onAdDismissedContent() {
                    rewardedAd = null
                    loadRewardedAd() // Preload next
                }

                override fun onAdFailedToShowFullScreenContent(error: AdError) {
                    rewardedAd = null
                    loadRewardedAd()
                }
            }

            rewardedAd?.show(activity) { _ ->
                // Reward only after ad finishes successfully
                onRewardGranted()
            }
        } else {
            // Retry loading
            loadRewardedAd()
        }
    }
}
