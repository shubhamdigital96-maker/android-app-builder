package com.appzyro.h2oreminder

import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Toast
import androidx.fragment.app.Fragment
import com.appzyro.h2oreminder.databinding.FragmentStatisticsBinding

class StatisticsFragment : Fragment() {

    private var _binding: FragmentStatisticsBinding? = null
    private val binding get() = _binding!!

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View {
        _binding = FragmentStatisticsBinding.inflate(inflater, container, false)
        return binding.root
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        binding.btnWatchRewardedAd.setOnClickListener {
            activity?.let { act ->
                AdManager.getInstance(requireContext()).showRewardedAd(act) {
                    // Reward callback executed ONLY after ad is finished
                    binding.panelAdvancedAnalysis.visibility = View.VISIBLE
                    binding.btnWatchRewardedAd.visibility = View.GONE
                    Toast.makeText(
                        requireContext(),
                        "🎉 Advanced Weekly Analysis Unlocked!",
                        Toast.LENGTH_LONG
                    ).show()
                }
            }
        }
    }

    override fun onDestroyView() {
        super.onDestroyView()
        _binding = null
    }
}
