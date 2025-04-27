// Enhanced text-based sentiment and emotion analyzer

export interface SentimentResult {
  score: number // -5 to 5 range
  comparative: number // Normalized score (-1 to 1)
  emotion: string // Mapped emotion
  confidence: number // 0-1 range
  secondaryEmotion?: string // Secondary emotion if detected
  emotionIntensity: number // 1-10 scale
}

// Comprehensive emotion lexicon with intensity values (1-5 scale)
const emotionLexicon = {
  // Happy/Joy emotions (positive valence, high arousal)
  happy: {
    words: [
      { word: "happy", intensity: 3 },
      { word: "joy", intensity: 4 },
      { word: "delighted", intensity: 4 },
      { word: "excited", intensity: 4 },
      { word: "thrilled", intensity: 5 },
      { word: "ecstatic", intensity: 5 },
      { word: "glad", intensity: 2 },
      { word: "pleased", intensity: 2 },
      { word: "cheerful", intensity: 3 },
      { word: "jubilant", intensity: 4 },
      { word: "elated", intensity: 4 },
      { word: "overjoyed", intensity: 5 },
      { word: "blissful", intensity: 5 },
      { word: "enjoy", intensity: 3 },
      { word: "enjoying", intensity: 3 },
      { word: "enjoyed", intensity: 3 },
      { word: "love", intensity: 4 },
      { word: "loving", intensity: 4 },
      { word: "loved", intensity: 4 },
      { word: "adore", intensity: 5 },
    ],
    phrases: [
      { phrase: "feeling good", intensity: 3 },
      { phrase: "in a good mood", intensity: 3 },
      { phrase: "on cloud nine", intensity: 5 },
      { phrase: "over the moon", intensity: 5 },
      { phrase: "couldn't be happier", intensity: 5 },
      { phrase: "having a great time", intensity: 4 },
      { phrase: "having fun", intensity: 3 },
    ],
  },

  // Content/Satisfied emotions (positive valence, low arousal)
  content: {
    words: [
      { word: "content", intensity: 3 },
      { word: "satisfied", intensity: 3 },
      { word: "peaceful", intensity: 3 },
      { word: "calm", intensity: 2 },
      { word: "relaxed", intensity: 3 },
      { word: "serene", intensity: 4 },
      { word: "tranquil", intensity: 4 },
      { word: "comfortable", intensity: 2 },
      { word: "grateful", intensity: 3 },
      { word: "thankful", intensity: 3 },
      { word: "appreciate", intensity: 3 },
      { word: "appreciative", intensity: 3 },
      { word: "fulfilled", intensity: 4 },
      { word: "balanced", intensity: 2 },
      { word: "at ease", intensity: 3 },
      { word: "secure", intensity: 3 },
    ],
    phrases: [
      { phrase: "at peace", intensity: 4 },
      { phrase: "all is well", intensity: 3 },
      { phrase: "couldn't ask for more", intensity: 4 },
      { phrase: "in a good place", intensity: 3 },
      { phrase: "feel balanced", intensity: 3 },
      { phrase: "feel centered", intensity: 3 },
    ],
  },

  // Sad emotions (negative valence, low arousal)
  sad: {
    words: [
      { word: "sad", intensity: 3 },
      { word: "unhappy", intensity: 3 },
      { word: "depressed", intensity: 4 },
      { word: "miserable", intensity: 4 },
      { word: "gloomy", intensity: 3 },
      { word: "downhearted", intensity: 3 },
      { word: "down", intensity: 2 },
      { word: "blue", intensity: 2 },
      { word: "melancholy", intensity: 3 },
      { word: "heartbroken", intensity: 5 },
      { word: "grief", intensity: 5 },
      { word: "grieving", intensity: 5 },
      { word: "sorrowful", intensity: 4 },
      { word: "hurt", intensity: 3 },
      { word: "disappointed", intensity: 3 },
      { word: "upset", intensity: 3 },
      { word: "disheartened", intensity: 3 },
      { word: "hopeless", intensity: 4 },
      { word: "despair", intensity: 5 },
      { word: "despairing", intensity: 5 },
      { word: "devastated", intensity: 5 },
      { word: "lonely", intensity: 4 },
      { word: "alone", intensity: 3 },
      { word: "isolated", intensity: 4 },
      { word: "abandoned", intensity: 4 },
      { word: "rejected", intensity: 4 },
      { word: "unwanted", intensity: 4 },
      { word: "worthless", intensity: 5 },
      { word: "empty", intensity: 4 },
      { word: "numb", intensity: 3 },
      { word: "crying", intensity: 4 },
      { word: "tears", intensity: 3 },
      { word: "weeping", intensity: 4 },
      { word: "sobbing", intensity: 5 },
    ],
    phrases: [
      { phrase: "feeling down", intensity: 3 },
      { phrase: "feeling blue", intensity: 3 },
      { phrase: "in a dark place", intensity: 4 },
      { phrase: "lost hope", intensity: 4 },
      { phrase: "given up", intensity: 4 },
      { phrase: "can't go on", intensity: 5 },
      { phrase: "no point", intensity: 4 },
      { phrase: "no purpose", intensity: 4 },
      { phrase: "feel like crying", intensity: 4 },
      { phrase: "want to cry", intensity: 4 },
      { phrase: "heart aches", intensity: 4 },
      { phrase: "heart is heavy", intensity: 4 },
      { phrase: "miss someone", intensity: 3 },
      { phrase: "feel empty", intensity: 4 },
      { phrase: "feel hollow", intensity: 4 },
      { phrase: "feel nothing", intensity: 3 },
    ],
  },

  // Angry emotions (negative valence, high arousal)
  angry: {
    words: [
      { word: "angry", intensity: 4 },
      { word: "mad", intensity: 3 },
      { word: "furious", intensity: 5 },
      { word: "outraged", intensity: 5 },
      { word: "enraged", intensity: 5 },
      { word: "irate", intensity: 4 },
      { word: "irritated", intensity: 2 },
      { word: "annoyed", intensity: 2 },
      { word: "frustrated", intensity: 3 },
      { word: "exasperated", intensity: 3 },
      { word: "resentful", intensity: 3 },
      { word: "bitter", intensity: 3 },
      { word: "hostile", intensity: 4 },
      { word: "hate", intensity: 5 },
      { word: "hatred", intensity: 5 },
      { word: "loathe", intensity: 5 },
      { word: "despise", intensity: 5 },
      { word: "disgusted", intensity: 4 },
      { word: "revolted", intensity: 4 },
      { word: "offended", intensity: 3 },
      { word: "insulted", intensity: 3 },
      { word: "indignant", intensity: 3 },
      { word: "agitated", intensity: 3 },
      { word: "seething", intensity: 4 },
      { word: "livid", intensity: 5 },
      { word: "fuming", intensity: 4 },
      { word: "rage", intensity: 5 },
      { word: "raging", intensity: 5 },
    ],
    phrases: [
      { phrase: "pissed off", intensity: 4 },
      { phrase: "fed up", intensity: 3 },
      { phrase: "had it", intensity: 3 },
      { phrase: "had enough", intensity: 3 },
      { phrase: "lost my temper", intensity: 4 },
      { phrase: "about to explode", intensity: 5 },
      { phrase: "makes my blood boil", intensity: 5 },
      { phrase: "drives me crazy", intensity: 4 },
      { phrase: "can't stand", intensity: 4 },
      { phrase: "sick and tired", intensity: 4 },
      { phrase: "want to scream", intensity: 4 },
      { phrase: "want to hit", intensity: 5 },
      { phrase: "want to break", intensity: 5 },
      { phrase: "want to punch", intensity: 5 },
    ],
  },

  // Anxious emotions (negative valence, high arousal)
  anxious: {
    words: [
      { word: "anxious", intensity: 4 },
      { word: "worried", intensity: 3 },
      { word: "nervous", intensity: 3 },
      { word: "stressed", intensity: 3 },
      { word: "stressed out", intensity: 4 },
      { word: "tense", intensity: 3 },
      { word: "uneasy", intensity: 3 },
      { word: "apprehensive", intensity: 3 },
      { word: "afraid", intensity: 4 },
      { word: "scared", intensity: 4 },
      { word: "frightened", intensity: 4 },
      { word: "terrified", intensity: 5 },
      { word: "panicked", intensity: 5 },
      { word: "panicking", intensity: 5 },
      { word: "panic", intensity: 5 },
      { word: "dread", intensity: 4 },
      { word: "fearful", intensity: 4 },
      { word: "alarmed", intensity: 3 },
      { word: "distressed", intensity: 4 },
      { word: "overwhelmed", intensity: 4 },
      { word: "restless", intensity: 3 },
      { word: "jittery", intensity: 3 },
      { word: "on edge", intensity: 4 },
      { word: "frantic", intensity: 4 },
      { word: "freaking out", intensity: 5 },
      { word: "paranoid", intensity: 4 },
      { word: "insecure", intensity: 3 },
    ],
    phrases: [
      { phrase: "can't relax", intensity: 3 },
      { phrase: "can't focus", intensity: 3 },
      { phrase: "can't concentrate", intensity: 3 },
      { phrase: "can't sleep", intensity: 3 },
      { phrase: "can't breathe", intensity: 5 },
      { phrase: "heart racing", intensity: 4 },
      { phrase: "heart pounding", intensity: 4 },
      { phrase: "butterflies in stomach", intensity: 3 },
      { phrase: "knot in stomach", intensity: 3 },
      { phrase: "sick to my stomach", intensity: 4 },
      { phrase: "worried about", intensity: 3 },
      { phrase: "concerned about", intensity: 2 },
      { phrase: "afraid of", intensity: 4 },
      { phrase: "scared of", intensity: 4 },
      { phrase: "terrified of", intensity: 5 },
      { phrase: "fear that", intensity: 4 },
      { phrase: "worry that", intensity: 3 },
      { phrase: "stressed about", intensity: 3 },
      { phrase: "anxious about", intensity: 4 },
      { phrase: "nervous about", intensity: 3 },
    ],
  },

  // Neutral emotions (neutral valence, low arousal)
  neutral: {
    words: [
      { word: "neutral", intensity: 1 },
      { word: "okay", intensity: 1 },
      { word: "ok", intensity: 1 },
      { word: "fine", intensity: 1 },
      { word: "alright", intensity: 1 },
      { word: "so-so", intensity: 1 },
      { word: "average", intensity: 1 },
      { word: "moderate", intensity: 1 },
      { word: "indifferent", intensity: 2 },
      { word: "ambivalent", intensity: 2 },
      { word: "neither", intensity: 1 },
      { word: "impartial", intensity: 1 },
      { word: "dispassionate", intensity: 2 },
      { word: "detached", intensity: 2 },
      { word: "disinterested", intensity: 2 },
      { word: "unaffected", intensity: 2 },
      { word: "unmoved", intensity: 2 },
      { word: "apathetic", intensity: 2 },
      { word: "nonchalant", intensity: 2 },
      { word: "blasé", intensity: 2 },
    ],
    phrases: [
      { phrase: "don't feel much", intensity: 2 },
      { phrase: "not feeling anything", intensity: 2 },
      { phrase: "could be better", intensity: 2 },
      { phrase: "could be worse", intensity: 2 },
      { phrase: "just existing", intensity: 2 },
      { phrase: "going through motions", intensity: 2 },
      { phrase: "not good not bad", intensity: 1 },
      { phrase: "middle of the road", intensity: 1 },
      { phrase: "on the fence", intensity: 2 },
      { phrase: "take it or leave it", intensity: 2 },
    ],
  },

  // Confused emotions (mixed valence, moderate arousal)
  confused: {
    words: [
      { word: "confused", intensity: 3 },
      { word: "puzzled", intensity: 2 },
      { word: "perplexed", intensity: 3 },
      { word: "bewildered", intensity: 3 },
      { word: "baffled", intensity: 3 },
      { word: "disoriented", intensity: 3 },
      { word: "uncertain", intensity: 2 },
      { word: "unsure", intensity: 2 },
      { word: "doubtful", intensity: 2 },
      { word: "hesitant", intensity: 2 },
      { word: "conflicted", intensity: 3 },
      { word: "torn", intensity: 3 },
      { word: "ambiguous", intensity: 2 },
      { word: "unclear", intensity: 2 },
      { word: "lost", intensity: 3 },
      { word: "mixed up", intensity: 3 },
    ],
    phrases: [
      { phrase: "don't understand", intensity: 3 },
      { phrase: "can't figure out", intensity: 3 },
      { phrase: "not sure what to think", intensity: 2 },
      { phrase: "not sure what to do", intensity: 2 },
      { phrase: "don't know what to do", intensity: 3 },
      { phrase: "don't know what to think", intensity: 3 },
      { phrase: "mixed feelings", intensity: 3 },
      { phrase: "in two minds", intensity: 3 },
      { phrase: "can't decide", intensity: 2 },
      { phrase: "can't make up my mind", intensity: 2 },
    ],
  },
}

