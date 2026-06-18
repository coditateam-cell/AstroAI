'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import CosmicTransitSlider from './transit/CosmicTransitSlider'

interface PlanetData {
  sign: string
  degree: number
  house: number
  is_retrograde: boolean
}

interface WhoYouAre {
  public_mask: string
  private_reality: string
}

interface InnerMatrix {
  who_you_are: WhoYouAre
  never_say_out_loud: string[]
}

interface RecurringPattern {
  pattern: string
  action_item: string
}

interface LifeLoops {
  unfair_superpowers: string[]
  honest_critiques: string[]
  recurring_pattern: RecurringPattern
}

interface CurrentWeather {
  why_you_feel_this_way: string
  immediate_action_item: string
}

interface Timeframes {
  past: string
  present: string
  future: string
}

interface CategoryInsights {
  inner_matrix: InnerMatrix
  life_loops: LifeLoops
  current_weather: CurrentWeather
}

interface TransitData {
  planet: string
  cycle_name: string
  description: string
}

interface HustleTab {
  your_natural_style: string
  the_biggest_block: string
  how_to_fix_it: string
  past_transit?: TransitData
  current_transit?: TransitData
  future_transit?: TransitData
}

interface MoneyTab {
  your_financial_mindset: string
  the_money_trap: string
  cash_advice: string
  past_transit?: TransitData
  current_transit?: TransitData
  future_transit?: TransitData
}

interface GrowthTab {
  public_mask: string
  private_reality: string
  mental_reset: string
  past_transit?: TransitData
  current_transit?: TransitData
  future_transit?: TransitData
}

interface LoveTab {
  what_you_actually_crave: string
  the_romantic_fear: string
  heart_advice: string
  past_transit?: TransitData
  current_transit?: TransitData
  future_transit?: TransitData
}

interface DetailedReport {
  age?: number | null
  timeframes?: Timeframes | null
  hustle?: CategoryInsights
  love?: CategoryInsights
  growth?: CategoryInsights
  money?: CategoryInsights
  hustle_tab?: HustleTab
  money_tab?: MoneyTab
  growth_tab?: GrowthTab
  love_tab?: LoveTab
  // Support older profiles
  personal?: any
  career?: any
  love_old?: any
}

interface ParsedAstrologyInsights {
  age: number | null
  timeframes: Timeframes | null
  hustle: CategoryInsights
  love: CategoryInsights
  growth: CategoryInsights
  money: CategoryInsights
}


interface ChartPreviewProps {
  chart: {
    chart_id?: string
    full_name: string
    raw_astrology_data: {
      planets: Record<string, PlanetData>
      houses: Record<string, { sign: string; degree: number }>
      angles: Record<string, { sign: string; degree: number }>
    }
    detailed_report?: any
  }
  onStartSession: () => void
}

const PLANET_GLYPHS: Record<string, string> = {
  sun: '☉', moon: '☽', mars: '♂', mercury: '☿', jupiter: '♃',
  venus: '♀', saturn: '♄', uranus: '⛢', neptune: '♆', pluto: '♇',
}

const PLANET_LABELS: Record<string, string> = {
  sun: 'Sun', moon: 'Moon', mars: 'Mars', mercury: 'Mercury',
  jupiter: 'Jupiter', venus: 'Venus', saturn: 'Saturn',
  uranus: 'Uranus', neptune: 'Neptune', pluto: 'Pluto',
}

const CATEGORY_TABS = [
  { id: 'hustle', label: '💼 Professional & Hustle' },
  { id: 'love', label: '❤️ Love & Connections' },
  { id: 'growth', label: '🌱 Inner Growth & Self' },
  { id: 'money', label: '🪙 Money & Risk' },
] as const

const TAB_IDENTITY_CARDS: Record<string, Array<{
  symbol: string
  tagline: string
  word: string
  gradient: string
  glow: string
  borderColor: string
}>> = {
  hustle: [
    {
      symbol: '⚡',
      tagline: 'Your soul work',
      word: 'Entrepreneur',
      gradient: 'linear-gradient(160deg, rgba(251,191,36,0.13) 0%, rgba(245,158,11,0.05) 100%)',
      glow: 'rgba(251,191,36,0.28)',
      borderColor: 'rgba(251,191,36,0.22)',
    },
    {
      symbol: '🎯',
      tagline: 'Your work style',
      word: 'Architect',
      gradient: 'linear-gradient(160deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.03) 100%)',
      glow: 'rgba(251,191,36,0.22)',
      borderColor: 'rgba(251,191,36,0.15)',
    },
    {
      symbol: '🔥',
      tagline: 'Your drive',
      word: 'Builder',
      gradient: 'linear-gradient(160deg, rgba(251,191,36,0.08) 0%, rgba(245,158,11,0.03) 100%)',
      glow: 'rgba(251,191,36,0.22)',
      borderColor: 'rgba(251,191,36,0.15)',
    },
  ],
  money: [
    {
      symbol: '💎',
      tagline: 'Your money type',
      word: 'Investor',
      gradient: 'linear-gradient(160deg, rgba(52,211,153,0.13) 0%, rgba(16,185,129,0.05) 100%)',
      glow: 'rgba(52,211,153,0.28)',
      borderColor: 'rgba(52,211,153,0.22)',
    },
    {
      symbol: '🏦',
      tagline: 'Your wealth style',
      word: 'Accumulator',
      gradient: 'linear-gradient(160deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.03) 100%)',
      glow: 'rgba(52,211,153,0.22)',
      borderColor: 'rgba(52,211,153,0.15)',
    },
    {
      symbol: '📈',
      tagline: 'Your risk profile',
      word: 'Strategist',
      gradient: 'linear-gradient(160deg, rgba(52,211,153,0.08) 0%, rgba(16,185,129,0.03) 100%)',
      glow: 'rgba(52,211,153,0.22)',
      borderColor: 'rgba(52,211,153,0.15)',
    },
  ],
  growth: [
    {
      symbol: '🌙',
      tagline: 'Your inner nature',
      word: 'Observer',
      gradient: 'linear-gradient(160deg, rgba(139,92,246,0.15) 0%, rgba(109,40,217,0.06) 100%)',
      glow: 'rgba(139,92,246,0.32)',
      borderColor: 'rgba(139,92,246,0.22)',
    },
    {
      symbol: '🧠',
      tagline: 'Your mind type',
      word: 'Analyst',
      gradient: 'linear-gradient(160deg, rgba(139,92,246,0.09) 0%, rgba(109,40,217,0.04) 100%)',
      glow: 'rgba(139,92,246,0.22)',
      borderColor: 'rgba(139,92,246,0.16)',
    },
    {
      symbol: '🎭',
      tagline: 'Your shadow self',
      word: 'Perfectionist',
      gradient: 'linear-gradient(160deg, rgba(139,92,246,0.09) 0%, rgba(109,40,217,0.04) 100%)',
      glow: 'rgba(139,92,246,0.22)',
      borderColor: 'rgba(139,92,246,0.16)',
    },
  ],
  love: [
    {
      symbol: '✦',
      tagline: 'Your love style',
      word: 'Soulseeker',
      gradient: 'linear-gradient(160deg, rgba(244,114,182,0.13) 0%, rgba(236,72,153,0.05) 100%)',
      glow: 'rgba(244,114,182,0.28)',
      borderColor: 'rgba(244,114,182,0.22)',
    },
    {
      symbol: '🌊',
      tagline: 'Your depth',
      word: 'Intense',
      gradient: 'linear-gradient(160deg, rgba(244,114,182,0.08) 0%, rgba(236,72,153,0.03) 100%)',
      glow: 'rgba(244,114,182,0.22)',
      borderColor: 'rgba(244,114,182,0.15)',
    },
    {
      symbol: '🔐',
      tagline: 'Your attachment',
      word: 'Selective',
      gradient: 'linear-gradient(160deg, rgba(244,114,182,0.08) 0%, rgba(236,72,153,0.03) 100%)',
      glow: 'rgba(244,114,182,0.22)',
      borderColor: 'rgba(244,114,182,0.15)',
    },
  ],
}

