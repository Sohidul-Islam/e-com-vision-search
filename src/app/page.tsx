'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { products, Product } from '@/data/products';
import { classifyImage, loadModel, Prediction } from '@/utils/imageClassifier';
import { findMatchingProducts, filterProducts, filterByCategory, getCategories } from '@/utils/productMatcher';

export default function Home() {
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [displayedProducts, setDisplayedProducts] = useState<Product[]>(products.slice(0, 50));
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [modelLoaded, setModelLoaded] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load TensorFlow model on component mount
  useEffect(() => {
    const loadTFModel = async () => {
      try {
        console.log('=== STARTING MODEL LOAD ===');
        console.log('TensorFlow available:', typeof window !== 'undefined' && window.tf);
        console.log('MobileNet available:', typeof window !== 'undefined' && window.mobilenet);

        await loadModel();

        console.log('=== MODEL LOADED SUCCESSFULLY ===');
        setModelLoaded(true);
      } catch (error) {
        console.error('=== ERROR LOADING MODEL ===');
        console.error('Error details:', error);
      }
    };
    loadTFModel();
  }, []);

  // Handle image upload
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('=== IMAGE UPLOAD STARTED ===');
    console.log('File name:', file.name);
    console.log('File type:', file.type);
    console.log('File size:', (file.size / 1024).toFixed(2), 'KB');

    const reader = new FileReader();
    reader.onload = async (event) => {
      const imageUrl = event.target?.result as string;
      console.log('Image loaded as data URL, length:', imageUrl.length);

      setSelectedImage(imageUrl);
      setIsProcessing(true);

      // Wait for image to load before classifying
      setTimeout(async () => {
        if (imageRef.current) {
          try {
            console.log('=== STARTING IMAGE CLASSIFICATION ===');
            console.log('Image element dimensions:', imageRef.current.width, 'x', imageRef.current.height);

            const preds = await classifyImage(imageRef.current);

            console.log('=== CLASSIFICATION COMPLETE ===');
            console.log('Number of predictions:', preds.length);
            console.log('Predictions:', JSON.stringify(preds, null, 2));

            setPredictions(preds);

            // Find matching products
            console.log('=== FINDING MATCHING PRODUCTS ===');
            const matchedProducts = findMatchingProducts(preds, products, 50);

            console.log('=== MATCHING COMPLETE ===');
            console.log('Number of matched products:', matchedProducts.length);
            console.log('Top 5 matched products:', matchedProducts.slice(0, 5).map(p => ({
              id: p.id,
              name: p.name,
              category: p.category,
              tags: p.tags
            })));

            setDisplayedProducts(matchedProducts);
          } catch (error) {
            console.error('=== ERROR DURING CLASSIFICATION ===');
            console.error('Error:', error);
            console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
          }
          setIsProcessing(false);
          console.log('=== PROCESSING COMPLETE ===');
        } else {
          console.error('Image ref is null');
        }
      }, 100);
    };
    reader.readAsDataURL(file);
  };

  // Handle search
  const handleSearch = (query: string) => {
    console.log('=== SEARCH TRIGGERED ===');
    console.log('Search query:', query);

    setSearchQuery(query);
    let filtered = products;

    if (predictions.length > 0) {
      console.log('Applying AI predictions filter');
      filtered = findMatchingProducts(predictions, products, 50);
      console.log('After prediction filter:', filtered.length, 'products');
    }

    if (query) {
      console.log('Applying search query filter');
      filtered = filterProducts(filtered, query);
      console.log('After search filter:', filtered.length, 'products');
    }

    if (selectedCategory !== 'all') {
      console.log('Applying category filter:', selectedCategory);
      filtered = filterByCategory(filtered, selectedCategory);
      console.log('After category filter:', filtered.length, 'products');
    }

    console.log('Final filtered products:', filtered.length);
    setDisplayedProducts(filtered);
  };

  // Handle category filter
  const handleCategoryChange = (category: string) => {
    console.log('=== CATEGORY CHANGE ===');
    console.log('Selected category:', category);

    setSelectedCategory(category);
    let filtered = products;

    if (predictions.length > 0) {
      console.log('Applying AI predictions filter');
      filtered = findMatchingProducts(predictions, products, 50);
      console.log('After prediction filter:', filtered.length, 'products');
    }

    if (searchQuery) {
      console.log('Applying search query filter:', searchQuery);
      filtered = filterProducts(filtered, searchQuery);
      console.log('After search filter:', filtered.length, 'products');
    }

    if (category !== 'all') {
      console.log('Applying category filter');
      filtered = filterByCategory(filtered, category);
      console.log('After category filter:', filtered.length, 'products');
    }

    console.log('Final filtered products:', filtered.length);
    setDisplayedProducts(filtered);
  };

  // Reset filters
  const handleReset = () => {
    console.log('=== RESET TRIGGERED ===');
    console.log('Clearing all filters and predictions');

    setSelectedImage(null);
    setPredictions([]);
    setSearchQuery('');
    setSelectedCategory('all');
    setDisplayedProducts(products.slice(0, 50));
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }

    console.log('Reset complete - showing', products.slice(0, 50).length, 'products');
  };

  const categories = getCategories(products);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Image Product Matcher
          </h1>
          <p className="text-gray-600 dark:text-gray-300">
            Upload an image to find matching products from our catalog
          </p>
          {!modelLoaded && (
            <p className="text-sm text-amber-600 dark:text-amber-400 mt-2">
              Loading AI model...
            </p>
          )}
        </div>

        {/* Upload Section */}
        <div className="max-w-4xl mx-auto mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
            <div className="flex flex-col md:flex-row gap-6">
              {/* Image Upload */}
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Upload Image
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={!modelLoaded || isProcessing}
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900 dark:file:text-blue-300 disabled:opacity-50"
                />
                {selectedImage && (
                  <div className="mt-4 relative">
                    <img
                      ref={imageRef}
                      src={selectedImage}
                      alt="Uploaded"
                      className="w-full h-48 object-cover rounded-lg"
                      crossOrigin="anonymous"
                    />
                    {isProcessing && (
                      <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center rounded-lg">
                        <div className="text-white text-center">
                          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-2"></div>
                          <p>Analyzing image...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Predictions */}
              {predictions.length > 0 && (
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    AI Detected:
                  </h3>
                  <div className="space-y-2">
                    {predictions.slice(0, 5).map((pred, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-gray-700 dark:text-gray-300">
                            {pred.className}
                          </span>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {(pred.probability * 100).toFixed(1)}%
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-1.5 mt-1">
                          <div
                            className="bg-blue-600 h-1.5 rounded-full"
                            style={{ width: `${pred.probability * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Filters */}
            <div className="mt-6 flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <select
                  value={selectedCategory}
                  onChange={(e) => handleCategoryChange(e.target.value)}
                  className="w-full md:w-48 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.charAt(0).toUpperCase() + cat.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <button
                onClick={handleReset}
                className="px-6 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
              >
                Reset
              </button>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="max-w-7xl mx-auto">
          <div className="mb-4 text-gray-700 dark:text-gray-300">
            Showing {displayedProducts.length} products
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
            {displayedProducts.map((product) => (
              <div
                key={product.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden hover:shadow-xl transition-shadow"
              >
                <div className="relative h-48 bg-gray-200 dark:bg-gray-700">
                  <Image
                    src={product.image}
                    alt={product.name}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-gray-900 dark:text-white text-sm mb-1 truncate">
                    {product.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2 capitalize">
                    {product.category}
                  </p>
                  <p className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    ${product.price}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {product.tags.slice(0, 2).map((tag, idx) => (
                      <span
                        key={idx}
                        className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