// Intensifiers and their multipliers
const intensifiers = {
  very: 1.5,
  really: 1.5,
  extremely: 2.0,
  incredibly: 2.0,
  terribly: 1.8,
  absolutely: 1.8,
  completely: 1.8,
  totally: 1.8,
  utterly: 1.8,
  deeply: 1.7,
  profoundly: 1.7,
  intensely: 1.7,
  exceptionally: 1.7,
  particularly: 1.3,
  quite: 1.3,
  rather: 1.2,
  somewhat: 0.7,
  slightly: 0.5,
  "a bit": 0.6,
  "a little": 0.6,
  "kind of": 0.6,
  "sort of": 0.6,
}

// Negation words
const negations = [
  "not",
  "no",
  "never",
  "none",
  "nobody",
  "nothing",
  "nowhere",
  "neither",
  "nor",
  "hardly",
  "scarcely",
  "barely",
  "doesn't",
  "don't",
  "didn't",
  "won't",
  "wouldn't",
  "couldn't",
  "shouldn't",
  "isn't",
  "aren't",
  "wasn't",
  "weren't",
  "haven't",
  "hasn't",
  "hadn't",
  "can't",
  "cannot",
]

// Analyze text for sentiment and emotion
export function analyzeSentiment(text: string): SentimentResult {
  try {
    // Normalize text
    const normalizedText = text.toLowerCase().trim()

    // Split into sentences for better context analysis
    const sentences = normalizedText.split(/[.!?]+/).filter((s) => s.trim().length > 0)

    // Initialize emotion scores
    const emotionScores: Record<string, { score: number; instances: number; maxIntensity: number }> = {
      happy: { score: 0, instances: 0, maxIntensity: 0 },
      content: { score: 0, instances: 0, maxIntensity: 0 },
      sad: { score: 0, instances: 0, maxIntensity: 0 },
      angry: { score: 0, instances: 0, maxIntensity: 0 },
      anxious: { score: 0, instances: 0, maxIntensity: 0 },
      neutral: { score: 0, instances: 0, maxIntensity: 0 },
      confused: { score: 0, instances: 0, maxIntensity: 0 },
    }

    // Process each sentence
    sentences.forEach((sentence) => {
      const words = sentence.split(/\s+/)

      // Check for negations in the sentence
      const hasNegation = words.some((word) => negations.includes(word))

      // Process each emotion category
      Object.entries(emotionLexicon).forEach(([emotion, data]) => {
        // Check for emotion words
        data.words.forEach(({ word, intensity }) => {
          const regex = new RegExp(`\\b${word}\\b`, "gi")
          const matches = sentence.match(regex)

          if (matches) {
            let adjustedIntensity = intensity

            // Check for intensifiers before the word
            for (const [intensifier, multiplier] of Object.entries(intensifiers)) {
              if (sentence.includes(`${intensifier} ${word}`)) {
                adjustedIntensity *= multiplier
                break
              }
            }

            // Apply negation if present
            const finalScore = hasNegation ? -adjustedIntensity : adjustedIntensity

            // Update emotion score
            emotionScores[emotion].score += finalScore * matches.length
            emotionScores[emotion].instances += matches.length
            emotionScores[emotion].maxIntensity = Math.max(emotionScores[emotion].maxIntensity, adjustedIntensity)
          }
        })

        // Check for emotion phrases
        data.phrases.forEach(({ phrase, intensity }) => {
          if (sentence.includes(phrase)) {
            const adjustedIntensity = intensity

            // Apply negation if present
            const finalScore = hasNegation ? -adjustedIntensity : adjustedIntensity

            // Update emotion score
            emotionScores[emotion].score += finalScore
            emotionScores[emotion].instances += 1
            emotionScores[emotion].maxIntensity = Math.max(emotionScores[emotion].maxIntensity, adjustedIntensity)
          }
        })
      })
    })

    // Determine primary and secondary emotions
    let primaryEmotion = "neutral"
    let secondaryEmotion: string | undefined
    let primaryScore = 0
    let secondaryScore = 0

    Object.entries(emotionScores).forEach(([emotion, data]) => {
      // Normalize score by instances to prevent bias towards emotions with more words
      const normalizedScore = data.instances > 0 ? data.score / data.instances : 0

      if (normalizedScore > primaryScore) {
        secondaryEmotion = primaryEmotion
        secondaryScore = primaryScore
        primaryEmotion = emotion
        primaryScore = normalizedScore
      } else if (normalizedScore > secondaryScore && normalizedScore < primaryScore) {
        secondaryEmotion = emotion
        secondaryScore = normalizedScore
      }
    })

    // If primary emotion is neutral but there's a secondary emotion, use that instead
    // This helps when the text has mild emotional content
    if (primaryEmotion === "neutral" && secondaryEmotion && secondaryScore > 0) {
      primaryEmotion = secondaryEmotion
      primaryScore = secondaryScore
      secondaryEmotion = undefined
    }

    // Calculate overall sentiment score (-5 to 5 scale)
    let overallScore = 0

    // Positive emotions contribute positive scores
    overallScore += (emotionScores.happy.score + emotionScores.content.score) / 2

    // Negative emotions contribute negative scores
    overallScore -= (emotionScores.sad.score + emotionScores.angry.score + emotionScores.anxious.score) / 3

    // Normalize to -5 to 5 range
    overallScore = Math.max(Math.min(overallScore, 5), -5)

    // Calculate confidence based on the strength of emotion detection
    const totalWords = text.split(/\s+/).length
    const emotionWords = Object.values(emotionScores).reduce((sum, data) => sum + data.instances, 0)
    const coverage = Math.min(emotionWords / totalWords, 1)

    // Confidence is based on coverage and the intensity of the primary emotion
    const maxIntensity = emotionScores[primaryEmotion].maxIntensity / 5 // Normalize to 0-1
    const confidence = Math.min((coverage * 0.7 + maxIntensity * 0.3) * 1.5, 1)

    // Calculate emotion intensity on a 1-10 scale
    const emotionIntensity = Math.round(Math.min(Math.max(emotionScores[primaryEmotion].maxIntensity * 2, 1), 10))

    return {
      score: overallScore,
      comparative: totalWords > 0 ? overallScore / totalWords : 0,
      emotion: primaryEmotion,
      secondaryEmotion: secondaryEmotion,
      confidence: confidence,
      emotionIntensity: emotionIntensity,
    }
  } catch (error) {
    console.error("Error analyzing sentiment:", error)
    return {
      score: 0,
      comparative: 0,
      emotion: "neutral",
      confidence: 0.5,
      emotionIntensity: 3,
    }
  }
}

