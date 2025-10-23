/* eslint-disable @typescript-eslint/no-explicit-any */
// Using global TensorFlow.js and MobileNet loaded via CDN
declare global {
  interface Window {
    tf: any;
    mobilenet: any;
  }
}

export interface Prediction {
  className: string;
  probability: number;
}

let model: any = null;

/**
 * Load the MobileNet model
 */
export async function loadModel(): Promise<void> {
  if (!model && typeof window !== "undefined") {
    console.log("[ImageClassifier] Checking TensorFlow.js availability...");

    if (!window.tf || !window.mobilenet) {
      console.error(
        "[ImageClassifier] TensorFlow.js or MobileNet not available"
      );
      console.error("[ImageClassifier] window.tf:", !!window.tf);
      console.error("[ImageClassifier] window.mobilenet:", !!window.mobilenet);
      throw new Error("TensorFlow.js or MobileNet not loaded from CDN");
    }

    console.log("[ImageClassifier] Initializing TensorFlow.js...");
    await window.tf.ready();
    console.log(
      "[ImageClassifier] TensorFlow.js backend:",
      window.tf.getBackend()
    );

    console.log("[ImageClassifier] Loading MobileNet model...");
    model = await window.mobilenet.load({
      version: 2,
      alpha: 0.5, // Reduced from 1.0 to 0.5 for better performance with acceptable accuracy
    });
    console.log("[ImageClassifier] MobileNet model loaded successfully");
  } else if (model) {
    console.log("[ImageClassifier] Model already loaded");
  }
}

/**
 * Classify an image and return predictions
 */
export async function classifyImage(
  imageElement: HTMLImageElement
): Promise<Prediction[]> {
  console.log("[ImageClassifier] Starting classification...");

  if (!model) {
    console.log("[ImageClassifier] Model not loaded, loading now...");
    await loadModel();
  }

  if (!model) {
    console.error("[ImageClassifier] Model failed to load");
    throw new Error("Model failed to load");
  }

  console.log("[ImageClassifier] Classifying image...");
  console.time("[ImageClassifier] Classification time");

  // Get top 10 predictions instead of default 3 for better matching
  const predictions = await model.classify(imageElement, 10);

  console.timeEnd("[ImageClassifier] Classification time");
  console.log("[ImageClassifier] Raw predictions from model:", predictions);

  const formattedPredictions = predictions.map((pred: any) => ({
    className: pred.className.toLowerCase(),
    probability: pred.probability,
  }));

  console.log("[ImageClassifier] Formatted predictions:", formattedPredictions);

  return formattedPredictions;
}

/**
 * Extract tags from predictions
 */
export function extractTags(predictions: Prediction[]): string[] {
  const tags: string[] = [];

  predictions.forEach((prediction) => {
    // Split compound class names (e.g., "coffee mug" -> ["coffee", "mug"])
    const words = prediction.className.toLowerCase().split(/[\s,]+/);
    tags.push(...words);
  });

  // Remove duplicates
  return [...new Set(tags)];
}

/**
 * Clean up resources
 */
export function disposeModel(): void {
  if (model) {
    model.dispose();
    model = null;
  }
}
