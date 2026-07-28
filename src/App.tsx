/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Droplets, 
  Plus, 
  Minus, 
  History, 
  Settings as SettingsIcon, 
  LayoutDashboard, 
  Bell, 
  CheckCircle2,
  Trophy,
  Coffee,
  GlassWater,
  ChevronRight,
  Info,
  Lightbulb,
  X,
  Volume2,
  Share2,
  ChevronLeft,
  Calendar as CalendarIcon,
  Sparkles,
  RefreshCw,
  Quote,
  Camera,
  Upload,
  Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameDay, 
  isToday, 
  startOfWeek, 
  endOfWeek,
  addMonths,
  subMonths
} from 'date-fns';

// --- Types ---

interface WaterLog {
  id: string;
  amount: number;
  timestamp: number;
}

interface UserProfile {
  name: string;
  email: string;
  avatar: string;
}

interface AppSettings {
  dailyGoal: number;
  notificationsEnabled: boolean;
  unit: 'ml' | 'oz';
  reminderMode: 'specific' | 'interval';
  reminderTimes: string[];
  reminderInterval: number;
  reminderSound: string;
}

// --- Constants ---

const STORAGE_KEY_LOGS = 'h2o_logs';
const STORAGE_KEY_SETTINGS = 'h2o_settings';
const STORAGE_KEY_PROFILE = 'h2o_profile';
const APP_VERSION = '1.0.2';
const DEFAULT_GOAL = 2000;
const WATER_DROP_SOUND = 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3';
const SOUND_MAP: Record<string, string> = {
  'Default (Water Drop)': 'https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3',
  'Gentle Wave': 'https://assets.mixkit.co/active_storage/sfx/1113/1113-preview.mp3',
  'Crystal Chime': 'https://assets.mixkit.co/active_storage/sfx/3005/3005-preview.mp3',
  'Morning Birds': 'https://assets.mixkit.co/active_storage/sfx/10/10-preview.mp3',
  'Digital Beep': 'https://assets.mixkit.co/active_storage/sfx/1003/1003-preview.mp3'
};
const PREDEFINED_SOUNDS = [
  'Default (Water Drop)',
  'Gentle Wave',
  'Crystal Chime',
  'Morning Birds',
  'Digital Beep'
];

const WATER_QUOTES = [
  {
    quote: "Drinking 500ml of water right after waking up can boost your metabolism by up to 30%.",
    category: "Metabolism"
  },
  {
    quote: "Your brain is 73% water. Staying hydrated improves concentration, memory, and mood.",
    category: "Brain & Focus"
  },
  {
    quote: "Sufficient water intake keeps your skin hydrated, plump, and glowing gracefully.",
    category: "Skin Care"
  },
  {
    quote: "Sipping water before meals helps you feel satisfied and aids in digestion.",
    category: "Wellness"
  },
  {
    quote: "Water lubricates your joints and muscles, preventing cramps during workouts.",
    category: "Fitness"
  },
  {
    quote: "Even 2% dehydration can lead to fatigue, reduced alertness, and mild headaches.",
    category: "Energy"
  },
  {
    quote: "Water helps your kidneys filter out waste and keep your body's systems clean.",
    category: "Detox"
  },
  {
    quote: "Staying well-hydrated helps regulate your body's core temperature during hot days.",
    category: "Vitality"
  }
];

// --- Utils ---

const mlToOz = (ml: number) => Math.round(ml * 0.33814) / 10;
const ozToMl = (oz: number) => Math.round(oz * 29.5735);

const formatValue = (ml: number, unit: 'ml' | 'oz') => {
  if (unit === 'oz') return mlToOz(ml);
  return ml;
};

// --- Components ---

const CircularProgress = ({ current, goal, unit }: { current: number; goal: number; unit: 'ml' | 'oz' }) => {
  const percentage = Math.min(Math.round((current / goal) * 100), 100);
  const radius = 90;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center w-64 h-64">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="128"
          cy="128"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          className="text-slate-100"
        />
        {/* Progress Circle */}
        <motion.circle
          cx="128"
          cy="128"
          r={radius}
          stroke="currentColor"
          strokeWidth="12"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
          className="text-hydration-blue drop-shadow-[0_0_8px_rgba(0,150,255,0.4)]"
        />
      </svg>
      <div className="absolute flex flex-col items-center justify-center text-center">
        <motion.span 
          key={percentage}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-5xl font-extrabold text-slate-900"
        >
          {percentage}%
        </motion.span>
        <span className="text-sm font-medium text-slate-500 mt-1">
          {formatValue(current, unit)} / {formatValue(goal, unit)} {unit}
        </span>
      </div>
    </div>
  );
};

const QuickAddCard = ({ amount, unit, icon: Icon, onClick }: { amount: number; unit: 'ml' | 'oz'; icon: any; onClick: () => void }) => (
  <button 
    onClick={onClick}
    className="glass-card group relative overflow-hidden rounded-[25px] p-5 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 hover:shadow-md h-32"
  >
    <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-hydration-blue mb-1 group-hover:scale-110 transition-transform">
      <Icon size={24} />
    </div>
    <span className="text-xl font-bold text-slate-800">{formatValue(amount, unit)}</span>
    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{unit}</span>
  </button>
);

interface LogItemProps {
  log: WaterLog;
  unit: 'ml' | 'oz';
}

const LogItem: React.FC<LogItemProps> = ({ log, unit }) => {
  const time = new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  return (
    <div className="flex items-center p-4 rounded-2xl bg-white border border-slate-100 mb-3 shadow-sm">
      <div className="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-hydration-blue mr-4">
        <Droplets size={20} />
      </div>
      <div className="flex-1">
        <p className="text-slate-900 font-bold text-sm">Water Intake</p>
        <p className="text-slate-400 text-xs">{time}</p>
      </div>
      <p className="text-hydration-blue font-extrabold text-sm">+{formatValue(log.amount, unit)} {unit}</p>
    </div>
  );
};

const GoalReachedModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl"
        >
          <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center text-yellow-500 mx-auto mb-6">
            <Trophy size={40} />
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 mb-2">Goal Reached!</h2>
          <p className="text-slate-500 mb-8">
            Fantastic job! You've reached your daily hydration goal. Keep up this healthy habit!
          </p>
          <button 
            onClick={onClose}
            className="w-full h-14 bg-hydration-blue text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
          >
            Awesome!
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const InfoModal = ({ isOpen, title, content, onClose }: { isOpen: boolean; title: string; content: string; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          className="relative bg-white rounded-[32px] p-8 w-full max-w-sm flex flex-col max-h-[80vh] shadow-2xl"
        >
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-extrabold text-slate-900">{title}</h2>
            <button onClick={onClose} className="p-2 rounded-full bg-slate-50 text-slate-400">
              <X size={20} />
            </button>
          </div>
          <div className="flex-1 overflow-y-auto pr-2 text-left text-sm text-slate-600 leading-relaxed space-y-4">
            {content.split('\n\n').map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
          <button 
            onClick={onClose}
            className="w-full h-12 bg-hydration-blue text-white rounded-full font-bold mt-6 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
          >
            Close
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const CustomIntakeModal = ({ 
  isOpen, 
  onClose, 
  unit, 
  onAdd 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  unit: 'ml' | 'oz'; 
  onAdd: (amount: number) => void;
}) => {
  const [val, setVal] = useState<string>('250');

  useEffect(() => {
    if (isOpen) {
      setVal(unit === 'oz' ? '8' : '250');
    }
  }, [isOpen, unit]);

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      const amountInMl = unit === 'oz' ? ozToMl(num) : num;
      onAdd(amountInMl);
      onClose();
    }
  };

  const presets = unit === 'oz' ? [4, 8, 12, 16, 20, 24, 32] : [100, 150, 200, 250, 300, 500, 750, 1000];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div 
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 text-hydration-blue flex items-center justify-center">
                  <Droplets size={22} />
                </div>
                <h2 className="text-xl font-extrabold text-slate-900">Custom Intake</h2>
              </div>
              <button onClick={onClose} className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-center">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Enter Water Amount
                </label>
                <div className="flex items-center justify-center gap-2">
                  <input 
                    type="number"
                    min="1"
                    max="5000"
                    value={val}
                    onChange={(e) => setVal(e.target.value)}
                    className="w-32 h-14 text-3xl font-extrabold text-center text-slate-900 bg-white rounded-2xl border-2 border-blue-100 focus:border-hydration-blue outline-none shadow-sm"
                    autoFocus
                  />
                  <span className="text-lg font-bold text-hydration-blue">{unit}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                  Quick Presets
                </span>
                <div className="flex flex-wrap gap-2">
                  {presets.map(p => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setVal(p.toString())}
                      className={`px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                        val === p.toString()
                          ? 'bg-hydration-blue text-white shadow-md shadow-blue-500/20'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      +{p} {unit}
                    </button>
                  ))}
                </div>
              </div>

              <button 
                type="submit"
                className="w-full h-14 bg-hydration-blue text-white rounded-full font-bold text-lg shadow-lg shadow-blue-500/30 active:scale-95 transition-all flex items-center justify-center gap-2"
              >
                <Plus size={20} />
                Add {val ? `${val} ${unit}` : 'Water'}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};


// --- AdMob UI Components ---

const AdaptiveBannerAd = () => (
  <div className="w-full my-3 p-3 bg-slate-50/80 rounded-2xl border border-slate-200/60 flex items-center justify-between gap-2 shadow-2xs">
    <div className="flex items-center gap-2">
      <span className="bg-amber-100 text-amber-800 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
        Sponsored Ad
      </span>
    </div>
    <span className="text-[10px] font-medium text-slate-400">Google AdMob</span>
  </div>
);

const InterstitialAdModal = ({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) => (
  <AnimatePresence>
    {isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl z-10"
        >
          <div className="flex justify-between items-center mb-4">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Sponsored</span>
            <button onClick={onClose} className="p-1.5 rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
              <X size={18} />
            </button>
          </div>
          <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center text-hydration-blue mx-auto mb-4">
            <Sparkles size={32} />
          </div>
          <h3 className="text-lg font-bold text-slate-900 mb-2">Stay Hydrated Every Day!</h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            Maintain healthy skin, boost energy levels, and optimize your daily focus with smart water reminders.
          </p>
          <button 
            onClick={onClose}
            className="w-full py-3.5 bg-hydration-blue text-white rounded-2xl font-bold text-sm shadow-md active:scale-95 transition-all"
          >
            Close Ad
          </button>
        </motion.div>
      </div>
    )}
  </AnimatePresence>
);

const RewardedAdModal = ({ 
  isOpen, 
  onClose, 
  onReward 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onReward: () => void;
}) => {
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    if (!isOpen) {
      setCountdown(5);
      return;
    }
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/80 backdrop-blur-md"
        />
        <motion.div 
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="relative bg-white rounded-[32px] p-8 w-full max-w-sm text-center shadow-2xl z-10"
        >
          <div className="flex justify-between items-center mb-4">
            <span className="bg-amber-100 text-amber-800 text-[10px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider">Rewarded Video</span>
            <span className="text-xs font-bold text-slate-400">
              {countdown > 0 ? `Reward in ${countdown}s` : "Ad Complete!"}
            </span>
          </div>

          <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center text-amber-500 mx-auto mb-4 border border-amber-200">
            <Trophy size={36} />
          </div>

          <h3 className="text-lg font-bold text-slate-900 mb-1">Unlocking Advanced Analysis</h3>
          <p className="text-xs text-slate-500 mb-6">
            Watch this short sponsored message to unlock your personalized weekly hydration insights.
          </p>

          {countdown > 0 ? (
            <div className="w-full bg-slate-100 rounded-full h-3 mb-6 overflow-hidden">
              <div 
                className="bg-amber-500 h-full transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - countdown) / 5) * 100}%` }}
              />
            </div>
          ) : (
            <button 
              onClick={() => {
                onReward();
                onClose();
              }}
              className="w-full py-4 bg-amber-500 text-white rounded-2xl font-bold text-sm shadow-lg shadow-amber-500/30 active:scale-95 transition-all mb-2"
            >
              Claim Reward & Unlock
            </button>
          )}

          {countdown > 0 && (
            <button 
              onClick={onClose}
              className="text-xs text-slate-400 underline font-medium"
            >
              Cancel
            </button>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

// --- Main App ---

export default function App() {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'history' | 'settings'>('dashboard');
  const [logs, setLogs] = useState<WaterLog[]>([]);
  const [profile, setProfile] = useState<UserProfile>({
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatar: 'https://picsum.photos/seed/user/200'
  });
  const [settings, setSettings] = useState<AppSettings>({
    dailyGoal: DEFAULT_GOAL,
    notificationsEnabled: true,
    unit: 'ml',
    reminderMode: 'specific',
    reminderTimes: ['08:00', '12:00', '18:00'],
    reminderInterval: 60,
    reminderSound: 'Default (Water Drop)'
  });
  const [showGoalModal, setShowGoalModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [reminderBanner, setReminderBanner] = useState<{ title: string; body: string } | null>(null);
  const [hasShownGoalModalToday, setHasShownGoalModalToday] = useState(false);

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert("Please select an image file under 5MB");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          setProfile(p => ({ ...p, avatar: reader.result as string }));
        }
      };
      reader.readAsDataURL(file);
    }
  };
  const [lastFiredMinute, setLastFiredMinute] = useState<string>('');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [quoteIndex, setQuoteIndex] = useState(() => {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 1000 / 60 / 60 / 24);
    return dayOfYear % WATER_QUOTES.length;
  });
  const [latestVersion, setLatestVersion] = useState<string | null>(null);
  const [isUpdateAvailable, setIsUpdateAvailable] = useState(false);

  const [modalContent, setModalContent] = useState<{ title: string; content: string } | null>(null);

  // AdMob State Management
  const [savesCount, setSavesCount] = useState(0);
  const [lastInterstitialTime, setLastInterstitialTime] = useState(0);
  const [showInterstitialAd, setShowInterstitialAd] = useState(false);
  const [showRewardedAdModal, setShowRewardedAdModal] = useState(false);
  const [isRewardedAnalysisUnlocked, setIsRewardedAnalysisUnlocked] = useState(false);
  const [rewardedAdTimer, setRewardedAdTimer] = useState(5);

  const privacyPolicy = `Privacy Policy for H2O Reminder

Last updated: ${new Date().toLocaleDateString()}

At H2O Reminder, we prioritize your privacy. This application is designed to help you track your water intake efficiently.

1. Data Collection: H2O Reminder stores your water intake logs and settings locally on your device. We do not collect, store, or share any personal identification information on our servers.

2. AdMob Integration: We use Google AdMob to display advertisements. AdMob may collect certain information to serve personalized ads. Please refer to Google's Privacy Policy for more details.

3. Third-Party Services: This app may contain links to other sites. If you click on a third-party link, you will be directed to that site.

4. Contact Us: If you have any questions or suggestions about our Privacy Policy, do not hesitate to contact us at shubhamdigital96@gmail.com.

Developed by AppZyro.`;

  const termsOfService = `Terms of Service for H2O Reminder

1. Acceptance of Terms: By using H2O Reminder, you agree to these terms.

2. Use of the App: You agree to use the app only for its intended purpose of tracking hydration.

3. Disclaimer: H2O Reminder is a tool for tracking water intake and should not be used as medical advice. Always consult with a healthcare professional for your specific hydration needs.

4. Limitation of Liability: AppZyro shall not be liable for any damages arising from the use or inability to use the app.

5. Changes to Terms: We reserve the right to modify these terms at any time.

Contact: shubhamdigital96@gmail.com`;

  const playSound = (soundName?: string) => {
    const soundToPlay = soundName || settings.reminderSound;
    const url = SOUND_MAP[soundToPlay] || WATER_DROP_SOUND;
    
    // Note: For true offline support in Capacitor, these should be local assets:
    // const url = `/assets/sounds/${soundToPlay.replace(/\s+/g, '_').toLowerCase()}.mp3`;
    
    const audio = new Audio(url);
    audio.play().catch(e => console.log("Audio play blocked by browser. Click anywhere to enable."));
  };

  const sendNotification = (title: string, body: string) => {
    if (!settings.notificationsEnabled) return;

    // Trigger visual in-app banner alert so reminders work reliably
    setReminderBanner({ title, body });

    if ("Notification" in window) {
      if (Notification.permission === "granted") {
        try {
          new Notification(title, { body, icon: '/favicon.ico' });
        } catch (e) {
          console.log("Browser notification error:", e);
        }
      } else if (Notification.permission !== "denied") {
        Notification.requestPermission().then(permission => {
          if (permission === "granted") {
            try {
              new Notification(title, { body, icon: '/favicon.ico' });
            } catch (e) {
              console.log("Browser notification error:", e);
            }
          }
        });
      }
    }
  };

  // Load data on mount
  useEffect(() => {
    const savedLogs = localStorage.getItem(STORAGE_KEY_LOGS);
    const savedSettings = localStorage.getItem(STORAGE_KEY_SETTINGS);
    const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);

    if (savedLogs) setLogs(JSON.parse(savedLogs));
    if (savedSettings) {
      const parsedSettings = JSON.parse(savedSettings);
      setSettings(parsedSettings);
      
      // On startup: if reminders are enabled but permission not granted, prompt user
      if (parsedSettings.notificationsEnabled && "Notification" in window && Notification.permission !== "granted") {
        Notification.requestPermission().then(permission => {
          if (permission === 'denied') {
            console.warn("Notifications are enabled in settings but blocked by browser.");
          }
        });
      }
    }
    if (savedProfile) setProfile(JSON.parse(savedProfile));

    // Fallback: request permission if it's still default (even if reminders are off, good for future use)
    if ("Notification" in window && Notification.permission === "default") {
      Notification.requestPermission();
    }
  }, []);

  // Save data on change
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_LOGS, JSON.stringify(logs));
  }, [logs]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify(profile));
  }, [profile]);

  const todayLogs = useMemo(() => {
    const startOfDay = new Date().setHours(0, 0, 0, 0);
    return logs.filter(log => log.timestamp >= startOfDay).sort((a, b) => b.timestamp - a.timestamp);
  }, [logs]);

  // Reminder Trigger Logic
  useEffect(() => {
    if (!settings.notificationsEnabled) return;

    const checkReminders = () => {
      const now = new Date();
      const currentMinute = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false });

      // Prevent multiple triggers in the same minute
      if (currentMinute === lastFiredMinute) return;

      if (settings.reminderMode === 'specific') {
        if (settings.reminderTimes.includes(currentMinute)) {
          sendNotification("Time to Drink Water! 💧", "Stay hydrated! Have a glass of water now.");
          playSound();
          setLastFiredMinute(currentMinute);
        }
      } else {
        // Interval logic
        const lastLog = todayLogs[0];
        const lastTime = lastLog ? lastLog.timestamp : new Date().setHours(0, 0, 0, 0);
        const diffMinutes = Math.floor((Date.now() - lastTime) / (1000 * 60));

        if (diffMinutes > 0 && diffMinutes % settings.reminderInterval === 0) {
          sendNotification("Hydration Break! 💧", `It's been ${diffMinutes} minutes since your last drink.`);
          playSound();
          setLastFiredMinute(currentMinute);
        }
      }
    };

    // Check every 10 seconds for better accuracy
    const intervalId = setInterval(checkReminders, 10000);
    return () => clearInterval(intervalId);
  }, [settings.notificationsEnabled, settings.reminderMode, settings.reminderTimes, settings.reminderInterval, todayLogs, lastFiredMinute, settings.reminderSound]);

  const currentIntake = useMemo(() => {
    return todayLogs.reduce((acc, log) => acc + log.amount, 0);
  }, [todayLogs]);

  useEffect(() => {
    if (currentIntake >= settings.dailyGoal && !hasShownGoalModalToday && currentIntake > 0) {
      setShowGoalModal(true);
      setHasShownGoalModalToday(true);
    }
    // Reset modal flag if intake drops below goal (e.g. goal increased)
    if (currentIntake < settings.dailyGoal) {
      setHasShownGoalModalToday(false);
    }
  }, [currentIntake, settings.dailyGoal]);

  const addWater = (amount: number) => {
    const newLog: WaterLog = {
      id: Math.random().toString(36).substring(2, 9),
      amount,
      timestamp: Date.now()
    };
    setLogs(prev => [...prev, newLog]);
    playSound();

    // Check AdMob rule: after every 3 successful reminder saves & min 90s gap
    setSavesCount(prev => {
      const nextCount = prev + 1;
      const now = Date.now();
      if (nextCount > 0 && nextCount % 3 === 0 && (now - lastInterstitialTime >= 90000)) {
        setShowInterstitialAd(true);
        setLastInterstitialTime(now);
      }
      return nextCount;
    });
  };

  const removeLastLog = () => {
    if (todayLogs.length > 0) {
      const lastId = todayLogs[0].id;
      setLogs(prev => prev.filter(log => log.id !== lastId));
    }
  };

  const handleShare = async () => {
    const shareUrl = 'https://appzyro.com/h2o-reminder/';
    const shareText = `I've had ${formatValue(currentIntake, settings.unit)} ${settings.unit} of water today! 💧\nMy goal is ${formatValue(settings.dailyGoal, settings.unit)} ${settings.unit}.\n\nTrack your hydration with H2O Reminder!`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'H2O Reminder Progress',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      // Fallback: Copy to clipboard
      try {
        await navigator.clipboard.writeText(`${shareText}\nDownload here: ${shareUrl}`);
        alert('Progress and app link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleShareApp = async () => {
    const shareUrl = 'https://appzyro.com/h2o-reminder/';
    const shareText = "Stay hydrated and healthy with H2O Reminder! 💧 Track your daily water intake easily.";

    if (navigator.share) {
      try {
        await navigator.share({
          title: 'H2O Reminder App',
          text: shareText,
          url: shareUrl,
        });
      } catch (error) {
        if ((error as Error).name !== 'AbortError') {
          console.error('Error sharing:', error);
        }
      }
    } else {
      try {
        await navigator.clipboard.writeText(`${shareText}\nDownload here: ${shareUrl}`);
        alert('App download link copied to clipboard!');
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const handleCheckForUpdate = async () => {
    try {
      // Simulation of a check
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // For now, we'll say 1.0.1 is the latest
      const fetchedVersion: string = APP_VERSION; 
      setLatestVersion(fetchedVersion);
      
      if (fetchedVersion !== APP_VERSION) {
        setIsUpdateAvailable(true);
        setModalContent({
          title: 'Update Available!',
          content: `A new version (v${fetchedVersion}) is available. Please visit appzyro.com/h2o-reminder/ to get the latest updates.`
        });
      } else {
        alert('You are using the latest version (v' + APP_VERSION + ').');
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
      alert('Could not check for updates at this time.');
    }
  };

  return (
    <div className="flex flex-col h-screen max-w-md mx-auto bg-white overflow-hidden relative shadow-2xl">
      {/* Header */}
      <header className="px-6 pt-12 pb-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center shadow-md border-2 border-blue-100 overflow-hidden p-0.5">
            <img 
              src="/logo.png" 
              alt="H2O Reminder Logo" 
              className="w-full h-full object-cover rounded-full"
              onError={(e) => {
                e.currentTarget.src = "/ic_launcher.png";
              }}
            />
          </div>
          <div>
            <h1 className="text-xl font-extrabold text-slate-900 tracking-tight leading-none">
              H2O
            </h1>
            <p className="text-[10px] font-bold text-hydration-blue uppercase tracking-widest">
              Reminder
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={() => {
              const nextVal = !settings.notificationsEnabled;
              setSettings(s => ({ ...s, notificationsEnabled: nextVal }));
              if (nextVal) {
                sendNotification("Notifications Activated 💧", "Reminders are now active!");
              }
            }}
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-sm active:scale-95 transition-all ${settings.notificationsEnabled ? 'bg-blue-50 text-hydration-blue' : 'bg-slate-50 text-slate-400'}`}
            title="Toggle Reminders"
          >
            <Bell size={18} fill={settings.notificationsEnabled ? "currentColor" : "none"} />
          </button>

          <button
            onClick={() => setShowProfileModal(true)}
            className="w-10 h-10 rounded-full border-2 border-blue-100 shadow-sm overflow-hidden active:scale-95 transition-transform"
            title="Profile & Photo"
          >
            <img 
              src={profile.avatar} 
              alt={profile.name} 
              className="w-full h-full object-cover" 
              referrerPolicy="no-referrer"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
              }}
            />
          </button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          {activeTab === 'dashboard' && (
            <motion.div 
              key="dashboard"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-8"
            >
              {/* Progress Section */}
              <div className="flex flex-col items-center justify-center py-6">
                <CircularProgress current={currentIntake} goal={settings.dailyGoal} unit={settings.unit} />
                <div className="mt-4 text-center flex flex-col items-center gap-3">
                  <p className="text-hydration-blue font-bold bg-blue-50 px-6 py-2 rounded-full text-sm inline-block">
                    {currentIntake >= settings.dailyGoal ? "Goal Reached! 🥳" : "You're doing great!"}
                  </p>
                  <button 
                    onClick={handleShare}
                    className="flex items-center gap-2 text-xs font-bold text-slate-400 hover:text-hydration-blue transition-colors px-4 py-2 rounded-xl border border-slate-100 bg-white shadow-sm active:scale-95"
                  >
                    <Share2 size={14} /> Share Progress
                  </button>
                </div>
              </div>

              {/* Quick Add */}
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-extrabold text-slate-900">Quick Add</h2>
                  <button 
                    onClick={removeLastLog}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                  >
                    <Minus size={14} /> Undo Last
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <QuickAddCard amount={100} unit={settings.unit} icon={Coffee} onClick={() => addWater(100)} />
                  <QuickAddCard amount={250} unit={settings.unit} icon={GlassWater} onClick={() => addWater(250)} />
                  <QuickAddCard amount={500} unit={settings.unit} icon={Droplets} onClick={() => addWater(500)} />
                  <button 
                    onClick={() => setShowCustomModal(true)}
                    className="glass-card group relative overflow-hidden rounded-[25px] p-5 flex flex-col items-center justify-center gap-2 transition-all active:scale-95 border-dashed border-2 border-slate-200 hover:border-hydration-blue bg-transparent h-32"
                  >
                    <div className="w-12 h-12 rounded-full bg-slate-100 group-hover:bg-blue-50 flex items-center justify-center text-slate-400 group-hover:text-hydration-blue transition-colors">
                      <Plus size={24} />
                    </div>
                    <span className="text-lg font-bold text-slate-600 group-hover:text-hydration-blue transition-colors">Custom</span>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Quantity</span>
                  </button>
                </div>
              </div>

              {/* Tip Card */}
              <div className="bg-gradient-to-r from-hydration-blue to-blue-400 rounded-[25px] p-6 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl transform translate-x-10 -translate-y-10"></div>
                <div className="relative z-10 flex gap-4 items-start">
                  <div className="bg-white/20 p-2 rounded-xl backdrop-blur-sm shrink-0">
                    <Lightbulb size={24} />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-1">Hydration Tip</h3>
                    <p className="text-blue-50 text-sm leading-relaxed">
                      Drinking water before meals can help you feel fuller and support digestion.
                    </p>
                  </div>
                </div>
              </div>

              {/* Daily Motivation & Health Fact Card */}
              <div className="bg-slate-50 border border-slate-100 rounded-[25px] p-5 shadow-sm relative overflow-hidden">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-hydration-blue flex items-center justify-center">
                      <Sparkles size={18} />
                    </div>
                    <div>
                      <h3 className="text-sm font-extrabold text-slate-800">Daily Motivation</h3>
                      <span className="text-[10px] font-bold text-hydration-blue uppercase tracking-wider">
                        {WATER_QUOTES[quoteIndex].category}
                      </span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setQuoteIndex((prev) => (prev + 1) % WATER_QUOTES.length)}
                    className="p-2 rounded-xl bg-white border border-slate-100 text-slate-400 hover:text-hydration-blue hover:border-blue-200 active:scale-95 transition-all shadow-sm flex items-center gap-1 text-xs font-semibold"
                    title="Next Quote"
                  >
                    <RefreshCw size={14} />
                    <span>Next</span>
                  </button>
                </div>
                <div className="relative pl-6 pt-1">
                  <Quote size={16} className="absolute left-0 top-0 text-hydration-blue/30 rotate-180" />
                  <p className="text-xs text-slate-600 font-medium leading-relaxed italic">
                    "{WATER_QUOTES[quoteIndex].quote}"
                  </p>
                </div>
              </div>

              <AdaptiveBannerAd />

            </motion.div>
          )}

          {activeTab === 'history' && (
            <motion.div 
              key="history"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-6"
            >
              {/* Monthly Consistency Calendar */}
              <div className="bg-white rounded-[30px] p-6 shadow-sm border border-slate-100">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center text-hydration-blue">
                      <CalendarIcon size={18} />
                    </div>
                    <h3 className="font-extrabold text-slate-900">{format(currentMonth, 'MMMM yyyy')}</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <button 
                      onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button 
                      onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
                      className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 active:scale-95 transition-all"
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-7 gap-2 mb-2">
                  {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <div key={`${day}-${i}`} className="text-center text-[10px] font-extrabold text-slate-300 uppercase">
                      {day}
                    </div>
                  ))}
                </div>

                <div className="grid grid-cols-7 gap-2">
                  {(() => {
                    const monthStart = startOfMonth(currentMonth);
                    const monthEnd = endOfMonth(monthStart);
                    const startDate = startOfWeek(monthStart);
                    const endDate = endOfWeek(monthEnd);
                    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

                    return calendarDays.map((day, i) => {
                      const isCurrentMonth = format(day, 'M') === format(monthStart, 'M');
                      const dayIntake = logs
                        .filter(log => isSameDay(new Date(log.timestamp), day))
                        .reduce((acc, log) => acc + log.amount, 0);
                      
                      const progress = Math.min(dayIntake / settings.dailyGoal, 1);
                      const isGoalMet = progress >= 1;
                      const hasLogs = dayIntake > 0;
                      const isDayToday = isToday(day);

                      return (
                        <div 
                          key={i} 
                          className={`aspect-square rounded-xl flex items-center justify-center text-[11px] font-bold relative transition-all
                            ${!isCurrentMonth ? 'opacity-0 pointer-events-none' : ''}
                            ${isGoalMet ? 'bg-emerald-500 text-white shadow-sm' : 
                              hasLogs ? 'bg-blue-100 text-hydration-blue' : 'bg-slate-50 text-slate-400'}
                            ${isDayToday ? 'ring-2 ring-hydration-blue ring-offset-2' : ''}
                          `}
                        >
                          {format(day, 'd')}
                          {hasLogs && !isGoalMet && (
                            <div 
                              className="absolute bottom-1 left-1 right-1 h-0.5 bg-hydration-blue/30 rounded-full overflow-hidden"
                            >
                              <div 
                                className="h-full bg-hydration-blue" 
                                style={{ width: `${progress * 100}%` }}
                              />
                            </div>
                          )}
                        </div>
                      );
                    });
                  })()}
                </div>
                
                <div className="flex justify-center gap-4 mt-6 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Goal Met</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-300"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Partial</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-200"></div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">No Data</span>
                  </div>
                </div>
              </div>

              {/* Weekly Summary */}
              <div className="bg-[#F0F7FF] rounded-[25px] p-6 shadow-sm border border-blue-100">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold text-slate-900">Weekly Progress</h3>
                  <span className="text-xs font-bold text-hydration-blue">
                    {(() => {
                      const today = new Date();
                      const last7Days = eachDayOfInterval({
                        start: subMonths(today, 0), // Just using today as reference
                        end: today
                      }).slice(-7);
                      const total = logs
                        .filter(log => {
                          const logDate = new Date(log.timestamp);
                          return logDate >= last7Days[0] && logDate <= last7Days[6];
                        })
                        .reduce((acc, log) => acc + log.amount, 0);
                      return `${Math.round(total / 7)} ${settings.unit} avg`;
                    })()}
                  </span>
                </div>
                <div className="flex items-end justify-between h-32 gap-2">
                  {(() => {
                    const today = new Date();
                    const weekDays = [];
                    for (let i = 6; i >= 0; i--) {
                      const d = new Date(today);
                      d.setDate(today.getDate() - i);
                      weekDays.push(d);
                    }

                    return weekDays.map((day, i) => {
                      const dayIntake = logs
                        .filter(log => isSameDay(new Date(log.timestamp), day))
                        .reduce((acc, log) => acc + log.amount, 0);
                      const h = Math.min((dayIntake / settings.dailyGoal) * 100, 100);

                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-2">
                          <div 
                            className="w-full bg-white/50 rounded-t-lg relative overflow-hidden" 
                            style={{ height: '100%' }}
                          >
                            <motion.div 
                              initial={{ height: 0 }}
                              animate={{ height: `${h}%` }}
                              className={`absolute bottom-0 left-0 right-0 rounded-t-lg ${h >= 100 ? 'bg-emerald-500' : 'bg-hydration-blue'}`}
                            />
                          </div>
                          <span className={`text-[10px] font-bold ${isToday(day) ? 'text-hydration-blue' : 'text-slate-400'}`}>
                            {format(day, 'EEE').charAt(0)}
                          </span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Logs */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-extrabold text-slate-900">Today's Logs</h3>
                  <span className="text-xs font-bold text-slate-400 bg-slate-100 px-3 py-1 rounded-full">
                    Total: {currentIntake}ml
                  </span>
                </div>
                {todayLogs.length > 0 ? (
                  todayLogs.map(log => <LogItem key={log.id} log={log} unit={settings.unit} />)
                ) : (
                  <div className="text-center py-12 bg-white rounded-[25px] border border-dashed border-slate-200">
                    <Droplets className="mx-auto text-slate-200 mb-2" size={48} />
                    <p className="text-slate-400 font-medium">No logs yet today</p>
                  </div>
                )}
              </div>

              <AdaptiveBannerAd />
            </motion.div>
          )}

          {activeTab === 'settings' && (
            <motion.div 
              key="settings"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex flex-col gap-6"
            >
              {/* Profile Card */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="w-24 h-24 rounded-full border-4 border-hydration-blue/10 p-1">
                  <img 
                    src={profile.avatar} 
                    alt="Profile" 
                    className="w-full h-full rounded-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div className="text-center">
                  <h3 className="text-xl font-extrabold text-slate-900">{profile.name}</h3>
                  <p className="text-sm font-medium text-slate-400">{profile.email}</p>
                </div>
                <button 
                  onClick={() => setShowProfileModal(true)}
                  className="px-6 py-2 bg-blue-50 text-hydration-blue rounded-full text-sm font-bold active:scale-95 transition-transform"
                >
                  Edit Profile
                </button>
              </div>

              {/* Preferences */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Preferences</h3>
                <div className="bg-[#F0F7FF] rounded-[25px] overflow-hidden border border-blue-100 shadow-sm">
                  {/* Reminders Toggle */}
                  <div className="flex items-center justify-between p-4 border-b border-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Bell size={20} />
                      </div>
                      <div>
                        <span className="font-bold text-slate-700 block">Drink Water Reminders</span>
                        {settings.notificationsEnabled && (
                          <button
                            type="button"
                            onClick={() => {
                              playSound();
                              sendNotification("Test Reminder 💧", "It's time to drink water!");
                            }}
                            className="text-[11px] font-bold text-hydration-blue hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <Bell size={12} /> Test Reminder
                          </button>
                        )}
                      </div>
                    </div>
                    <button 
                      onClick={() => {
                        const newValue = !settings.notificationsEnabled;
                        setSettings(s => ({ ...s, notificationsEnabled: newValue }));
                        if (newValue) {
                          if ("Notification" in window && Notification.permission !== "granted") {
                            Notification.requestPermission();
                          }
                          sendNotification("Reminders Enabled! 💧", "We'll remind you to stay hydrated.");
                          playSound();
                        }
                      }}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.notificationsEnabled ? 'bg-hydration-blue' : 'bg-slate-200'}`}
                    >
                      <motion.div 
                        animate={{ x: settings.notificationsEnabled ? 26 : 2 }}
                        className="absolute top-1 left-0 w-4 h-4 bg-white rounded-full shadow-sm"
                      />
                    </button>
                  </div>

                  {/* Daily Goal */}
                  <div className="flex items-center justify-between p-4 border-b border-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Droplets size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Daily Goal</span>
                    </div>
                    <div className="flex items-center gap-4">
                      <button 
                        onClick={() => {
                          const step = settings.unit === 'oz' ? ozToMl(4) : 100;
                          setSettings(s => ({ ...s, dailyGoal: Math.max(step, s.dailyGoal - step) }));
                        }}
                        className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"
                      >
                        <Minus size={16} />
                      </button>
                      <span className="font-extrabold text-slate-900 min-w-[80px] text-center">
                        {formatValue(settings.dailyGoal, settings.unit)} {settings.unit}
                      </span>
                      <button 
                        onClick={() => {
                          const step = settings.unit === 'oz' ? ozToMl(4) : 100;
                          setSettings(s => ({ ...s, dailyGoal: s.dailyGoal + step }));
                        }}
                        className="w-8 h-8 rounded-lg bg-hydration-blue text-white flex items-center justify-center shadow-md shadow-blue-500/20"
                      >
                        <Plus size={16} />
                      </button>
                    </div>
                  </div>

                  {/* Units */}
                  <div className="flex items-center justify-between p-4 border-b border-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Info size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Units</span>
                    </div>
                    <div className="flex items-center gap-1 bg-white/50 p-1 rounded-xl border border-blue-50">
                      <button 
                        onClick={() => setSettings(s => ({ ...s, unit: 'ml' }))}
                        className={`px-4 py-1 text-xs font-bold rounded-lg transition-all ${settings.unit === 'ml' ? 'bg-white text-hydration-blue shadow-sm' : 'text-slate-400'}`}
                      >
                        ml
                      </button>
                      <button 
                        onClick={() => setSettings(s => ({ ...s, unit: 'oz' }))}
                        className={`px-4 py-1 text-xs font-bold rounded-lg transition-all ${settings.unit === 'oz' ? 'bg-white text-hydration-blue shadow-sm' : 'text-slate-400'}`}
                      >
                        oz
                      </button>
                    </div>
                  </div>

                  {/* Reminder Settings */}
                  <div className="p-4">
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                          <Bell size={20} />
                        </div>
                        <span className="font-bold text-slate-700">Reminder Schedule</span>
                      </div>
                      <div className="flex bg-white/50 p-1 rounded-xl border border-blue-50">
                        <button 
                          onClick={() => setSettings(s => ({ ...s, reminderMode: 'specific' }))}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${settings.reminderMode === 'specific' ? 'bg-white text-hydration-blue shadow-sm' : 'text-slate-400'}`}
                        >
                          Specific
                        </button>
                        <button 
                          onClick={() => setSettings(s => ({ ...s, reminderMode: 'interval' }))}
                          className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${settings.reminderMode === 'interval' ? 'bg-white text-hydration-blue shadow-sm' : 'text-slate-400'}`}
                        >
                          Interval
                        </button>
                      </div>
                    </div>

                    {settings.reminderMode === 'specific' ? (
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-xs font-bold text-slate-400">Scheduled Times</span>
                          <button 
                            onClick={() => {
                              const newTime = prompt("Enter time (HH:MM):", "09:00");
                              if (newTime && /^([01]\d|2[0-3]):([0-5]\d)$/.test(newTime)) {
                                setSettings(s => ({
                                  ...s,
                                  reminderTimes: [...s.reminderTimes, newTime].sort()
                                }));
                              }
                            }}
                            className="w-6 h-6 rounded-lg bg-hydration-blue text-white flex items-center justify-center shadow-sm"
                          >
                            <Plus size={14} />
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {settings.reminderTimes.map((time, idx) => (
                            <div 
                              key={idx}
                              className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-xl border border-blue-50 shadow-sm"
                            >
                              <span className="text-sm font-bold text-slate-700">{time}</span>
                              <button 
                                onClick={() => {
                                  setSettings(s => ({
                                    ...s,
                                    reminderTimes: s.reminderTimes.filter((_, i) => i !== idx)
                                  }));
                                }}
                                className="text-slate-300 hover:text-red-500 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                          {settings.reminderTimes.length === 0 && (
                            <p className="text-xs text-slate-400 italic">No reminders scheduled</p>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between bg-white/50 p-3 rounded-xl border border-blue-50">
                        <span className="text-sm font-bold text-slate-700">Remind me every</span>
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => setSettings(s => ({ ...s, reminderInterval: Math.max(15, s.reminderInterval - 15) }))}
                            className="w-8 h-8 rounded-lg bg-white flex items-center justify-center text-slate-400 shadow-sm"
                          >
                            <Minus size={16} />
                          </button>
                          <span className="font-extrabold text-slate-900 min-w-[80px] text-center">
                            {settings.reminderInterval >= 60 
                              ? `${Math.floor(settings.reminderInterval / 60)}h ${settings.reminderInterval % 60}m`
                              : `${settings.reminderInterval}m`
                            }
                          </span>
                          <button 
                            onClick={() => setSettings(s => ({ ...s, reminderInterval: s.reminderInterval + 15 }))}
                            className="w-8 h-8 rounded-lg bg-hydration-blue text-white flex items-center justify-center shadow-sm"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Reminder Sound */}
                  <div className="p-4 border-t border-blue-50">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Volume2 size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Reminder Sound</span>
                    </div>
                    <div className="grid grid-cols-1 gap-2">
                      {PREDEFINED_SOUNDS.map(sound => (
                        <button
                          key={sound}
                          onClick={() => {
                            setSettings(s => ({ ...s, reminderSound: sound }));
                            playSound(sound);
                          }}
                          className={`flex items-center justify-between p-3 rounded-xl border transition-all ${
                            settings.reminderSound === sound 
                              ? 'bg-white border-hydration-blue text-hydration-blue shadow-sm' 
                              : 'bg-white/30 border-transparent text-slate-500'
                          }`}
                        >
                          <span className="text-sm font-bold">{sound}</span>
                          {settings.reminderSound === sound && <CheckCircle2 size={16} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Support */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Spread the Word</h3>
                <div className="bg-[#F0F7FF] rounded-[25px] overflow-hidden border border-blue-100 shadow-sm">
                  <button 
                    onClick={handleShareApp}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Share2 size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Share App with Friends</span>
                    </div>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                </div>
              </div>

              {/* Support & Legal */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">App Info</h3>
                <div className="bg-[#F0F7FF] rounded-[25px] overflow-hidden border border-blue-100 shadow-sm">
                  <div className="flex items-center justify-between p-4 border-b border-blue-50">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Info size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Version</span>
                    </div>
                    <span className="text-sm font-bold text-slate-400">v{APP_VERSION}</span>
                  </div>
                  <button 
                    onClick={handleCheckForUpdate}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-white flex items-center justify-center text-hydration-blue shadow-sm">
                        <Bell size={20} />
                      </div>
                      <span className="font-bold text-slate-700">Check for Updates</span>
                    </div>
                    {isUpdateAvailable ? (
                      <span className="bg-red-500 text-white text-[10px] px-2 py-1 rounded-full font-bold animate-pulse">NEW</span>
                    ) : (
                      <ChevronRight size={16} className="text-slate-300" />
                    )}
                  </button>
                </div>
              </div>

              {/* Support & Legal */}
              <div className="flex flex-col gap-4">
                <h3 className="text-sm font-extrabold text-slate-400 uppercase tracking-widest px-2">Support & Legal</h3>
                <div className="bg-[#F0F7FF] rounded-[25px] overflow-hidden border border-blue-100 shadow-sm">
                  <button 
                    onClick={() => setModalContent({ title: 'Help & Support', content: 'For any assistance or feedback, please email us at shubhamdigital96@gmail.com. We are here to help you stay hydrated!' })}
                    className="w-full flex items-center justify-between p-4 border-b border-blue-50"
                  >
                    <span className="font-bold text-slate-700">Help & Support</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                  <button 
                    onClick={() => setModalContent({ title: 'Privacy Policy', content: privacyPolicy })}
                    className="w-full flex items-center justify-between p-4 border-b border-blue-50"
                  >
                    <span className="font-bold text-slate-700">Privacy Policy</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                  <button 
                    onClick={() => setModalContent({ title: 'Terms of Service', content: termsOfService })}
                    className="w-full flex items-center justify-between p-4"
                  >
                    <span className="font-bold text-slate-700">Terms of Service</span>
                    <ChevronRight size={16} className="text-slate-300" />
                  </button>
                </div>
              </div>

              <AdaptiveBannerAd />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Branding */}
      <footer className="fixed bottom-24 left-0 right-0 text-center pointer-events-none z-30">
        <p className="text-[10px] font-bold text-slate-300 uppercase tracking-[0.3em]">
          Developed by AppZyro
        </p>
      </footer>

      {/* Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto bg-white/90 backdrop-blur-xl border-t border-slate-100 px-8 py-4 flex items-center justify-between z-40">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'dashboard' ? 'text-hydration-blue' : 'text-slate-300'}`}
        >
          <LayoutDashboard size={24} />
          <span className="text-[10px] font-bold">Dashboard</span>
        </button>
        <button 
          onClick={() => setActiveTab('history')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'history' ? 'text-hydration-blue' : 'text-slate-300'}`}
        >
          <History size={24} />
          <span className="text-[10px] font-bold">History</span>
        </button>
        <button 
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center gap-1 transition-colors ${activeTab === 'settings' ? 'text-hydration-blue' : 'text-slate-300'}`}
        >
          <SettingsIcon size={24} />
          <span className="text-[10px] font-bold">Settings</span>
        </button>
      </nav>

      {/* Modals & Overlays */}
      <AnimatePresence>
        {reminderBanner && (
          <motion.div 
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -100, opacity: 0 }}
            className="fixed top-4 left-4 right-4 z-50 max-w-md mx-auto bg-slate-900/95 text-white p-4 rounded-2xl shadow-xl backdrop-blur-md border border-slate-700 flex items-center justify-between gap-3"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-hydration-blue text-white flex items-center justify-center font-bold flex-shrink-0">
                <Droplets size={22} />
              </div>
              <div className="min-w-0">
                <h4 className="font-bold text-sm text-white truncate">{reminderBanner.title}</h4>
                <p className="text-xs text-slate-300 truncate">{reminderBanner.body}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button 
                onClick={() => {
                  addWater(settings.unit === 'oz' ? ozToMl(8) : 250);
                  setReminderBanner(null);
                }}
                className="px-3 py-1.5 bg-hydration-blue hover:bg-blue-600 text-white font-bold text-xs rounded-xl shadow-xs active:scale-95 transition-all"
              >
                +Drink
              </button>
              <button 
                onClick={() => setReminderBanner(null)}
                className="p-1 text-slate-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Custom Intake Modal */}
      <CustomIntakeModal 
        isOpen={showCustomModal} 
        onClose={() => setShowCustomModal(false)} 
        unit={settings.unit} 
        onAdd={(amount) => addWater(amount)} 
      />

      {/* Profile Edit Modal */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowProfileModal(false)}
              className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative bg-white rounded-[32px] p-6 w-full max-w-sm shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-extrabold text-slate-900">Edit Profile</h2>
                <button 
                  onClick={() => setShowProfileModal(false)}
                  className="p-2 rounded-full bg-slate-100 text-slate-400 hover:text-slate-600"
                >
                  <X size={18} />
                </button>
              </div>

              {/* Profile Photo Upload Section */}
              <div className="flex flex-col items-center mb-6">
                <div className="relative group w-24 h-24 rounded-full border-4 border-hydration-blue/20 shadow-md overflow-hidden bg-slate-50 mb-3">
                  <img 
                    src={profile.avatar} 
                    alt="Profile Avatar" 
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80";
                    }}
                  />
                  <label 
                    htmlFor="profile-photo-upload" 
                    className="absolute inset-0 bg-black/40 flex flex-col items-center justify-center text-white opacity-90 hover:opacity-100 cursor-pointer transition-opacity"
                  >
                    <Camera size={22} />
                    <span className="text-[9px] font-bold mt-1">Change</span>
                  </label>
                  <input 
                    id="profile-photo-upload" 
                    type="file" 
                    accept="image/*" 
                    className="hidden" 
                    onChange={handleAvatarUpload} 
                  />
                </div>

                <label 
                  htmlFor="profile-photo-upload"
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-blue-50 text-hydration-blue text-xs font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                >
                  <Upload size={14} />
                  <span>Upload Photo</span>
                </label>

                {/* Avatar Presets */}
                <div className="mt-4 w-full text-center">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                    Or choose avatar:
                  </span>
                  <div className="flex justify-center gap-2">
                    {[
                      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80",
                      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&auto=format&fit=crop&q=80",
                      "https://img.icons8.com/color/192/water-bottle.png"
                    ].map((url, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setProfile(p => ({ ...p, avatar: url }))}
                        className={`w-10 h-10 rounded-full overflow-hidden border-2 transition-all ${
                          profile.avatar === url ? 'border-hydration-blue scale-110 shadow-sm' : 'border-slate-200'
                        }`}
                      >
                        <img src={url} alt={`Avatar ${idx}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Name</label>
                  <input 
                    type="text" 
                    value={profile.name}
                    onChange={(e) => setProfile(p => ({ ...p, name: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 focus:border-hydration-blue outline-none font-bold text-slate-700"
                    placeholder="Enter your name"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1 block">Email</label>
                  <input 
                    type="email" 
                    value={profile.email}
                    onChange={(e) => setProfile(p => ({ ...p, email: e.target.value }))}
                    className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-100 focus:border-hydration-blue outline-none font-bold text-slate-700"
                    placeholder="Enter email address"
                  />
                </div>
              </div>
              <button 
                onClick={() => setShowProfileModal(false)}
                className="w-full h-14 bg-hydration-blue text-white rounded-full font-bold text-lg mt-6 shadow-lg shadow-blue-500/30 active:scale-95 transition-all"
              >
                Save Changes
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <GoalReachedModal isOpen={showGoalModal} onClose={() => setShowGoalModal(false)} />
      <InfoModal 
        isOpen={!!modalContent} 
        title={modalContent?.title || ''} 
        content={modalContent?.content || ''} 
        onClose={() => setModalContent(null)} 
      />
      <InterstitialAdModal 
        isOpen={showInterstitialAd} 
        onClose={() => setShowInterstitialAd(false)} 
      />
      <RewardedAdModal 
        isOpen={showRewardedAdModal} 
        onClose={() => setShowRewardedAdModal(false)} 
        onReward={() => setIsRewardedAnalysisUnlocked(true)} 
      />
    </div>
  );
}
