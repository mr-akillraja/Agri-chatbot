"use client"

import type React from "react"
import { useState, useRef, useEffect } from "react"
import { v4 as uuidv4 } from 'uuid'
import { Send, Loader2, Camera, Droplets, Bug, X } from "lucide-react"
import { Button } from './ui/button'
import { Input } from './ui/input'
import { SuggestedQuestions } from './suggested-questions'
import { CameraUpload } from './camera-upload'
import { WelcomeScreen } from './welcome-screen'
import { ExpertConnection } from './expert-connection'
import { EnhancedSoilTesting } from './enhanced-soil-testing'
import { SoilCameraScanner } from './soil-camera-scanner'
import { PestDetection } from './pest-detection'
import { SoilTestingForm } from './soil-testing-form'
import { GovernmentAidForm } from './government-aid-form'

type Message = {
  id: string
  content: string
  role: "user" | "bot"
  type?: "text" | "soil-form" | "aid-form"
  timestamp: Date
  image?: string
}

type ConversationContext = {
  lastIntent?: string
  userLocation?: string
  soilType?: string
  cropType?: string
  farmSize?: string
  previousQueries: string[]
}

interface SoilScanResult {
  soilType: string;
  recommendations: string[];
  imageData: string;
}

interface PestDetectionResult {
  pestName: string;
  confidence: number;
  imageData: string;
  timestamp: string;
  description?: string;
  treatments?: string[];
}

function ChatMessage({ message }: { message: Message }) {
  return (
    <div className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
      <div
        className={`rounded-lg p-3 text-sm max-w-md ${message.role === "user" ? "bg-green-500 text-white" : "bg-gray-100 text-gray-800"}`}
      >
        {message.image && (
          <img
            src={message.image}
            alt="User uploaded"
            className="max-w-full h-auto mb-2 rounded-md"
          />
        )}

        {message.type === "soil-form" ? (
          <div className="mt-2">
            <p className="mb-2">{message.content}</p>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <SoilTestingForm onSubmit={(data) => console.log("Soil test submitted:", data)} />
            </div>
          </div>
        ) : message.type === "aid-form" ? (
          <div className="mt-2">
            <p className="mb-2">{message.content}</p>
            <div className="bg-white p-3 rounded-md shadow-sm">
              <GovernmentAidForm />
            </div>
          </div>
        ) : (
          message.content
        )}
      </div>
    </div>
  )
}

