// Recommendation engine for generating personalized suggestions based on emotional patterns

interface EmotionalTrend {
  id: string
  user_id: string
  date: string
  dominant_emotion: string
  emotion_intensity: number
  triggers?: string[]
  notes?: string | null
  created_at: string
}

interface Recommendation {
  id: string
  type: "activity" | "coping" | "resource"
  title: string
  content: string
  emotion: string
  tags: string[]
  relevanceScore: number
}

// Generate recommendations based on emotional trends
export function generateRecommendations(emotionalTrends: EmotionalTrend[]): Recommendation[] {
  if (!emotionalTrends || emotionalTrends.length === 0) {
    return []
  }

  const recommendations: Recommendation[] = []

  // Analyze emotional patterns
  const patterns = analyzeEmotionalPatterns(emotionalTrends)

  // Generate recommendations based on dominant emotions
  if (patterns.dominantEmotions.length > 0) {
    patterns.dominantEmotions.forEach((emotion) => {
      // Get recommendations for this emotion
      const emotionRecommendations = getRecommendationsForEmotion(
        emotion.emotion,
        emotion.frequency,
        patterns.averageIntensity[emotion.emotion] || 5,
      )

      recommendations.push(...emotionRecommendations)
    })
  }

  // Generate recommendations based on emotional volatility
  if (patterns.volatility > 0.5) {
    recommendations.push(...getVolatilityRecommendations(patterns.volatility))
  }

  // Generate recommendations based on common triggers
  if (patterns.commonTriggers.length > 0) {
    recommendations.push(...getTriggerBasedRecommendations(patterns.commonTriggers))
  }

  // Sort by relevance score and limit to 10 recommendations
  return recommendations
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 10)
    .map((rec, index) => ({
      ...rec,
      id: `rec-${index}-${Date.now()}`,
    }))
}

// Analyze emotional patterns from trends data
function analyzeEmotionalPatterns(emotionalTrends: EmotionalTrend[]) {
  // Count emotion frequencies
  const emotionCounts: Record<string, number> = {}
  const emotionIntensities: Record<string, number[]> = {}
  const allTriggers: string[] = []

  emotionalTrends.forEach((trend) => {
    // Count emotions
    emotionCounts[trend.dominant_emotion] = (emotionCounts[trend.dominant_emotion] || 0) + 1

    // Track intensities
    if (!emotionIntensities[trend.dominant_emotion]) {
      emotionIntensities[trend.dominant_emotion] = []
    }
    emotionIntensities[trend.dominant_emotion].push(trend.emotion_intensity)

    // Collect triggers
    if (trend.triggers && trend.triggers.length > 0) {
      allTriggers.push(...trend.triggers)
    }
  })

  // Calculate average intensity for each emotion
  const averageIntensity: Record<string, number> = {}
  Object.entries(emotionIntensities).forEach(([emotion, intensities]) => {
    averageIntensity[emotion] = intensities.reduce((sum, val) => sum + val, 0) / intensities.length
  })

  // Find dominant emotions (top 3)
  const dominantEmotions = Object.entries(emotionCounts)
    .map(([emotion, count]) => ({
      emotion,
      frequency: count / emotionalTrends.length,
    }))
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 3)

  // Calculate emotional volatility (changes in emotion)
  let emotionChanges = 0
  for (let i = 1; i < emotionalTrends.length; i++) {
    if (emotionalTrends[i].dominant_emotion !== emotionalTrends[i - 1].dominant_emotion) {
      emotionChanges++
    }
  }
  const volatility = emotionalTrends.length > 1 ? emotionChanges / (emotionalTrends.length - 1) : 0

  // Find common triggers
  const triggerCounts: Record<string, number> = {}
  allTriggers.forEach((trigger) => {
    triggerCounts[trigger] = (triggerCounts[trigger] || 0) + 1
  })

  const commonTriggers = Object.entries(triggerCounts)
    .map(([trigger, count]) => ({
      trigger,
      frequency: count / allTriggers.length,
    }))
    .filter((item) => item.frequency >= 0.1) // At least 10% frequency
    .sort((a, b) => b.frequency - a.frequency)
    .slice(0, 5)

  return {
    dominantEmotions,
    averageIntensity,
    volatility,
    commonTriggers,
  }
}

