package com.appzyro.h2oreminder

import android.app.Application
import com.google.android.gms.ads.MobileAds
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class WaterTrackerApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        
        // Initialize Google Mobile Ads SDK asynchronously for fast app startup
        CoroutineScope(Dispatchers.IO).launch {
            MobileAds.initialize(this@WaterTrackerApplication) {
                // Preload initial interstitial & rewarded ads
                AdManager.getInstance(this@WaterTrackerApplication).preloadAds()
            }
        }
    }
}
