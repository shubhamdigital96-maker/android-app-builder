package com.appzyro.h2oreminder

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.appzyro.h2oreminder.databinding.FragmentHomeBinding

class HomeFragment : Fragment() {

    private var _binding: FragmentHomeBinding? = null
    private val binding get() = _binding!!

    private var currentWaterMl = 1250
    private val goalWaterMl = 2000

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentHomeBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        updateProgressUI()

        binding.btnAddWater.setOnClickListener {
            currentWaterMl += 250
            updateProgressUI()
            Toast.makeText(requireContext(), "Water intake saved! +250ml", Toast.LENGTH_SHORT).show()

            // Trigger AdManager rule (check 3-save rule & 90s gap for interstitial)
            activity?.let { act ->
                AdManager.getInstance(requireContext()).onReminderSaved(act)
            }
        }

        // Load Adaptive Banner Ad at bottom of Home Screen
        activity?.let { act ->
            AdManager.getInstance(requireContext()).loadBannerAd(act, binding.bannerAdContainerHome)
        }
    }

    private fun updateProgressUI() {
        binding.tvProgress.text = "$currentWaterMl / $goalWaterMl ml"
        binding.pbHydration.max = goalWaterMl
        binding.pbHydration.progress = currentWaterMl.coerceAtMost(goalWaterMl)
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