// Get recommendations for a specific emotion
function getRecommendationsForEmotion(emotion: string, frequency: number, intensity: number): Recommendation[] {
  const recommendations: Recommendation[] = []
  const relevanceScore = frequency * (intensity / 10)

  switch (emotion) {
    case "anxious":
      recommendations.push(
        {
          id: "",
          type: "coping",
          title: "Deep Breathing Exercise",
          content:
            "Practice 4-7-8 breathing: Inhale for 4 seconds, hold for 7 seconds, exhale for 8 seconds. Repeat 5 times when feeling anxious.",
          emotion: "anxious",
          tags: ["breathing", "immediate relief", "stress reduction"],
          relevanceScore: relevanceScore * 1.2,
        },
        {
          id: "",
          type: "activity",
          title: "Mindful Walking",
          content:
            "Take a 15-minute walk focusing only on your surroundings and physical sensations. This helps ground you and reduce anxiety.",
          emotion: "anxious",
          tags: ["mindfulness", "physical activity", "grounding"],
          relevanceScore,
        },
        {
          id: "",
          type: "resource",
          title: "Anxiety Management Guide",
          content:
            'Check out "The Anxiety and Phobia Workbook" by Edmund Bourne for practical exercises and strategies to manage anxiety.',
          emotion: "anxious",
          tags: ["book", "self-help", "exercises"],
          relevanceScore: relevanceScore * 0.9,
        },
      )
      break

    case "sad":
      recommendations.push(
        {
          id: "",
          type: "activity",
          title: "Mood-Boosting Playlist",
          content:
            "Create a playlist of songs that make you feel good or bring back positive memories. Listen to it when feeling down.",
          emotion: "sad",
          tags: ["music", "mood elevation", "sensory"],
          relevanceScore: relevanceScore * 1.1,
        },
        {
          id: "",
          type: "coping",
          title: "Gratitude Practice",
          content:
            "Write down three things you're grateful for each day. This practice has been shown to improve mood over time.",
          emotion: "sad",
          tags: ["gratitude", "journaling", "positive psychology"],
          relevanceScore,
        },
        {
          id: "",
          type: "resource",
          title: "Depression Support",
          content:
            'The book "Feeling Good" by David Burns offers cognitive behavioral therapy techniques that are effective for managing depression.',
          emotion: "sad",
          tags: ["book", "CBT", "self-help"],
          relevanceScore: relevanceScore * 0.9,
        },
      )
      break

    case "angry":
      recommendations.push(
        {
          id: "",
          type: "coping",
          title: "Anger Time-Out",
          content:
            "When you feel anger rising, give yourself a time-out. Count to 10 slowly and focus on your breathing before responding.",
          emotion: "angry",
          tags: ["immediate relief", "self-regulation", "pause technique"],
          relevanceScore: relevanceScore * 1.2,
        },
        {
          id: "",
          type: "activity",
          title: "Physical Release",
          content:
            "Channel anger into physical activity like running, swimming, or hitting a punching bag. Physical exertion helps release tension.",
          emotion: "angry",
          tags: ["exercise", "tension release", "physical activity"],
          relevanceScore,
        },
        {
          id: "",
          type: "resource",
          title: "Anger Management Techniques",
          content:
            'The book "Anger: Wisdom for Cooling the Flames" by Thich Nhat Hanh offers mindfulness-based approaches to managing anger.',
          emotion: "angry",
          tags: ["book", "mindfulness", "emotional regulation"],
          relevanceScore: relevanceScore * 0.9,
        },
      )
      break

    case "happy":
      recommendations.push(
        {
          id: "",
          type: "activity",
          title: "Joy Journaling",
          content:
            "Keep a joy journal to document moments of happiness. This helps reinforce positive emotions and create a resource for tougher days.",
          emotion: "happy",
          tags: ["journaling", "positive psychology", "gratitude"],
          relevanceScore,
        },
        {
          id: "",
          type: "coping",
          title: "Savoring Practice",
          content:
            "Practice savoring positive experiences by fully focusing on them, using all your senses to enhance and extend the positive feelings.",
          emotion: "happy",
          tags: ["mindfulness", "positive psychology", "present moment"],
          relevanceScore: relevanceScore * 0.9,
        },
        {
          id: "",
          type: "resource",
          title: "Happiness Enhancement",
          content:
            'The book "The How of Happiness" by Sonja Lyubomirsky offers science-based strategies to increase and sustain happiness.',
          emotion: "happy",
          tags: ["book", "positive psychology", "well-being"],
          relevanceScore: relevanceScore * 0.8,
        },
      )
      break

    case "neutral":
      recommendations.push(
        {
          id: "",
          type: "activity",
          title: "Emotional Awareness Check-in",
          content:
            "Set aside 5 minutes daily to check in with your emotions. Notice what you're feeling without judgment, and consider what might be influencing your emotional state.",
          emotion: "neutral",
          tags: ["emotional awareness", "mindfulness", "self-reflection"],
          relevanceScore,
        },
        {
          id: "",
          type: "coping",
          title: "Values Exploration",
          content:
            "Identify your core values and consider how aligned your daily activities are with these values. This can help bring more meaning and emotional richness to your life.",
          emotion: "neutral",
          tags: ["values", "meaning", "purpose"],
          relevanceScore: relevanceScore * 0.9,
        },
        {
          id: "",
          type: "resource",
          title: "Emotional Intelligence Development",
          content:
            'The book "Permission to Feel" by Marc Brackett offers strategies for developing greater emotional awareness and intelligence.',
          emotion: "neutral",
          tags: ["book", "emotional intelligence", "self-development"],
          relevanceScore: relevanceScore * 0.8,
        },
      )
      break

    default:
      // For other emotions like confused, content, etc.
      recommendations.push(
        {
          id: "",
          type: "activity",
          title: "Mindfulness Meditation",
          content:
            "Practice 10 minutes of mindfulness meditation daily to increase emotional awareness and regulation.",
          emotion,
          tags: ["mindfulness", "meditation", "emotional awareness"],
          relevanceScore,
        },
        {
          id: "",
          type: "coping",
          title: "Emotion Journaling",
          content:
            "Keep a journal of your emotions, noting triggers and how you respond. This increases self-awareness and helps identify patterns.",
          emotion,
          tags: ["journaling", "self-awareness", "reflection"],
          relevanceScore: relevanceScore * 0.9,
        },
      )
  }

  return recommendations
}