export default function ChartPreview({ chart, onStartSession }: ChartPreviewProps) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'hustle' | 'love' | 'growth' | 'money'>('hustle')
  const [activeAccordion, setActiveAccordion] = useState<number | null>(null)
  const { planets, angles } = chart.raw_astrology_data
  const detailedReport = chart.detailed_report

  const ascendant = angles?.ascendant?.sign ?? '—'
  const sunSign = planets?.sun?.sign ?? '—'
  const moonSign = planets?.moon?.sign ?? '—'

  const otherPlanets = Object.entries(planets).filter(
    ([key]) => key !== 'sun' && key !== 'moon'
  )

  // Safe helper to support backward compatibility
  const getInsights = (): ParsedAstrologyInsights | null => {
    if (!detailedReport) return null;
    
    // Check if it has the flat 4-tab structure
    const isNew = 'hustle_tab' in detailedReport || 'money_tab' in detailedReport || 'growth_tab' in detailedReport || 'love_tab' in detailedReport;
    if (isNew) {
      const dummyCat: CategoryInsights = {
        inner_matrix: { who_you_are: { public_mask: '', private_reality: '' }, never_say_out_loud: [] },
        life_loops: { unfair_superpowers: [], honest_critiques: [], recurring_pattern: { pattern: '', action_item: '' } },
        current_weather: { why_you_feel_this_way: '', immediate_action_item: '' }
      };
      return {
        age: detailedReport.age ?? null,
        timeframes: detailedReport.timeframes ?? null,
        hustle: dummyCat,
        love: dummyCat,
        growth: dummyCat,
        money: dummyCat
      };
    }

    // Check if it already has the new structure
    if ('hustle' in detailedReport && 'love' in detailedReport && 'growth' in detailedReport && 'money' in detailedReport) {
      return {
        age: detailedReport.age ?? null,
        timeframes: detailedReport.timeframes ?? null,
        hustle: detailedReport.hustle!,
        love: detailedReport.love!,
        growth: detailedReport.growth!,
        money: detailedReport.money!
      };
    }
    
    // Fallback: If it has the old single-category format (inner_matrix, life_loops, current_weather) directly on detailed_report
    const old = detailedReport as any;
    const fallbackCategory: CategoryInsights = {
      inner_matrix: old.inner_matrix || {
        who_you_are: {
          public_mask: "You presentation is solid and put-together.",
          private_reality: "Underneath, you are observing everything and keeping details."
        },
        never_say_out_loud: [
          "You secretly feel that you have to perform competency to keep everyone happy.",
          "You keep a running mental ledger of who has let you down, silently moving them away.",
          "You get stuck in a loop of waiting for the perfect moment before you act."
        ]
      },
      life_loops: old.life_loops || {
        unfair_superpowers: [
          "You read room energy instantly, knowing exactly what people need to hear.",
          "Your precision is effortless; you spot the single logical gap others spend hours on.",
          "You can reverse-engineer complex workflows in your head to find the shortest path."
        ],
        honest_critiques: [
          "Holding onto work that is 90% done because you're terrified it's not perfect.",
          "Playing the quiet stabilizer for everyone else's emotional chaos while redlining.",
          "Overthinking a single text message or comment for hours, finding hidden meaning."
        ],
        recurring_pattern: {
          pattern: "When you feel overwhelmed, you quietly pull back and stop communicating, expecting others to notice your absence.",
          action_item: "Reach out and send one direct, unpolished update to a collaborator or friend today."
        }
      },
      current_weather: old.current_weather || {
        why_you_feel_this_way: "You are balancing the urge to sprint forward into new projects with the safe comfort of daily routines.",
        immediate_action_item: "Stop checking your notifications for the first hour of your workday and finish one task."
      }
    };

    // Synthesize the 4 categories from old career/love/personal fields if available
    const getCategoryFromOld = (field: 'career' | 'love' | 'personal' | 'money'): CategoryInsights => {
      const source = old[field] || (field === 'money' ? old.career : old[field]);
      if (!source) return { ...fallbackCategory };

      const presentText = source.present?.blueprint || '';
      const vibe = source.present?.current_vibe || '';
      
      let publicMask = "You show a confident, steady face to the world.";
      let privateReality = "Inside, you process a lot of subtle detail and pressure.";
      let nsol = [...fallbackCategory.inner_matrix.never_say_out_loud];
      let superpowers = [...fallbackCategory.life_loops.unfair_superpowers];
      let critiques = [...fallbackCategory.life_loops.honest_critiques];
      let pattern = fallbackCategory.life_loops.recurring_pattern.pattern;
      let actionItem = fallbackCategory.life_loops.recurring_pattern.action_item;
      let weatherText = presentText || fallbackCategory.current_weather.why_you_feel_this_way;
      let weatherAction = vibe || fallbackCategory.current_weather.immediate_action_item;

      if (field === 'career') {
        publicMask = "You look like a focused builder who can architect any system and ship clean code.";
        privateReality = "Underneath, you struggle with launch anxiety, overthinking every edge case and delaying releases.";
        nsol = [
          "You secretly worry that your architecture drive is just a shield to avoid launching.",
          "You get paralyzed by the gap between the beautiful system in your head and the messy code required.",
          "You silently judge other people's messy workflows while ignoring your own procrastination loops."
        ];
        superpowers = [
          "Your precision is absolute; you spot subtle structural flaws in software architectures.",
          "You can reverse-engineer complex systems and outline database schemas in your head.",
          "You effortlessly automate tedious, manual tasks."
        ];
        critiques = [
          "Refusing to release an MVP because you want to build a perfect scaleable database for three users.",
          "Getting stuck in research loops comparing frameworks instead of writing business logic.",
          "Refusing to delegate code reviews because you don't trust anyone else's standards."
        ];
        pattern = "You build massive architectures in private, get hit with launch anxiety, and rebuild to avoid putting it in front of users.";
        actionItem = "Deploy one unstyled, bare-minimum page to a public link today instead of refactoring it.";
      } else if (field === 'love') {
        publicMask = "You look completely independent, secure, and selective, like you don't need anyone.";
        privateReality = "You secretly fall into the fixer trap, over-extending to save emotionally unavailable people.";
        nsol = [
          "You select partners who need fixing because it ensures they won't have the emotional bandwidth to challenge you.",
          "You find normal, stable, healthy connection boring because you are addicted to the cycle of emotional rescue.",
          "You keep a mental bag packed at all times, ready to run the moment someone asks you to drop your guard."
        ];
        superpowers = [
          "You notice the micro-shifts in someone's voice or body language before they realize it.",
          "You can hold safe, grounded space for people during their worst emotional storms.",
          "You have incredibly high standards that protect you from wasting time on low-effort connections."
        ];
        critiques = [
          "Draining your own emotional battery to solve problems for partners who haven't asked for help.",
          "Instantly freezing or shutting down communication when someone gets too close.",
          "Using your selective standards as a shield to disqualify great people before they can get close."
        ];
        pattern = "You attract someone who needs saving, fix their loops, and then panic and pull away the moment they ask you for vulnerability.";
        actionItem = "Pause before offering advice to a partner or friend today; just listen.";
      } else if (field === 'personal') {
        publicMask = "You look like the steady, wise, and highly observant advisor who always has the perfect perspective.";
        privateReality = "Inside, you are running a constant self-criticism loop, grading yourself on every interaction.";
        nsol = [
          "You use quiet observation as a shield to watch the room without ever sharing your own raw thoughts.",
          "You hold onto old emotional vibes like static, taking hours to clear your head.",
          "You secretly fear that if you stop criticizing yourself, you will lose your drive."
        ];
        superpowers = [
          "You read room energy instantly, knowing exactly when a conversation needs to pivot.",
          "You catch the tiny psychological defense loops in others that they completely miss.",
          "You have a deep internal compass that keeps you grounded even when the outside world gets chaotic."
        ];
        critiques = [
          "Replaying a minor conversation in your head twenty times, looking for errors.",
          "Absorbing the bad energy of a workspace or room and carrying it home with you for days.",
          "Expecting yourself to be perfectly calm and logical at all times, denying the right to have a bad day."
        ];
        pattern = "You absorb outside stress, turn it inward into a harsh criticism loop, and isolate yourself until you feel 'perfect'.";
        actionItem = "Spend ten minutes in quiet isolation today to consciously let go of any room vibes.";
      } else if (field === 'money') {
        publicMask = "You look like someone with premium taste who values high-quality things and top-tier standards.";
        privateReality = "Underneath, you suffer from financial security paralysis, which blocks you from risking capital.";
        nsol = [
          "You use your high standards for premium quality as an excuse to avoid investing money in your own ideas.",
          "You are terrified that if you spend your safety savings, you will run out of resources.",
          "You would rather buy high-end items for status safety than invest that same capital into your dreams."
        ];
        superpowers = [
          "You instantly recognize premium quality and value, knowing exactly where to put resources.",
          "You can design high-end, beautiful user experiences that make simple ideas feel like luxury products.",
          "You have a strong survival drive that ensures you never run out of money."
        ];
        critiques = [
          "Paralyzing yourself with fear over minor business costs, stopping your own MVP before it can launch.",
          "Accumulating safety funds endlessly while refusing to invest any of it back into your growth.",
          "Buying expensive tools or courses as a substitute for actually starting the hard work of building."
        ];
        pattern = "You dream of launching your own startup, but when it comes to spending money on domain names or APIs, you freeze up.";
        actionItem = "Spend a small, intentional amount of money today to put skin in the game for your MVP.";
      }

      return {
        inner_matrix: {
          who_you_are: {
            public_mask: publicMask,
            private_reality: privateReality
          },
          never_say_out_loud: nsol
        },
        life_loops: {
          unfair_superpowers: superpowers,
          honest_critiques: critiques,
          recurring_pattern: {
            pattern,
            action_item: actionItem
          }
        },
        current_weather: {
          why_you_feel_this_way: weatherText,
          immediate_action_item: weatherAction
        }
      };
    };

    return {
      age: old.age || null,
      timeframes: old.timeframes || null,
      hustle: getCategoryFromOld('career'),
      love: getCategoryFromOld('love'),
      growth: getCategoryFromOld('personal'),
      money: getCategoryFromOld('money')
    };
  };

  const insights = getInsights() as ParsedAstrologyInsights | null;
  const currentInsights = insights ? insights[activeTab] : null;

  const isNewStructure = !!detailedReport && ('hustle_tab' in detailedReport || 'money_tab' in detailedReport || 'growth_tab' in detailedReport || 'love_tab' in detailedReport);

  // Static fallback transits — shown when stored report predates transit support
  const STATIC_TRANSITS: Record<string, Array<{ label: string; data: TransitData }>> = {
    hustle: [
      { label: 'PAST CYCLE',      data: { planet: 'Saturn', cycle_name: 'Saturn Restructuring Your Drive',    description: 'Over the last couple of years Saturn pushed you to take your work more seriously and build lasting structures. The pressure felt heavy, but it forced you to figure out what actually matters versus what you were just doing out of habit.' } },
      { label: 'CURRENT WEATHER', data: { planet: 'Jupiter', cycle_name: 'Jupiter Opening a Growth Window',   description: "Right now there's a genuine window of growth opening up in how you approach your ambitions. Things you've been quietly working on are ready to get bigger — the conditions are more supportive than they've felt in a while." } },
      { label: 'COMING MOVEMENT', data: { planet: 'Mars',    cycle_name: 'Mars Sharpening Your Momentum',     description: "In the next few months your energy and drive are going to feel sharper and more focused. A Mars shift is coming that will clear the fog and make it easier to push forward on things you've been sitting on." } },
    ],
    money: [
      { label: 'PAST CYCLE',      data: { planet: 'Venus',   cycle_name: 'Venus Retrograde Lessons',            description: 'The past cycle brought up a lot of questions about what you actually value versus what you thought you were supposed to want. That unsettled feeling around money? It was asking you to recalibrate your real priorities.' } },
      { label: 'CURRENT WEATHER', data: { planet: 'Mercury', cycle_name: 'Mercury in Your Money House',         description: 'Your mind is sharper than usual right now when it comes to financial decisions. This is a good week to review where your money is actually going and make one clear, conscious choice about how that changes.' } },
      { label: 'COMING MOVEMENT', data: { planet: 'Jupiter', cycle_name: 'Jupiter Moving into Your Wealth Zone', description: "A major expansion cycle is heading your way. Jupiter's shift will open up new opportunities to grow your resources — but only if you've laid the groundwork by getting honest about your money habits now." } },
    ],
    growth: [
      { label: 'PAST CYCLE',      data: { planet: 'Pluto',   cycle_name: "Pluto's Long Transformation",         description: 'The last few years quietly dismantled old parts of how you see yourself. The slow, deep work has been pulling up the roots of beliefs and patterns you inherited rather than chose — that process is mostly done.' } },
      { label: 'CURRENT WEATHER', data: { planet: 'Saturn',  cycle_name: 'Saturn Testing Your Foundation',      description: "Right now Saturn is asking you to take your inner life as seriously as your outer responsibilities. The heavy feeling you may be carrying is Saturn doing its job — it's pointing at exactly where your next real growth is." } },
      { label: 'COMING MOVEMENT', data: { planet: 'Uranus',  cycle_name: 'Uranus Bringing a Breakthrough',      description: 'Something unexpected but liberating is coming your way in the next few months. Uranus is set to shake up a part of your life that has felt too rigid — the disruption will feel strange at first, but it clears space for something much more you.' } },
    ],
    love: [
      { label: 'PAST CYCLE',      data: { planet: 'Venus',   cycle_name: 'Venus Retrograde in Your Heart Zone', description: 'The past cycle stirred up old relationship patterns — familiar emotional loops played out in new people. That was giving you a chance to finally see the pattern clearly and decide if you want to keep repeating it.' } },
      { label: 'CURRENT WEATHER', data: { planet: 'Mars',    cycle_name: 'Mars Activating Desire',              description: "Right now your emotional intensity is running high and your desire for real connection is stronger than usual. It's an especially honest time to notice what you actually want versus what you're settling for." } },
      { label: 'COMING MOVEMENT', data: { planet: 'Jupiter', cycle_name: 'Jupiter Opening the Heart',           description: "A genuinely optimistic shift is coming for your love life in the next few months. Jupiter's expansion will make it easier to attract the kind of connection you actually want — but you have to be willing to be seen first." } },
    ],
  };

  const getNewTabInsights = () => {
    if (!detailedReport) return null;
    if (activeTab === 'hustle') {
      const tab: HustleTab = detailedReport.hustle_tab || {};
      const rawTransits = [
        { label: 'PAST CYCLE',      data: tab.past_transit },
        { label: 'CURRENT WEATHER', data: tab.current_transit },
        { label: 'COMING MOVEMENT', data: tab.future_transit },
      ];
      const transits = rawTransits.every(t => !t.data) ? STATIC_TRANSITS.hustle : rawTransits;
      return {
        title1: "Your Natural Style",
        text1: tab.your_natural_style || '',
        title2: "The Biggest Block",
        text2: tab.the_biggest_block || '',
        title3: "How to Fix It",
        text3: tab.how_to_fix_it || '',
        icon1: "⚡",
        transits,
      };
    } else if (activeTab === 'money') {
      const tab: MoneyTab = detailedReport.money_tab || {};
      const rawTransits = [
        { label: 'PAST CYCLE',      data: tab.past_transit },
        { label: 'CURRENT WEATHER', data: tab.current_transit },
        { label: 'COMING MOVEMENT', data: tab.future_transit },
      ];
      const transits = rawTransits.every(t => !t.data) ? STATIC_TRANSITS.money : rawTransits;
      return {
        title1: "Your Financial Mindset",
        text1: tab.your_financial_mindset || '',
        title2: "The Money Trap",
        text2: tab.the_money_trap || '',
        title3: "Cash Advice",
        text3: tab.cash_advice || '',
        icon1: "🪙",
        transits,
      };
    } else if (activeTab === 'growth') {
      const tab: GrowthTab = detailedReport.growth_tab || {};
      const rawTransits = [
        { label: 'PAST CYCLE',      data: tab.past_transit },
        { label: 'CURRENT WEATHER', data: tab.current_transit },
        { label: 'COMING MOVEMENT', data: tab.future_transit },
      ];
      const transits = rawTransits.every(t => !t.data) ? STATIC_TRANSITS.growth : rawTransits;
      return {
        title1: "Public Mask",
        text1: tab.public_mask || '',
        title2: "Private Reality",
        text2: tab.private_reality || '',
        title3: "Mental Reset",
        text3: tab.mental_reset || '',
        icon1: "🌱",
        transits,
      };
    } else if (activeTab === 'love') {
      const tab: LoveTab = detailedReport.love_tab || {};
      const rawTransits = [
        { label: 'PAST CYCLE',      data: tab.past_transit },
        { label: 'CURRENT WEATHER', data: tab.current_transit },
        { label: 'COMING MOVEMENT', data: tab.future_transit },
      ];
      const transits = rawTransits.every(t => !t.data) ? STATIC_TRANSITS.love : rawTransits;
      return {
        title1: "What You Actually Crave",
        text1: tab.what_you_actually_crave || '',
        title2: "The Romantic Fear",
        text2: tab.the_romantic_fear || '',
        title3: "Heart Advice",
        text3: tab.heart_advice || '',
        icon1: "❤️",
        transits,
      };
    }
    return null;
  };

  const newTabInsights = getNewTabInsights();


  return (
    <div style={{ 
      background: 'var(--bg-card)', 
      border: '0.5px solid var(--border)', 
      borderRadius: 24, 
      padding: '40px',
      display: 'flex',
      flexWrap: 'wrap',
      gap: 40,
      backdropFilter: 'blur(16px)',
      width: '100%',
      minHeight: 'calc(100vh - 150px)',
    }}>
      {/* Left Column: Technical details & Action button */}
      <div style={{ flex: '1 1 350px', display: 'flex', flexDirection: 'column', gap: 24 }}>
        <div style={{ textAlign: 'center', marginBottom: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>🔮</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 18, color: 'var(--purple-light)', fontStyle: 'italic' }}>
            Your Birth Chart is ready
          </h2>
        </div>

        {/* Core signs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
          {[
            { label: 'Ascendant', value: ascendant, glyph: '↑' },
            { label: 'Sun sign', value: sunSign, glyph: '☉' },
            { label: 'Moon sign', value: moonSign, glyph: '☽' },
          ].map(item => (
            <div key={item.label} style={{
              background: 'rgba(200,184,248,0.06)', border: '0.5px solid var(--border)',
              borderRadius: 12, padding: '12px 10px', textAlign: 'center'
            }}>
              <div style={{ fontSize: 20, marginBottom: 4 }}>{item.glyph}</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>{item.value}</div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Planetary Positions */}
        <div>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 10 }}>
            Planetary Positions
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {otherPlanets.map(([key, data]) => {
              const glyph = PLANET_GLYPHS[key] ?? '🪐'
              const label = PLANET_LABELS[key] ?? key.charAt(0).toUpperCase() + key.slice(1)
              const retro = data.is_retrograde ? ' ℞' : ''
              return (
                <div key={key} style={{
                  background: 'rgba(200,184,248,0.04)', border: '0.5px solid var(--border)',
                  borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 8
                }}>
                  <div style={{ fontSize: 16, color: 'var(--purple-light)' }}>{glyph}</div>
                  <div>
                    <div style={{ fontSize: 9, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                      {label}{retro}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 500 }}>
                      {data.sign} {Math.floor(data.degree)}°
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>
          <button
            onClick={onStartSession}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, border: 'none',
              background: 'linear-gradient(135deg, #6b4fd8, #9b59f5)',
              color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              boxShadow: '0 4px 16px rgba(107, 79, 216, 0.3)', transition: 'all 0.2s'
            }}
          >
            🎙 Begin voice session with Celeste AI
          </button>
          
          <button
            onClick={() => {
              const chartId = chart.chart_id || localStorage.getItem('jyotishai_chart_id')
              if (chartId) {
                router.push(`/chat?chart_id=${chartId}`)
              }
            }}
            style={{
              width: '100%', padding: '14px 0', borderRadius: 12, 
              background: 'rgba(138, 99, 245, 0.08)', border: '1px solid rgba(138, 99, 245, 0.3)',
              color: '#c8b8f8', fontSize: 14, fontWeight: 600, cursor: 'pointer',
              fontFamily: "'DM Sans', sans-serif", display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              transition: 'all 0.2s'
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(138, 99, 245, 0.16)'
              e.currentTarget.style.borderColor = 'rgba(138, 99, 245, 0.5)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'rgba(138, 99, 245, 0.08)'
              e.currentTarget.style.borderColor = 'rgba(138, 99, 245, 0.3)'
            }}
          >
            💬 Talk on chat with Celeste AI
          </button>
        </div>
      </div>

      {/* Right Column: Detailed Reading insights */}
      {insights && currentInsights && (
        <div style={{ flex: '1.6 1 480px', display: 'flex', flexDirection: 'column' }}>
          <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: 12 }}>
            Celeste's Reading
          </div>
          
          {/* Tabs header */}
          <div style={{ 
            display: 'flex', 
            gap: 6, 
            background: 'rgba(255, 255, 255, 0.02)', 
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: 12, 
            padding: 4, 
            marginBottom: 16,
            flexWrap: 'wrap'
          }}>
            {CATEGORY_TABS.map(tab => {
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    setActiveAccordion(null)
                  }}
                  style={{
                    flex: '1 1 120px',
                    padding: '10px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'rgba(138, 99, 245, 0.15)' : 'transparent',
                    color: isActive ? '#c8b8f8' : 'var(--text-muted)',
                    cursor: 'pointer',
                    fontSize: 12,
                    fontWeight: 600,
                    transition: 'all 0.2s',
                    outline: 'none',
                    textAlign: 'center'
                  }}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          {/* Tab Content */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                style={{ display: 'flex', flexDirection: 'column', gap: 24 }}
              >
                {isNewStructure && newTabInsights ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

                    {/* ── IDENTITY CARDS ROW (3 per tab) ── */}
                    {(() => {
                      const staticCards = TAB_IDENTITY_CARDS[activeTab] ?? [];
                      const tabData = detailedReport?.[`${activeTab}_tab`] || {};
                      const dynamicCards = tabData.identity_cards || [];
                      
                      const cards = staticCards.map((staticCard, idx) => {
                        const dynamicCard = dynamicCards[idx] || {};
                        return {
                          ...staticCard,
                          symbol: dynamicCard.symbol || staticCard.symbol,
                          tagline: dynamicCard.tagline || staticCard.tagline,
                          word: dynamicCard.word || staticCard.word,
                        };
                      });

                      return (
                        <>
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            gap: 12,
                          }}>
                            {cards.map((card, idx) => (
                              <motion.div
                                key={`${activeTab}-card-${idx}`}
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                style={{
                                  background: card.gradient,
                                  border: `1px solid ${card.borderColor}`,
                                  borderRadius: 18,
                                  padding: '22px 16px 18px',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  alignItems: 'center',
                                  textAlign: 'center',
                                  position: 'relative',
                                  overflow: 'hidden',
                                  cursor: 'default',
                                  animation: idx === 0 ? `pulse-glow-${activeTab} 3s ease-in-out infinite` : 'none',
                                  boxShadow: idx === 0
                                    ? `0 4px 24px ${card.glow}`
                                    : `0 2px 12px ${card.glow}`,
                                }}
                              >
                                {/* Symbol orb */}
                                <motion.div
                                  animate={{ y: [0, -4, 0] }}
                                  transition={{ duration: 3.5 + idx * 0.5, repeat: Infinity, ease: 'easeInOut' }}
                                  style={{
                                    width: idx === 0 ? 60 : 48,
                                    height: idx === 0 ? 60 : 48,
                                    borderRadius: '50%',
                                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.18), rgba(255,255,255,0.03))`,
                                    border: `1px solid ${card.borderColor}`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: idx === 0 ? 26 : 20,
                                    marginBottom: 14,
                                    boxShadow: `0 0 20px ${card.glow}`,
                                    backdropFilter: 'blur(6px)',
                                    flexShrink: 0,
                                  }}
                                >
                                  {card.symbol}
                                </motion.div>

                                {/* Tagline */}
                                <p style={{
                                  fontSize: 9,
                                  fontWeight: 600,
                                  letterSpacing: '0.12em',
                                  textTransform: 'uppercase',
                                  color: 'rgba(255,255,255,0.4)',
                                  margin: '0 0 6px 0',
                                }}>
                                  {card.tagline}
                                </p>

                                {/* Identity word */}
                                <h3 style={{
                                  fontSize: idx === 0 ? 20 : 16,
                                  fontWeight: 700,
                                  letterSpacing: '-0.01em',
                                  fontFamily: "'Playfair Display', serif",
                                  background: 'linear-gradient(135deg, #fff 0%, rgba(255,255,255,0.6) 100%)',
                                  WebkitBackgroundClip: 'text',
                                  WebkitTextFillColor: 'transparent',
                                  margin: 0,
                                }}>
                                  {card.word}
                                </h3>

                                {/* Bottom glow blob */}
                                <div style={{
                                  position: 'absolute',
                                  bottom: -16,
                                  left: '50%',
                                  transform: 'translateX(-50%)',
                                  width: 80,
                                  height: 30,
                                  background: card.glow,
                                  filter: 'blur(20px)',
                                  borderRadius: '50%',
                                  pointerEvents: 'none',
                                }} />
                              </motion.div>
                            ))}
                          </div>

                          {/* Pulse-glow keyframes per tab accent */}
                          <style>{`
                            @keyframes pulse-glow-hustle {
                              0%, 100% { box-shadow: 0 4px 24px rgba(251,191,36,0.28); }
                              50%       { box-shadow: 0 4px 36px rgba(251,191,36,0.5), 0 0 60px rgba(251,191,36,0.18); }
                            }
                            @keyframes pulse-glow-money {
                              0%, 100% { box-shadow: 0 4px 24px rgba(52,211,153,0.28); }
                              50%       { box-shadow: 0 4px 36px rgba(52,211,153,0.5), 0 0 60px rgba(52,211,153,0.18); }
                            }
                            @keyframes pulse-glow-growth {
                              0%, 100% { box-shadow: 0 4px 24px rgba(139,92,246,0.32); }
                              50%       { box-shadow: 0 4px 36px rgba(139,92,246,0.55), 0 0 60px rgba(139,92,246,0.2); }
                            }
                            @keyframes pulse-glow-love {
                              0%, 100% { box-shadow: 0 4px 24px rgba(244,114,182,0.28); }
                              50%       { box-shadow: 0 4px 36px rgba(244,114,182,0.5), 0 0 60px rgba(244,114,182,0.18); }
                            }
                          `}</style>
                        </>
                      );
                    })()}

                    {/* ── TRANSIT TIMELINE (moved above content blocks) ── */}
                    {newTabInsights.transits && (() => {
                      const now = new Date();
                      const monthName = now.toLocaleString('default', { month: 'long' });
                      const year = now.getFullYear();
                      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toLocaleString('default', { month: 'long' });
                      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toLocaleString('default', { month: 'long' });

                      const PLANET_VISUAL: Record<string, { sphere: string; ring?: string; glow: string; bands?: string[] }> = {
                        saturn:  { sphere: 'radial-gradient(circle at 35% 30%, #e8d5a3, #b8964a 55%, #8a6820)',  ring: 'rgba(232,213,163,0.6)', glow: 'rgba(232,213,163,0.5)' },
                        jupiter: { sphere: 'radial-gradient(circle at 35% 30%, #e8c98a, #c49a4a 40%, #7a5a2a)',  glow: 'rgba(232,201,138,0.5)', bands: ['rgba(180,120,60,0.5)', 'rgba(240,200,120,0.3)'] },
                        mars:    { sphere: 'radial-gradient(circle at 35% 30%, #ff8060, #cc3300 55%, #8a1a00)',   glow: 'rgba(204,51,0,0.55)' },
                        venus:   { sphere: 'radial-gradient(circle at 35% 30%, #fff0c0, #e8c840 55%, #b08a10)',  glow: 'rgba(232,200,64,0.5)' },
                        mercury: { sphere: 'radial-gradient(circle at 35% 30%, #c8c8c8, #8a8a8a 55%, #4a4a4a)', glow: 'rgba(140,140,140,0.45)' },
                        moon:    { sphere: 'radial-gradient(circle at 35% 30%, #e8e8e8, #a0a0a0 55%, #606060)',  glow: 'rgba(200,200,200,0.4)' },
                        sun:     { sphere: 'radial-gradient(circle at 40% 35%, #fff8c0, #ffcc00 50%, #ff8800)',  glow: 'rgba(255,200,0,0.6)' },
                        uranus:  { sphere: 'radial-gradient(circle at 35% 30%, #c0f8f8, #40d0d0 55%, #007a7a)',  ring: 'rgba(64,208,208,0.5)', glow: 'rgba(64,208,208,0.5)' },
                        neptune: { sphere: 'radial-gradient(circle at 35% 30%, #a0c0ff, #4060cc 55%, #102080)',  glow: 'rgba(64,96,200,0.5)' },
                        pluto:   { sphere: 'radial-gradient(circle at 35% 30%, #c0a0c0, #806080 55%, #402040)',  glow: 'rgba(128,96,128,0.45)' },
                      };

                      const accentByTab: Record<string, { color: string; bg: string; border: string; badge: string; glow: string }> = {
                        hustle: { color: 'rgba(251,191,36,1)',  bg: 'rgba(251,191,36,0.08)',  border: 'rgba(251,191,36,0.2)',  badge: 'rgba(251,191,36,0.18)', glow: 'rgba(251,191,36,0.25)' },
                        money:  { color: 'rgba(52,211,153,1)',  bg: 'rgba(52,211,153,0.08)',  border: 'rgba(52,211,153,0.2)',  badge: 'rgba(52,211,153,0.18)', glow: 'rgba(52,211,153,0.25)' },
                        growth: { color: 'rgba(139,92,246,1)',  bg: 'rgba(139,92,246,0.09)',  border: 'rgba(139,92,246,0.22)', badge: 'rgba(139,92,246,0.18)', glow: 'rgba(139,92,246,0.28)' },
                        love:   { color: 'rgba(244,114,182,1)', bg: 'rgba(244,114,182,0.08)', border: 'rgba(244,114,182,0.2)', badge: 'rgba(244,114,182,0.18)', glow: 'rgba(244,114,182,0.25)' },
                      };
                      const accent = accentByTab[activeTab] || accentByTab.hustle;

                      const timeContext = [
                        { label: 'PAST CYCLE',      period: `~ ${prevMonth} ${year}`,    sub: 'What you just came through' },
                        { label: 'CURRENT MONTH',   period: `${monthName} ${year}`,      sub: `What\'s shaping you right now` },
                        { label: 'COMING MOVEMENT', period: `~ ${nextMonth} ${year}`,    sub: 'What\'s on its way' },
                      ];

                      return (
                        <motion.div
                          initial={{ opacity: 0, y: 14 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.4, delay: 0.08 }}
                        >
                          {/* Section header */}
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                            <span style={{
                              fontSize: 10, fontWeight: 700, letterSpacing: '0.18em',
                              textTransform: 'uppercase', color: accent.color, whiteSpace: 'nowrap',
                            }}>
                              ✦ Transit Timeline
                            </span>
                            <div style={{ flex: 1, height: 1, background: 'rgba(255,255,255,0.06)' }} />
                          </div>

                          {/* 3 transit cards — horizontal row */}
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                            {newTabInsights.transits.map((transit, idx) => {
                              if (!transit.data) return null;
                              const planetKey = (transit.data.planet || '').toLowerCase();
                              const visual = PLANET_VISUAL[planetKey] || PLANET_VISUAL.mercury;
                              const ctx = timeContext[idx];
                              const isCenter = idx === 1;

                              return (
                                <motion.div
                                  key={transit.label}
                                  initial={{ opacity: 0, y: 18 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  transition={{ duration: 0.4, delay: 0.12 + idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                                  whileHover={{ y: -4 }}
                                  style={{
                                    background: isCenter ? accent.bg : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${isCenter ? accent.border : 'rgba(255,255,255,0.08)'}`,
                                    borderRadius: 16,
                                    padding: '20px 16px 18px',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 14,
                                    cursor: 'default',
                                    position: 'relative',
                                    overflow: 'hidden',
                                    boxShadow: isCenter ? `0 6px 28px ${accent.glow}` : 'none',
                                    transition: 'transform 0.25s ease',
                                  }}
                                >
                                  {/* Timeframe badge row */}
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                      <span style={{
                                        display: 'inline-block',
                                        fontSize: 8, fontWeight: 700, letterSpacing: '0.14em',
                                        textTransform: 'uppercase',
                                        background: isCenter ? accent.badge : 'rgba(255,255,255,0.07)',
                                        color: isCenter ? accent.color : 'rgba(255,255,255,0.4)',
                                        padding: '3px 8px', borderRadius: 6, width: 'fit-content',
                                      }}>
                                        {ctx?.label || transit.label}
                                      </span>
                                      <span style={{
                                        fontSize: 10, fontWeight: 500,
                                        color: isCenter ? accent.color : 'rgba(255,255,255,0.3)',
                                        letterSpacing: '0.04em',
                                      }}>
                                        {ctx?.period}
                                      </span>
                                    </div>

                                    {/* Animated planet visual */}
                                    <motion.div
                                      animate={{ y: [0, -5, 0], rotate: [0, 5, 0] }}
                                      transition={{ duration: 5 + idx * 1.2, repeat: Infinity, ease: 'easeInOut' }}
                                      style={{ position: 'relative', width: 48, height: 48, flexShrink: 0 }}
                                    >
                                      {/* Planet sphere */}
                                      <div style={{
                                        width: 44, height: 44,
                                        borderRadius: '50%',
                                        background: visual.sphere,
                                        boxShadow: `0 0 18px ${visual.glow}, 0 0 36px ${visual.glow.replace('0.5', '0.2').replace('0.45', '0.18').replace('0.55', '0.22').replace('0.6', '0.25')}`,
                                        position: 'relative',
                                        overflow: visual.bands ? 'hidden' : 'visible',
                                        margin: '2px',
                                      }}>
                                        {/* Jupiter-style horizontal bands */}
                                        {visual.bands && visual.bands.map((band, bi) => (
                                          <div key={bi} style={{
                                            position: 'absolute',
                                            left: 0, right: 0,
                                            height: 6,
                                            top: `${25 + bi * 15}%`,
                                            background: band,
                                          }} />
                                        ))}
                                        {/* Atmosphere shimmer */}
                                        <div style={{
                                          position: 'absolute', inset: 0, borderRadius: '50%',
                                          background: 'radial-gradient(circle at 28% 28%, rgba(255,255,255,0.28) 0%, transparent 60%)',
                                        }} />
                                      </div>
                                      {/* Saturn / Uranus ring */}
                                      {visual.ring && (
                                        <div style={{
                                          position: 'absolute',
                                          top: '30%', left: '-22%',
                                          width: '144%', height: '40%',
                                          borderRadius: '50%',
                                          border: `2px solid ${visual.ring}`,
                                          transform: 'rotateX(70deg)',
                                          pointerEvents: 'none',
                                        }} />
                                      )}
                                      {/* Sun corona pulses */}
                                      {planetKey === 'sun' && (
                                        <motion.div
                                          animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.6, 0.3] }}
                                          transition={{ duration: 2.5, repeat: Infinity }}
                                          style={{
                                            position: 'absolute', inset: -6, borderRadius: '50%',
                                            background: 'radial-gradient(circle, rgba(255,200,0,0.25) 30%, transparent 70%)',
                                          }}
                                        />
                                      )}
                                    </motion.div>
                                  </div>

                                  {/* Planet label + what it means */}
                                  <div>
                                    <div style={{
                                      fontSize: 10, fontWeight: 600, letterSpacing: '0.08em',
                                      textTransform: 'uppercase',
                                      color: isCenter ? accent.color : 'rgba(255,255,255,0.4)',
                                      marginBottom: 5,
                                    }}>
                                      {transit.data.planet} · {ctx?.sub}
                                    </div>
                                    <h4 style={{
                                      fontSize: 14, fontWeight: 700,
                                      color: 'rgba(255,255,255,0.95)',
                                      margin: 0, lineHeight: '1.35',
                                      fontFamily: "'Playfair Display', serif",
                                    }}>
                                      {transit.data.cycle_name}
                                    </h4>
                                  </div>

                                  {/* Description — larger & more readable */}
                                  <p style={{
                                    fontSize: 12.5,
                                    color: isCenter ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.5)',
                                    lineHeight: '1.6',
                                    margin: 0,
                                  }}>
                                    {transit.data.description}
                                  </p>

                                  {/* Active month bottom bar */}
                                  {isCenter && (
                                    <div style={{
                                      position: 'absolute', bottom: 0, left: '10%', right: '10%',
                                      height: 2, borderRadius: 2,
                                      background: `linear-gradient(90deg, transparent, ${accent.color}, transparent)`,
                                    }} />
                                  )}
                                </motion.div>
                              );
                            })}
                          </div>
                        </motion.div>
                      );
                    })()}

                    {/* Block 1 */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.1 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                        {newTabInsights.title1}
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: '1.55', margin: 0 }}>
                        {newTabInsights.text1}
                      </p>
                    </motion.div>

                    {/* Block 2 */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.18 }}
                      style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}
                    >
                      <div style={{ fontSize: 10, color: 'var(--purple-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                        {newTabInsights.title2}
                      </div>
                      <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: '1.55', margin: 0 }}>
                        {newTabInsights.text2}
                      </p>
                    </motion.div>

                    {/* Block 3 - Advice */}
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.35, delay: 0.26 }}
                      style={{
                        background: 'rgba(138, 99, 245, 0.03)',
                        border: '0.5px solid rgba(138, 99, 245, 0.25)',
                        borderRadius: 16,
                        padding: 20,
                        position: 'relative'
                      }}
                    >
                      <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                        <span>{newTabInsights.icon1}</span> {newTabInsights.title3}
                      </h4>
                      <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.5', margin: 0 }}>
                        {newTabInsights.text3}
                      </p>
                    </motion.div>

                  </div>
                ) : (
                  <>
                    {/* 1. THE INNER MATRIX SECTION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6 }}>
                        Who the World Sees vs Who You Actually Are
                      </div>
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 12 }}>
                          <div style={{
                            background: 'rgba(200,184,248,0.03)',
                            border: '0.5px solid var(--border)',
                            borderRadius: 12,
                            padding: 14
                          }}>
                            <div style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                              Public Mask
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                              {currentInsights.inner_matrix.who_you_are.public_mask}
                            </p>
                          </div>

                          <div style={{
                            background: 'rgba(200,184,248,0.03)',
                            border: '0.5px solid var(--border)',
                            borderRadius: 12,
                            padding: 14
                          }}>
                            <div style={{ fontSize: 10, color: 'var(--purple-light)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 4 }}>
                              Private Reality
                            </div>
                            <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                              {currentInsights.inner_matrix.who_you_are.private_reality}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* What You Never Say Out Loud */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🤫</span> What You Never Say Out Loud
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {currentInsights.inner_matrix.never_say_out_loud.map((item: string, idx: number) => (
                            <motion.div
                              key={item}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: idx * 0.1 }}
                              style={{
                                display: 'flex',
                                gap: 12,
                                background: 'rgba(255,255,255,0.02)',
                                border: '0.5px solid var(--border)',
                                borderRadius: 12,
                                padding: 14,
                                alignItems: 'flex-start'
                              }}
                            >
                              <span style={{ color: 'var(--gold)', fontFamily: 'monospace', fontSize: 13, fontWeight: 'bold' }}>0{idx + 1}</span>
                              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: '1.5', margin: 0 }}>
                                {item}
                              </p>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* 2. LIFE LOOPS SECTION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, marginTop: 12 }}>
                        Your Unfair Superpowers & Honest Critiques
                      </div>
                      
                      {/* Superpowers */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚡</span> Your Unfair Superpowers
                        </h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 10 }}>
                          {currentInsights.life_loops.unfair_superpowers.map((power: string, idx: number) => (
                            <div key={power} style={{
                              background: 'rgba(74,222,128,0.02)',
                              border: '0.5px solid rgba(74,222,128,0.15)',
                              borderRadius: 12,
                              padding: 14,
                              display: 'flex',
                              flexDirection: 'column',
                              gap: 4
                            }}>
                              <span style={{ fontSize: 10, color: 'var(--success)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>SUPERPOWER 0{idx + 1}</span>
                              <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                                {power}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Accordion critiques */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>⚠️</span> Honest Critiques & Blind Spots
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {currentInsights.life_loops.honest_critiques.map((critique: string, idx: number) => {
                            const isExpanded = activeAccordion === idx;
                            return (
                              <div key={critique} style={{
                                border: '0.5px solid var(--border)',
                                borderRadius: 12,
                                background: 'rgba(255,255,255,0.01)',
                                overflow: 'hidden'
                              }}>
                                <button
                                  onClick={() => setActiveAccordion(isExpanded ? null : idx)}
                                  style={{
                                    width: '100%',
                                    textAlign: 'left',
                                    padding: '12px 16px',
                                    border: 'none',
                                    background: 'transparent',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    cursor: 'pointer',
                                    outline: 'none'
                                  }}
                                >
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--gold)' }} />
                                    <span style={{ fontSize: 11, color: 'var(--gold)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Trap 0{idx + 1}</span>
                                  </div>
                                  <span style={{
                                    color: 'var(--text-hint)',
                                    fontSize: 10,
                                    transform: isExpanded ? 'rotate(90deg)' : 'none',
                                    transition: 'transform 0.2s'
                                  }}>
                                    ▶
                                  </span>
                                </button>
                                {isExpanded && (
                                  <div style={{
                                    padding: '12px 16px',
                                    borderTop: '0.5px solid var(--border)',
                                    background: 'rgba(0,0,0,0.15)',
                                    color: 'var(--text-muted)',
                                    fontSize: 13,
                                    lineHeight: '1.5'
                                  }}>
                                    {critique}
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>

                      {/* Recurring Pattern */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span>🔄</span> Your Recurring Pattern
                        </h4>
                        <p style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: '1.5', margin: 0 }}>
                          {currentInsights.life_loops.recurring_pattern.pattern}
                        </p>
                        
                        <div style={{
                          background: 'rgba(245,200,66,0.03)',
                          border: '1px solid var(--gold)',
                          borderRadius: 12,
                          padding: 14,
                          position: 'relative',
                          boxShadow: '0 0 15px rgba(245, 200, 66, 0.08)'
                        }}>
                          <span style={{ fontSize: 9, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: 4 }}>
                            BREAK THE LOOP TODAY
                          </span>
                          <p style={{ fontSize: 13, color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.4', margin: 0 }}>
                            {currentInsights.life_loops.recurring_pattern.action_item}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* 3. CURRENT WEATHER SECTION */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', letterSpacing: '1px', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: 6, marginTop: 12 }}>
                        Current Weather & Next Action
                      </div>
                      
                      {/* Weather */}
                      <div style={{
                        background: 'rgba(255, 255, 255, 0.01)',
                        border: '0.5px solid var(--border)',
                        borderRadius: 16,
                        padding: 20,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12
                      }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '0.5px solid var(--border)', paddingBottom: 10 }}>
                          <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span>🌦️</span> Why You Feel This Way Right Now
                          </h4>
                          {insights.timeframes?.present && (
                            <span style={{
                              fontSize: 9,
                              color: 'var(--purple-light)',
                              background: 'rgba(138, 99, 245, 0.1)',
                              border: '0.5px solid rgba(138, 99, 245, 0.25)',
                              padding: '3px 8px',
                              borderRadius: 20,
                              fontWeight: 500
                            }}>
                              {insights.timeframes.present}
                            </span>
                          )}
                        </div>
                        <p style={{ fontSize: 13.5, color: 'var(--text-primary)', lineHeight: '1.55', margin: 0 }}>
                          {currentInsights.current_weather.why_you_feel_this_way}
                        </p>
                      </div>

                      {/* Action item */}
                      <div style={{
                        background: 'rgba(138, 99, 245, 0.03)',
                        border: '0.5px solid rgba(138, 99, 245, 0.25)',
                        borderRadius: 16,
                        padding: 20,
                        position: 'relative'
                      }}>
                        <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--purple-light)', margin: 0, display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                          <span>⚡</span> This Week's Immediate Action Item
                        </h4>
                        <p style={{ fontSize: 13.5, color: 'var(--text-primary)', fontWeight: 500, lineHeight: '1.5', margin: 0 }}>
                          {currentInsights.current_weather.immediate_action_item}
                        </p>
                      </div>
                    </div>
                  </>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* ── INTERACTIVE COSMIC TRANSIT FORECAST ── */}
      <div style={{ width: '100%', borderTop: '1px solid rgba(255, 255, 255, 0.08)', paddingTop: '40px', marginTop: '20px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '4px 12px',
            borderRadius: '9999px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.05em',
            textTransform: 'uppercase',
            background: 'rgba(245, 200, 66, 0.1)',
            border: '1px solid rgba(245, 200, 66, 0.2)',
            color: '#f5c842',
            marginBottom: '12px'
          }}>
            Interactive Forecasting
          </span>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: '28px', fontWeight: 700, color: '#fff', margin: 0 }}>
            Cosmic Transit Weather
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '14px', marginTop: '8px', maxWidth: '600px', marginLeft: 'auto', marginRight: 'auto' }}>
            Witness how the planetary orbits shift and recalculate Vedic transits in real-time. Drag the cosmic dial to forecast the next 12 months.
          </p>
        </div>
        <CosmicTransitSlider />
      </div>
    </div>
  )
}