// Get emotion values for visualization
export function getEmotionValues(result: SentimentResult): Record<string, number> {
  // Base values
  const values: Record<string, number> = {
    happy: 0,
    content: 0,
    sad: 0,
    angry: 0,
    anxious: 0,
    neutral: 0.2, // Always some neutral baseline
    confused: 0,
  }

  // Set the dominant emotion
  values[result.emotion] = result.confidence

  // Add secondary emotion if present
  if (result.secondaryEmotion) {
    values[result.secondaryEmotion] = result.confidence * 0.6
  }

  // Add some related emotions based on the primary emotion
  switch (result.emotion) {
    case "happy":
      values.content = Math.min(result.confidence * 0.5, 0.7)
      break
    case "content":
      values.happy = Math.min(result.confidence * 0.3, 0.5)
      break
    case "sad":
      values.anxious = Math.min(result.confidence * 0.3, 0.5)
      break
    case "angry":
      values.anxious = Math.min(result.confidence * 0.3, 0.5)
      break
    case "anxious":
      values.sad = Math.min(result.confidence * 0.3, 0.5)
      break
    case "confused":
      values.anxious = Math.min(result.confidence * 0.3, 0.5)
      values.neutral = Math.min(result.confidence * 0.3, 0.5)
      break
  }

  // Normalize values to ensure they sum to approximately 1
  const sum = Object.values(values).reduce((a, b) => a + b, 0)
  if (sum > 0) {
    Object.keys(values).forEach((key) => {
      values[key] = values[key] / sum
    })
  }

  return values
}

// Test the emotion detection with a sample text
export function testEmotionDetection(text: string): void {
  const result = analyzeSentiment(text)
  console.log("Text:", text)
  console.log("Detected emotion:", result.emotion)
  if (result.secondaryEmotion) {
    console.log("Secondary emotion:", result.secondaryEmotion)
  }
  console.log("Confidence:", result.confidence)
  console.log("Intensity:", result.emotionIntensity)
  console.log("Sentiment score:", result.score)
  console.log("Emotion values:", getEmotionValues(result))
}