// Get recommendations for emotional volatility
function getVolatilityRecommendations(volatility: number): Recommendation[] {
  const relevanceScore = volatility * 0.8

  return [
    {
      id: "",
      type: "coping",
      title: "Emotional Regulation Practice",
      content:
        "Practice the STOP technique when emotions change rapidly: Stop, Take a breath, Observe your feelings without judgment, and Proceed mindfully.",
      emotion: "general",
      tags: ["emotional regulation", "mindfulness", "grounding"],
      relevanceScore: relevanceScore * 1.2,
    },
    {
      id: "",
      type: "activity",
      title: "Routine Building",
      content:
        "Establish a consistent daily routine to provide structure and stability, which can help reduce emotional volatility.",
      emotion: "general",
      tags: ["routine", "stability", "structure"],
      relevanceScore,
    },
    {
      id: "",
      type: "resource",
      title: "Emotional Stability Guide",
      content:
        'The book "The Dialectical Behavior Therapy Skills Workbook" offers practical exercises for emotional regulation and distress tolerance.',
      emotion: "general",
      tags: ["book", "DBT", "emotional regulation"],
      relevanceScore: relevanceScore * 0.9,
    },
  ]
}

// Get recommendations based on common triggers
function getTriggerBasedRecommendations(triggers: Array<{ trigger: string; frequency: number }>): Recommendation[] {
  const recommendations: Recommendation[] = []

  triggers.forEach(({ trigger, frequency }) => {
    const relevanceScore = frequency * 0.7
    let recommendation: Recommendation | null = null

    // Generate recommendations based on common trigger types
    if (trigger.includes("work") || trigger.includes("job") || trigger.includes("career")) {
      recommendation = {
        id: "",
        type: "coping",
        title: "Work Stress Management",
        content:
          "Set clear boundaries between work and personal life. Consider techniques like time-blocking and regular breaks to reduce work-related stress.",
        emotion: "general",
        tags: ["work", "stress management", "boundaries"],
        relevanceScore,
      }
    } else if (trigger.includes("relationship") || trigger.includes("partner") || trigger.includes("family")) {
      recommendation = {
        id: "",
        type: "resource",
        title: "Relationship Communication",
        content:
          'The book "Nonviolent Communication" by Marshall Rosenberg offers effective techniques for improving communication in relationships.',
        emotion: "general",
        tags: ["relationships", "communication", "conflict resolution"],
        relevanceScore,
      }
    } else if (trigger.includes("sleep") || trigger.includes("tired") || trigger.includes("fatigue")) {
      recommendation = {
        id: "",
        type: "activity",
        title: "Sleep Hygiene Improvement",
        content:
          "Establish a consistent sleep schedule and bedtime routine. Avoid screens 1 hour before bed and create a comfortable sleep environment.",
        emotion: "general",
        tags: ["sleep", "health", "routine"],
        relevanceScore,
      }
    } else if (trigger.includes("health") || trigger.includes("illness") || trigger.includes("pain")) {
      recommendation = {
        id: "",
        type: "coping",
        title: "Health Concern Management",
        content:
          "Practice gentle self-care during health challenges. Consider keeping a symptom journal to share with healthcare providers.",
        emotion: "general",
        tags: ["health", "self-care", "medical"],
        relevanceScore,
      }
    } else {
      // Generic trigger-based recommendation
      recommendation = {
        id: "",
        type: "coping",
        title: `Managing "${trigger}" Triggers`,
        content: `When "${trigger}" triggers difficult emotions, try the 5-4-3-2-1 grounding technique: Acknowledge 5 things you see, 4 things you can touch, 3 things you hear, 2 things you smell, and 1 thing you taste.`,
        emotion: "general",
        tags: ["triggers", "grounding", "coping strategy"],
        relevanceScore,
      }
    }

    if (recommendation) {
      recommendations.push(recommendation)
    }
  })

  return recommendations
}
