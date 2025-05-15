import { useState, useRef } from "react";
import { ImageIcon, X, Upload, AlertCircle, Check, Bug, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { ImprovedCameraModal } from "./improved-camera-modal";

interface PestDetectionResult {
  pestName: string;
  confidence: number;
  imageData: string;
  description?: string;
  treatments?: string[];
}

interface PestDetectionProps {
  onPestDetected: (result: PestDetectionResult) => void;
  onClose: () => void;
}

export function PestDetection({
  onPestDetected,
  onClose,
}: PestDetectionProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzePest = async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      const blob = await fetch(imageData).then(res => res.blob());
      const formData = new FormData();
      formData.append('image', blob, 'pest-image.jpg');
      formData.append('detection_type', 'pest');

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      
      // Handle low confidence predictions
      if (result.confidence < 70) {
        const pestInfo = getPestInfo('unknown');
        const detectionResult: PestDetectionResult = {
          pestName: 'unknown',
          confidence: result.confidence,
          imageData: imageData,
          description: pestInfo.description,
          treatments: pestInfo.treatments
        };
        onPestDetected(detectionResult);
      } else {
        const pestInfo = getPestInfo(result.pest_name);
        const detectionResult: PestDetectionResult = {
          pestName: result.pest_name,
          confidence: result.confidence,
          imageData: imageData,
          description: pestInfo.description,
          treatments: pestInfo.treatments
        };
        onPestDetected(detectionResult);
      }
      
      onClose();
    } catch (err) {
      setError((err as Error).message || "Failed to analyze pest");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getPestInfo = (pestName: string) => {
    const pestDatabase: Record<string, { description: string; treatments: string[] }> = {
      "aphid": {
        description: "Small sap-sucking insects that can cause leaf curling and stunted growth.",
        treatments: [
          "Spray plants with water to knock them off",
          "Apply neem oil or insecticidal soap",
          "Introduce ladybugs or lacewings"
        ]
      },
      "armyworm": {
        description: "Armyworms are caterpillars that travel in groups and devour crops quickly.",
        treatments: [
          "Apply Bacillus thuringiensis (Bt)",
          "Remove manually in small infestations",
          "Use pheromone traps or insecticide-treated barriers"
        ]
      },
      "beetle": {
        description: "Beetles can chew on leaves, stems, and fruits, causing serious damage.",
        treatments: [
          "Apply neem oil or pyrethrin-based sprays",
          "Remove beetles manually",
          "Use row covers to protect crops"
        ]
      },
      "mite": {
        description: "Tiny pests that suck plant juices, causing stippling, yellowing, and leaf drop.",
        treatments: [
          "Spray with miticides or neem oil",
          "Increase humidity to reduce mite population",
          "Introduce predatory mites"
        ]
      },
      "sawfly": {
        description: "Sawflies are non-stinging wasps that damage leaves by feeding on them in larval stage.",
        treatments: [
          "Hand-pick larvae from plants",
          "Use horticultural oil or insecticidal soap",
          "Introduce natural predators like parasitic wasps"
        ]
      },
      "stemborer": {
        description: "Larvae that bore into plant stems, causing wilting and plant death.",
        treatments: [
          "Use resistant crop varieties",
          "Apply appropriate insecticides",
          "Practice crop rotation"
        ]
      },
      "stemfly": {
        description: "Flies whose larvae damage plant stems, affecting growth and yield.",
        treatments: [
          "Use yellow sticky traps",
          "Apply appropriate insecticides",
          "Remove and destroy infested plants"
        ]
      },
      "unknown": {
        description: "Could not identify the pest with confidence.",
        treatments: [
          "Take multiple clear photos from different angles",
          "Consult with a local agricultural expert",
          "Check for other signs of pest damage"
        ]
      }
    };

    return pestDatabase[pestName] || pestDatabase['unknown'];
  };


  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
      setError(null);
      analyzePest(result);
    };
    reader.readAsDataURL(file);
  };

  const handleCaptureFromModal = (imageData: string) => {
    setCapturedImage(imageData);
    setIsModalOpen(false);
    setError(null);
    analyzePest(imageData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Pest Scanner
        </h3>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden mb-4">
        {!capturedImage && !isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <ImageIcon className="h-12 w-12 text-gray-400 mb-2" />
            <p className="text-gray-500 text-sm text-center px-4">
              For best results, capture a clear image of the pest or affected area.
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-green-600" />
            <p className="text-gray-700">Analyzing pest...</p>
          </div>
        )}

        {capturedImage && !isAnalyzing && (
          <img
            src={capturedImage}
            alt="Captured preview"
            className="w-full h-full object-contain"
          />
        )}
      </div>

      <div className="flex flex-wrap gap-2 justify-center">
        {!capturedImage ? (
          <>
            <Button
              variant="outline"
              className="flex-1 bg-green-600 text-white hover:bg-green-700"
              onClick={() => setIsModalOpen(true)}
            >
              Open Camera
            </Button>

            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1"
            >
              <Upload className="h-4 w-4 mr-2" />
              Upload Image
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </Button>
          </>
        ) : isAnalyzing ? (
          <Button disabled className="flex-1">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Analyzing...
          </Button>
        ) : null}
      </div>

      <ImprovedCameraModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onImageCapture={handleCaptureFromModal}
        title="Pest Scanner"
        purpose="pest"
      />
    </div>
  );
}