export function AdvancedChatbot() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showSuggestions, setShowSuggestions] = useState(true)
  const [showWelcomeScreen, setShowWelcomeScreen] = useState(true)
  const [showCameraUpload, setShowCameraUpload] = useState(false)
  const [showExpertConnect, setShowExpertConnect] = useState(false)
  const [showEnhancedSoilTest, setShowEnhancedSoilTest] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [conversationId, setConversationId] = useState<string | null>(null)
  const [context, setContext] = useState<ConversationContext>({
    previousQueries: []
  })
  const [showSoilScanner, setShowSoilScanner] = useState(false)
  const [showPestDetection, setShowPestDetection] = useState(false)

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const createMessage = (
    content: string, 
    role: "user" | "bot", 
    type?: "text" | "soil-form" | "aid-form", 
    image?: string
  ): Message => {
    return {
      id: uuidv4(),
      content,
      role,
      type: type || "text",
      timestamp: new Date(),
      image
    }
  }

  const saveMessageToDatabase = async (message: Message) => {
    try {
      const userId = "current-user-id"

      const messageData = {
        ...message,
        conversation_id: conversationId || undefined,
        timestamp: message.timestamp.toISOString(),
      }

      if (!conversationId) {
        const newConversationId = uuidv4()
        setConversationId(newConversationId)
      }

      // Simulate API call
      console.log("Message saved:", messageData)
      return { success: true }
    } catch (error) {
      console.error("Error saving message:", error)
      return { success: false }
    }
  }

  const handleResetChat = () => {
    setMessages([])
    setShowWelcomeScreen(true)
    setShowSuggestions(true)
    setInput("")
    setIsLoading(false)
    setShowCameraUpload(false)
    setShowExpertConnect(false)
    setShowEnhancedSoilTest(false)
    setShowSoilScanner(false)
    setShowPestDetection(false)
    setContext({
      previousQueries: []
    })
    setConversationId(null)
  }

  const sendBotResponse = async (response: { content: string; type?: "text" | "soil-form" | "aid-form" }) => {
    setIsLoading(true)
    
    const botMessage = createMessage(response.content, "bot", response.type)
    setMessages((prev) => [...prev, botMessage])
    await saveMessageToDatabase(botMessage)
    setIsLoading(false)
    return botMessage
  }

  const handleSendMessage = async () => {
    if (!input.trim()) return

    const userMessage = createMessage(input, "user")
    setMessages((prev) => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    setShowSuggestions(false)
    setShowWelcomeScreen(false)

    await saveMessageToDatabase(userMessage)

    const intent = detectIntent(input)
    const response = generateResponse(intent, input, context)

    setTimeout(async () => {
      const botMessage = await sendBotResponse(response)
      
      if (intent === "expert_connect") {
        setShowExpertConnect(true)
      } else if (intent === "enhanced_soil_test") {
        setShowEnhancedSoilTest(true)
      } else if (intent === "pest_detection") {
        setShowPestDetection(true)
      } else if (intent === "soil_test") {
        setTimeout(async () => {
          await sendBotResponse({
            content: "Would you like to use the soil scanner to analyze your soil?",
            type: "text"
          })
        }, 500)
      }
    }, 1000)
  }

  const handleSoilDetected = async (soilAnalysis: SoilScanResult, imageData: string) => {
    const imageMessage = createMessage(
      "Here's the soil image I captured for analysis.",
      "user",
      "text",
      imageData
    )

    const soilMessage = createMessage(
      `Based on the soil analysis, I've detected ${soilAnalysis.soilType} soil.`,
      "bot"
    )

    const recommendationsMessage = createMessage(
      `Recommendations for your ${soilAnalysis.soilType} soil:\n${soilAnalysis.recommendations.join("\n")}`,
      "bot"
    )

    setMessages((prev) => [...prev, imageMessage, soilMessage, recommendationsMessage])
    await Promise.all([
      saveMessageToDatabase(imageMessage),
      saveMessageToDatabase(soilMessage),
      saveMessageToDatabase(recommendationsMessage)
    ])

    setContext((prev) => ({
      ...prev,
      soilType: soilAnalysis.soilType,
      lastIntent: "soil_analysis",
      previousQueries: [...prev.previousQueries, "soil_analysis"]
    }))

    setShowSoilScanner(false)
  }

  const handlePestDetected = async (pestAnalysis: PestDetectionResult) => {
    const imageMessage = createMessage(
      "Here's the pest image I captured for analysis.",
      "user",
      "text",
      pestAnalysis.imageData
    )

    const pestMessage = createMessage(
      `I've identified ${pestAnalysis.pestName} with ${pestAnalysis.confidence.toFixed(1)}% confidence. ${pestAnalysis.description}`,
      "bot"
    )

    const treatmentMessage = createMessage(
      `Recommended treatments:\n${pestAnalysis.treatments?.join("\n") || "No specific treatments available."}`,
      "bot"
    )

    setMessages((prev) => [...prev, imageMessage, pestMessage, treatmentMessage])
    await Promise.all([
      saveMessageToDatabase(imageMessage),
      saveMessageToDatabase(pestMessage),
      saveMessageToDatabase(treatmentMessage)
    ])

    setContext((prev) => ({
      ...prev,
      lastIntent: "pest_detection",
      previousQueries: [...prev.previousQueries, "pest_detection"]
    }))

    setShowPestDetection(false)
  }

  const detectIntent = (input: string) => {
    const lowerInput = input.toLowerCase()

    if (lowerInput.includes("soil") || lowerInput.includes("test") || lowerInput.includes("color")) {
      return "soil_test"
    } else if (
      lowerInput.includes("government") ||
      lowerInput.includes("aid") ||
      lowerInput.includes("assistance") ||
      lowerInput.includes("program") ||
      lowerInput.includes("scheme") ||
      lowerInput.includes("subsidy") ||
      lowerInput.includes("loan")
    ) {
      return "government_aid"
    } else if (
      lowerInput.includes("help") ||
      lowerInput.includes("what can you do") ||
      lowerInput.includes("how to use")
    ) {
      return "help"
    } else if (lowerInput.includes("expert") || lowerInput.includes("connect")) {
      return "expert_connect"
    } else if (lowerInput.includes("enhanced") && lowerInput.includes("soil test")) {
      return "enhanced_soil_test"
    } else if (
      lowerInput.includes("pest") ||
      lowerInput.includes("insect") ||
      lowerInput.includes("bug") ||
      lowerInput.includes("disease")
    ) {
      return "pest_detection"
    } else {
      return "default_intent"
    }
  }

  const generateResponse = (intent: string, input: string, context: ConversationContext) => {
    switch (intent) {
      case "soil_test":
        return {
          content:
            context.soilType 
              ? `I see you previously had ${context.soilType} soil. Would you like to run a new soil test or see recommendations again?`
              : "I can help you with soil testing. Please fill out this form or use the camera to analyze your soil:",
          type: "soil-form",
        }
      case "government_aid":
        return {
          content: "I can provide information about government aid programs. Please tell me about your crops:",
          type: "aid-form",
        }
      case "help":
        setShowSuggestions(true)
        return {
          content:
            "I'm your agricultural assistant! Here's how I can help:\n\n" +
            "1️⃣ Soil Testing: I can analyze your soil type and suggest suitable crops and amendments\n\n" +
            "2️⃣ Government Aid: I can help you find agricultural schemes, subsidies and loans you may be eligible for\n\n" +
            "3️⃣ Pest Detection: I can identify common pests and suggest treatments\n\n" +
            "Just ask me about any of these topics or use the suggested questions below!",
          type: "text",
        }
      case "expert_connect":
        return {
          content: "I'll connect you to an agricultural expert. Please provide some details about your issue:",
          type: "text",
        }
      case "enhanced_soil_test":
        return {
          content: "I'll help you with an enhanced soil test. This will provide more detailed analysis than standard tests.",
          type: "text",
        }
      case "pest_detection":
        return {
          content:
            "Let's identify the pests affecting your crops. Please take a clear photo of the pest or affected plant part.",
          type: "text",
        }
      default:
        setShowSuggestions(true)
        return {
          content:
            "I'm here to help with soil testing, government aid information, and pest detection. Could you please specify which service you're interested in?",
          type: "text",
        }
    }
  }

  const handleSelectOption = (option: string) => {
    setShowWelcomeScreen(false)
    if (option === "connect-expert") {
      setShowExpertConnect(true)
      sendBotResponse({
        content: "I'll connect you to an agricultural expert. Please provide some details about your issue:",
        type: "text"
      })
    } else if (option === "enhanced-soil-test") {
      setShowEnhancedSoilTest(true)
      sendBotResponse({
        content: "I'll help you with an enhanced soil test. This will provide more detailed analysis than standard tests.",
        type: "text"
      })
    } else {
      setInput(`I am interested in ${option.replace("-", " ")}.`)
      setTimeout(() => {
        handleSendMessage()
      }, 0)
    }
  }

  const handleStartChat = () => {
    setShowWelcomeScreen(false)
    setShowSuggestions(true)
    sendBotResponse({
      content: "Hello! I'm your agricultural assistant. How can I help you today?",
      type: "text"
    })
  }

  const handleSelectQuestion = (question: string) => {
    setInput(question)
    setTimeout(() => {
      handleSendMessage()
    }, 0)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleImageCapture = (imageData: string) => {
    const imageMessage = createMessage(
      "I've taken a photo for analysis.",
      "user",
      "text",
      imageData
    )

    setMessages((prev) => [...prev, imageMessage])
    setIsLoading(true)
    setShowWelcomeScreen(false)

    saveMessageToDatabase(imageMessage)

    setTimeout(() => {
      const analysisOptions = createMessage(
        "What would you like me to analyze in this image?",
        "bot"
      )

      const optionsMessage = createMessage(
        "Please type 'soil' for soil analysis or 'pest' for pest detection.",
        "bot"
      )

      setMessages((prev) => [...prev, analysisOptions, optionsMessage])
      Promise.all([
        saveMessageToDatabase(analysisOptions),
        saveMessageToDatabase(optionsMessage)
      ]).finally(() => setIsLoading(false))
    }, 1000)
  }

  const handleOpenCamera = () => {
    setShowCameraUpload(true)
  }

  const handleCloseCamera = () => {
    setShowCameraUpload(false)
  }

  const handleCloseExpertConnect = () => {
    setShowExpertConnect(false)
  }

  const handleCloseEnhancedSoilTest = () => {
    setShowEnhancedSoilTest(false)
  }

  return (
    <div className="flex flex-col h-[600px] relative">
      {!showWelcomeScreen && (
        <button
          onClick={handleResetChat}
          className="absolute top-2 right-2 p-2 rounded-full bg-green-500 hover:bg-gray-200 transition-colors z-10"
          aria-label="Reset chat"
        >
          <X className="h-5 w-5 text-gray-600" />
        </button>
      )}

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {showWelcomeScreen ? (
          <WelcomeScreen onSelectOption={handleSelectOption} onStartChat={handleStartChat} />
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}
            {isLoading && (
              <div className="flex items-center space-x-2 text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                <p>AgriAssist Bot is thinking...</p>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {showCameraUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <CameraUpload
            onImageCapture={handleImageCapture}
            onClose={handleCloseCamera}
            onTroubleshoot={() => alert("Troubleshooting steps...")}
          />
        </div>
      )}

      {showExpertConnect && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <ExpertConnection onClose={handleCloseExpertConnect} />
        </div>
      )}

      {showEnhancedSoilTest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <EnhancedSoilTesting onClose={handleCloseEnhancedSoilTest} />
        </div>
      )}

      {showSoilScanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <SoilCameraScanner 
            onImageCapture={(imageData) => {
              const imageMessage = createMessage(
                "Here's the soil image I captured for analysis.",
                "user",
                "text",
                imageData
              )
              setMessages((prev) => [...prev, imageMessage])
            }}
            onSoilDetected={handleSoilDetected}
            onClose={() => setShowSoilScanner(false)}
          />
        </div>
      )}

      {showPestDetection && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <PestDetection 
            onPestDetected={handlePestDetected}
            onClose={() => setShowPestDetection(false)}
          />
        </div>
      )}

      <div className="border-t p-4">
        {!showWelcomeScreen && showSuggestions && messages.length < 3 && (
          <SuggestedQuestions onSelectQuestion={handleSelectQuestion} />
        )}
        <div className="flex space-x-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your message..."
            className="flex-1"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={isLoading || !input.trim()}
            className="bg-green-600 hover:bg-green-700"
          >
            <Send className="h-4 w-4" />
          </Button>
          <Button onClick={handleOpenCamera} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
            <Camera className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowSoilScanner(true)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Droplets className="h-4 w-4" />
          </Button>
          <Button
            onClick={() => setShowPestDetection(true)}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            <Bug className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}