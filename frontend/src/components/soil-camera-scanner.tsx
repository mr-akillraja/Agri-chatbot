import { useState, useRef } from "react";
import { ImageIcon, X, Upload, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "./ui/button";
import { Alert, AlertDescription } from "./ui/alert";
import { ImprovedCameraModal } from "./improved-camera-modal";

interface SoilScanResult {
  soilType: string;
  recommendations: string[];
  imageData: string;
}

interface SoilCameraScannerProps {
  onImageCapture?: (imageData: string) => void;
  onSoilDetected?: (analysis: SoilScanResult, imageData: string) => void;
  onClose: () => void;
}

export function SoilCameraScanner({
  onImageCapture,
  onSoilDetected,
  onClose,
}: SoilCameraScannerProps) {
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const analyzeSoil = async (imageData: string) => {
    setIsAnalyzing(true);
    try {
      const formData = new FormData();
      const byteString = atob(imageData.split(',')[1]);
      const arrayBuffer = new ArrayBuffer(byteString.length);
      const uintArray = new Uint8Array(arrayBuffer);

      for (let i = 0; i < byteString.length; i++) {
        uintArray[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([uintArray], { type: 'image/jpeg' });
      formData.append('image', blob, 'soil_image.jpg');
      formData.append('detection_type', 'soil');

      const response = await fetch('http://localhost:5000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Analysis failed');

      const result = await response.json();
      if (result.error) throw new Error(result.error);

      const soilAnalysis: SoilScanResult = {
        soilType: result.soil_type,
        recommendations: result.recommendations || ["No specific recommendations available"],
        imageData: imageData,
      };

      // Call the optional callback if provided
      onImageCapture?.(imageData);
      onSoilDetected?.(soilAnalysis, imageData);
      
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze soil');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setCapturedImage(result);
      setError(null);
      analyzeSoil(result);
    };
    reader.onerror = () => setError("Failed to read the file");
    reader.readAsDataURL(file);
  };

  const handleCaptureFromModal = (imageData: string) => {
    setCapturedImage(imageData);
    setIsModalOpen(false);
    setError(null);
    analyzeSoil(imageData);
  };

  return (
    <div className="bg-white rounded-lg shadow-lg p-4 w-full max-w-md">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium">Soil Scanner</h3>
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
              Ensure good lighting and capture the soil sample clearly.
            </p>
          </div>
        )}

        {isAnalyzing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white bg-opacity-80">
            <Loader2 className="h-8 w-8 animate-spin mb-2 text-green-600" />
            <p className="text-gray-700">Analyzing soil...</p>
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
        title="Soil Scanner"
        purpose="soil"
      />
    </div>
  );
}