import { Product } from "@/data/products";
import { Prediction } from "./imageClassifier";

interface MatchScore {
  product: Product;
  score: number;
  matchedTags: string[];
}

function tokenizeClassName(className: string): string[] {
  const original = className.trim();

  // Split by commas or spaces
  const parts = className
    .toLowerCase()
    .split(/[\s,]+/)
    .map((s) => s.trim())
    .filter(Boolean);

  // If original is not already in lowercase, add it at the beginning
  return [original.toLowerCase(), ...parts];
}

/**
 * Calculate similarity score between image predictions and product
 * Higher probability predictions get exponentially more weight
 */
function calculateSimilarity(
  predictions: Prediction[],
  product: Product
): MatchScore {
  let score = 0;
  const matchedTags: string[] = [];

  // Extract all prediction keywords with probability-based ranking
  const predictionWords: { word: string; probability: number; rank: number }[] =
    [];
  predictions.forEach((pred, index) => {
    const words = tokenizeClassName(pred.className);
    words.forEach((word) => {
      if (word.length > 2) {
        // Ignore very short words
        predictionWords.push({
          word,
          probability: pred.probability,
          rank: index, // Lower rank = higher priority (0 is highest)
        });
      }
    });
  });

  // Check for matches in product tags with probability-weighted scoring
  product.tags.forEach((tag) => {
    const tagWords = tokenizeClassName(tag);

    tagWords.forEach((tagWord) => {
      predictionWords.forEach(({ word: predWord, probability, rank }) => {
        // Calculate priority multiplier: top predictions get much higher weight
        // Rank 0 (highest): 5x multiplier
        // Rank 1: 4x multiplier
        // Rank 2: 3x multiplier
        // Rank 3+: 2x multiplier
        const rankMultiplier =
          rank === 0 ? 5 : rank === 1 ? 4 : rank === 2 ? 3 : 2;

        // Exact match - heavily prioritize high probability predictions
        if (tagWord === predWord) {
          // Base score * probability * rank multiplier
          // Example: 91.9% probability at rank 0 = 100 * 0.919 * 5 = 459.5 points
          score += 100 * probability * rankMultiplier;
          matchedTags.push(tag);
        }
        // Partial match (one word contains the other)
        else if (
          (tagWord.includes(predWord) || predWord.includes(tagWord)) &&
          tagWord.length > 3 &&
          predWord.length > 3
        ) {
          // Partial matches get lower base score but still weighted by probability and rank
          score += 10 * probability * rankMultiplier;
          if (!matchedTags.includes(tag)) {
            matchedTags.push(tag);
          }
        }
      });
    });
  });

  // Check for matches in tokenized product name with probability-weighted scoring
  const productNameWords = tokenizeClassName(product.name);
  productNameWords.forEach((nameWord) => {
    predictionWords.forEach(({ word: predWord, probability, rank }) => {
      const rankMultiplier =
        rank === 0 ? 5 : rank === 1 ? 4 : rank === 2 ? 3 : 2;

      // Exact match in product name - high priority
      if (nameWord === predWord) {
        // Higher base score for name matches since product names are very specific
        // Example: "Perfume Bottle" matching "perfume" = 150 * 0.919 * 5 = 689.25 points
        score += 150 * probability * rankMultiplier;
        matchedTags.push(`name:${nameWord}`);
      }
      // Partial match in product name
      else if (
        (nameWord.includes(predWord) || predWord.includes(nameWord)) &&
        nameWord.length > 3 &&
        predWord.length > 3
      ) {
        score += 15 * probability * rankMultiplier;
        if (!matchedTags.includes(`name:${nameWord}`)) {
          matchedTags.push(`name:${nameWord}`);
        }
      }
    });
  });

  // Check category match - prioritize high probability predictions
  predictionWords.forEach(({ word, probability, rank }) => {
    const rankMultiplier = rank === 0 ? 5 : rank === 1 ? 4 : rank === 2 ? 3 : 2;
    if (
      product.category.toLowerCase().includes(word) ||
      word.includes(product.category.toLowerCase())
    ) {
      score += 5 * probability * rankMultiplier;
    }
  });

  console.log("Final", { score, product });

  return {
    product,
    score,
    matchedTags: [...new Set(matchedTags)],
  };
}

/**
 * Find matching products based on image predictions
 */
export function findMatchingProducts(
  predictions: Prediction[],
  allProducts: Product[],
  limit: number = 50
): Product[] {
  console.log("[ProductMatcher] Finding matching products...");
  console.log("[ProductMatcher] Predictions:", predictions);
  console.log("[ProductMatcher] Total products to scan:", allProducts.length);
  console.log("[ProductMatcher] Limit:", limit);

  console.time("[ProductMatcher] Matching time");

  // Calculate similarity scores for all products
  const scoredProducts = allProducts
    .map((product) => calculateSimilarity(predictions, product))
    .filter((item) => item?.score >= 100);

  console.log(
    "[ProductMatcher] Products with scores > 0:",
    scoredProducts.filter((p) => p.score > 0).length
  );

  // Log top 10 scores for debugging
  const topScores = scoredProducts
    .sort((a, b) => b.score - a.score)
    .slice(0, 10)
    .map((item) => ({
      name: item.product.name,
      score: item.score.toFixed(2),
      matchedTags: item.matchedTags,
      productTags: item.product.tags,
    }));
  console.log("[ProductMatcher] Top 10 scored products:", topScores);

  // Sort by score (highest first) and return top matches
  const sortedProducts = scoredProducts
    .filter((item) => item.score > 0) // Only return products with some match
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((item) => item.product);

  console.timeEnd("[ProductMatcher] Matching time");

  // If no matches found, return all products
  if (sortedProducts.length === 0) {
    console.log("[ProductMatcher] No matches found, returning all products");
    return allProducts.slice(0, limit);
  }

  console.log(
    "[ProductMatcher] Returning",
    sortedProducts.length,
    "matched products"
  );
  return sortedProducts;
}

/**
 * Filter products by search query
 */
export function filterProducts(
  products: Product[],
  searchQuery: string
): Product[] {
  if (!searchQuery || searchQuery.trim() === "") {
    return products;
  }

  const query = searchQuery.toLowerCase().trim();

  return products.filter((product) => {
    // Search in product name
    if (product.name.toLowerCase().includes(query)) {
      return true;
    }

    // Search in category
    if (product.category.toLowerCase().includes(query)) {
      return true;
    }

    // Search in tags
    if (product.tags.some((tag) => tag.toLowerCase().includes(query))) {
      return true;
    }

    // Search in description
    if (product.description.toLowerCase().includes(query)) {
      return true;
    }

    return false;
  });
}

/**
 * Filter products by category
 */
export function filterByCategory(
  products: Product[],
  category: string
): Product[] {
  if (!category || category === "all") {
    return products;
  }

  return products.filter((product) => product.category === category);
}

/**
 * Get unique categories from products
 */
export function getCategories(products: Product[]): string[] {
  const categories = new Set(products.map((p) => p.category));
  return ["all", ...Array.from(categories).sort()];
}
