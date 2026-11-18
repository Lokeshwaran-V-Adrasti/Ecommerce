import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Heart, ShoppingCart, Star, Truck, Shield, RotateCcw } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useCartStore } from '../store/cartStore';
import { useWishlistStore } from '../store/wishlistStore';
import { useCurrencyStore } from '../store/currencyStore';
import { useAuthStore } from '../store/authStore';
import ProductReviews from '../components/product/ProductReviews';
import SizeChartModal from '../components/product/SizeChartModal';
import { sizeChartAPI } from '../utils/sizeChartAPI';
import toast from 'react-hot-toast';

const ProductDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { allProducts, fetchAllProducts } = useProductStore();
  const { addItem } = useCartStore();
  const { addItem: addToWishlist, removeItem: removeFromWishlist, isItemInWishlist } = useWishlistStore();
  const { formatPrice, currency } = useCurrencyStore();
  const { user } = useAuthStore();

  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedSize, setSelectedSize] = useState('');
  const [selectedColor, setSelectedColor] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [sizeChartModalOpen, setSizeChartModalOpen] = useState(false);
  const [sizeChartData, setSizeChartData] = useState<any>(null);
  const [loadingSizeChart, setLoadingSizeChart] = useState(false);
  const product = allProducts.find(p => p.id === id || (p as any)._id === id);

  // Fetch products if not already loaded
  React.useEffect(() => {
    if (allProducts.length === 0) {
      fetchAllProducts();
    }
  }, [allProducts.length, fetchAllProducts]);

  // Load size chart data if product has one
  React.useEffect(() => {
  const loadSizeChart = async () => {
    console.log("Loading chart for:", (product as any)?.sizeChartId);

    if ((product as any)?.sizeChartId) {
      setLoadingSizeChart(true);

      try {
        const chartData = await sizeChartAPI.getChartById(
          (product as any).sizeChartId
        );

        console.log("Returned chartData =", chartData);

        setSizeChartData(chartData);

        console.log("State updated");
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingSizeChart(false);
      }
    }
  };

  loadSizeChart();
}, [product]);

React.useEffect(() => {
    console.log("sizeChartData changed:", sizeChartData);
}, [sizeChartData]);

  // ============================================================
  // COLOUR OPTIONS
  // ============================================================
  // New products store colour galleries in colors[].images[]
  // Older products can still fall back to variant.color.
  const colorOptions = useMemo(() => {
    if (!product) return [];

    const colors = Array.isArray((product as any).colors)
      ? (product as any).colors
      : [];

    if (colors.length > 0) {
      return colors
        .filter((color: any) => color?.name)
        .map((color: any) => ({
          name: String(color.name),
          code: color.code || getColorCode(color.name),
          images: Array.isArray(color.images)
            ? color.images
            : color.image
              ? [{ url: getImageUrl(color.image), isPrimary: true }]
              : [],
          linkedProduct: color.linkedProduct
            ? String(color.linkedProduct._id || color.linkedProduct)
            : '',
        }));
    }

    const variantColors = Array.isArray(product.variants)
      ? [...new Set(product.variants.map((v: any) => v?.color).filter(Boolean))]
      : [];

    return variantColors.map((name: string) => ({
      name,
      code: getColorCode(name),
      images: [],
      linkedProduct: '',
    }));
  }, [product]);

  const hasDedicatedColorGallery = colorOptions.some(
    (color: any) => Array.isArray(color.images) && color.images.length > 0
  );

  // Default to the first colour when the product has colours.
  useEffect(() => {
    if (colorOptions.length === 0) {
      setSelectedColor('');
      return;
    }

    if (!colorOptions.some((color: any) => color.name === selectedColor)) {
      setSelectedColor(colorOptions[0].name);
    }
  }, [colorOptions, selectedColor]);

  const selectedColorData = useMemo(
    () => colorOptions.find((color: any) => color.name === selectedColor) || null,
    [colorOptions, selectedColor]
  );

  // ============================================================
  // ONLY VARIANTS FOR THE SELECTED COLOUR
  // ============================================================
  const selectedColorVariants = useMemo(() => {
    if (!product || !Array.isArray(product.variants)) return [];

    if (!selectedColor) return product.variants;

    return product.variants.filter(
      (variant: any) =>
        String(variant?.color || '').toLowerCase() === selectedColor.toLowerCase()
    );
  }, [product, selectedColor]);

  // IMPORTANT: size buttons are calculated from the selected colour.
  // Example: Red = M,L -> only M,L are shown. S is NOT shown.
  const availableSizes = useMemo(() => {
    const variants = selectedColor ? selectedColorVariants : product?.variants || [];

    return [
      ...new Set(
        variants.map((variant: any) => variant?.size).filter(Boolean)
      ),
    ];
  }, [product, selectedColor, selectedColorVariants]);

  const productHasSize =
    (product as any)?.hasSize !== false &&
    availableSizes.some((size: string) => size !== 'One Size');

  // When colour changes, reset gallery and make sure the selected size
  // actually exists for the new colour.
  useEffect(() => {
    setSelectedImage(0);

    if (!selectedColor) return;

    if (availableSizes.length === 0) {
      setSelectedSize('');
      return;
    }

    if (!availableSizes.includes(selectedSize)) {
      setSelectedSize(
        availableSizes.includes('One Size') ? 'One Size' : availableSizes[0]
      );
    }
  }, [selectedColor, availableSizes]);

  // ============================================================
  // ACTIVE IMAGE GALLERY
  // ============================================================
  // Colour mode -> selected colour images[]
  // Normal mode -> product.images[]
  const displayImages = useMemo(() => {
    if (
      hasDedicatedColorGallery &&
      selectedColorData &&
      selectedColorData.images?.length > 0
    ) {
      return selectedColorData.images;
    }

    return Array.isArray(product?.images) ? product.images : [];
  }, [hasDedicatedColorGallery, selectedColorData, product]);

  const getPrimaryImageUrl = () => {
    if (!displayImages.length) return FALLBACK_IMAGE;

    const primary = displayImages.find(
      (image: any) => typeof image === 'object' && image?.isPrimary === true
    );

    return getImageUrl(primary || displayImages[0]) || FALLBACK_IMAGE;
  };

  // ============================================================
  // SELECTED SIZE + COLOUR VARIANT
  // ============================================================
  const selectedVariant = useMemo(() => {
    if (!product || !Array.isArray(product.variants)) return null;

    return (
      product.variants.find((variant: any) => {
        const sameColor =
          !selectedColor ||
          String(variant?.color || '').toLowerCase() === selectedColor.toLowerCase();
        const sameSize = !selectedSize || variant?.size === selectedSize;
        return sameColor && sameSize;
      }) || null
    );
  }, [product, selectedColor, selectedSize]);

  const currentPrice = Number(
    selectedVariant?.price ?? (product as any)?.basePrice ?? product?.price ?? 0
  );

  const selectedVariantStock = selectedVariant
    ? Number(selectedVariant.stock || 0)
    : 0;

  const totalStock = product?.variants?.reduce(
    (sum: number, variant: any) => sum + Number(variant?.stock || 0),
    0
  );

  const isSoldOut = Boolean(
    (product as any)?.isSoldOut ||
      (selectedVariant
        ? selectedVariantStock <= 0
        : typeof totalStock === 'number' && totalStock <= 0)
  );

  const handleColorChange = (color: any) => {
    setSelectedColor(color.name);
    setSelectedImage(0);

    // Future Myntra/Flipkart-style linked colour products.
    if (color.linkedProduct) {
      navigate(`/products/${color.linkedProduct}`);
    }
  };

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
        <h1 className="text-2xl font-bold text-gray-900">Product not found</h1>
        <Link to="/products" className="text-purple-600 hover:text-purple-700 mt-4 inline-block">
          Browse all products
        </Link>
      </div>
    );
  }

  const handleAddToCart = () => {
    if (isSoldOut) {
      toast.error('This product is out of stock');
      return;
    }

    if ((productHasSize && !selectedSize) || (colorOptions.length > 0 && !selectedColor)) {
      toast.error(productHasSize ? 'Please select size and color' : 'Please select color');
      return;
    }

    // Extract seller ID - handle both object and string formats
    const seller = (product as any).seller;
    const sellerId = typeof seller === 'object' && seller !== null
      ? (seller._id || seller.id || '')
      : (seller || (product as any).sellerId || '');

    console.log('🛒 Adding to cart - seller:', seller, 'sellerId:', sellerId);

    if (!sellerId) {
      toast.error('Unable to add to cart: seller information missing');
      console.error('❌ Seller ID is missing for product:', product);
      return;
    }

    addItem({
      productId: product.id,
      sellerId: sellerId,
      name: product.name || (product as any).title || 'Product',
      price: currentPrice,
      image: getPrimaryImageUrl(),
      size: productHasSize ? selectedSize : 'One Size',
      hasSize: productHasSize,
      color: selectedColor || selectedVariant?.color || 'No Color',
      quantity,
    });
    toast.success('Added to cart!');
  };

  const handleWishlistToggle = () => {
    if (isItemInWishlist(product.id)) {
      removeFromWishlist(product.id);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: Date.now().toString(),
        productId: product.id,
        name: product.name || (product as any).title || 'Product',
        price: currentPrice,
        image: getPrimaryImageUrl(),
      });
      toast.success('Added to wishlist');
    }
  };
console.log("Product:", product);
console.log("sizeChartId:", (product as any).sizeChartId);
console.log("sizeChartData:", sizeChartData);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Product Images */}
        <div className="space-y-4">
          <div className="relative overflow-hidden rounded-2xl bg-gray-100">
            <img
              src={getImageUrl(displayImages[selectedImage]) || getPrimaryImageUrl()}
              alt={product.name || (product as any).title}
              className="w-full h-96 lg:h-[600px] object-cover"
              onError={(e) => {
                console.error('Failed to load product image:', selectedImage);
                (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800';
              }}
            />
            {(product as any).isNew && (
              <span className="absolute top-4 left-4 bg-green-500 text-white px-3 py-1 rounded-full text-sm font-semibold">
                NEW
              </span>
            )}
            {isSoldOut && (
              <span className="absolute top-4 right-4 bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                OUT OF STOCK
              </span>
            )}
          </div>

          {displayImages.length > 1 && (
            <div className="grid grid-cols-4 gap-4">
              {displayImages.map((image: any, index: number) => (
                <button
                  key={`${selectedColor || 'product'}-${index}`}
                  onClick={() => setSelectedImage(index)}
                  className={`relative overflow-hidden rounded-lg border-2 transition-all ${
                    selectedImage === index ? 'border-purple-600' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <img
                    src={getImageUrl(image)}
                    alt={`${product.name || (product as any).title} ${index + 1}`}
                    className="w-full h-20 object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=200';
                    }}
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Info */}
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{product.name || (product as any).title}</h1>
            <div className="flex items-center space-x-4 mb-4">
              <div className="flex items-center">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-5 w-5 ${
                      i < Math.floor(product.rating)
                        ? 'text-yellow-400 fill-current'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
              </div>
              <span className="text-gray-600">({product.reviewCount} reviews)</span>
            </div>

            <div className="flex items-center space-x-4">
              <div>
                <span className="text-3xl font-bold text-gray-900">{formatPrice(currentPrice)}</span>
                {currency === 'INR' && (
                  <span className="text-sm text-gray-500 ml-2">
                    (${currentPrice.toFixed(2)} USD)
                  </span>
                )}
              </div>
              {product.originalPrice && (
                <span className="text-xl text-gray-500 line-through">{formatPrice(product.originalPrice)}</span>
              )}
              {product.originalPrice && (
                <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-sm font-semibold">
                  Save {formatPrice(Number(product.originalPrice) - currentPrice)}
                </span>
              )}
            </div>
          </div>

          <p className="text-gray-600 leading-relaxed">{product.description}</p>


          {/* Size Selection */}
          {productHasSize && availableSizes.length > 0 && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">Size</h3>
                {sizeChartData && (
                  <button
                    type="button"
                    onClick={() => setSizeChartModalOpen(true)}
                    className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-semibold hover:bg-blue-200 transition-colors"
                  >
                    <span>📏</span>
                    <span>Size Chart</span>
                  </button>
                )}
              </div>

              <div className="grid grid-cols-5 gap-3">
                {availableSizes.map((size: string) => {
                  const variant = selectedColorVariants.find(
                    (item: any) => item?.size === size
                  );
                  const stock = Number(variant?.stock || 0);
                  const sizeOutOfStock = Boolean(variant) && stock <= 0;

                  return (
                    <button
                      key={size}
                      type="button"
                      disabled={sizeOutOfStock}
                      onClick={() => setSelectedSize(size)}
                      className={`py-3 px-4 border rounded-lg text-sm font-medium transition-colors ${
                        selectedSize === size
                          ? 'bg-purple-600 text-white border-purple-600'
                          : sizeOutOfStock
                            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed line-through'
                            : 'bg-white text-gray-700 border-gray-300 hover:border-purple-600'
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Color Selection */}
          {colorOptions.length > 0 && (
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-3">Color</h3>
              <div className="flex flex-wrap gap-3">
                {colorOptions.map((color: any) => {
                  const isSelected = selectedColor === color.name;

                  return (
                    <button
                      key={color.name}
                      type="button"
                      onClick={() => handleColorChange(color)}
                      className={`relative w-12 h-12 rounded-full border-4 transition-all ${
                        isSelected
                          ? 'border-purple-600 scale-110'
                          : 'border-gray-300 hover:border-purple-400'
                      }`}
                      style={{
                        backgroundColor: color.code || getColorCode(color.name),
                      }}
                      title={color.name}
                      aria-label={`Select ${color.name}`}
                    >
                      {isSelected && (
                        <span className="absolute inset-0 rounded-full bg-black/20 flex items-center justify-center text-white font-bold">
                          ✓
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
              {selectedColor && (
                <p className="text-sm text-gray-500 mt-2">
                  Selected: <strong>{selectedColor}</strong>
                </p>
              )}
            </div>
          )}

          {/* Quantity */}
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-3">Quantity</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                -
              </button>
              <span className="text-lg font-semibold w-8 text-center">{quantity}</span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="w-10 h-10 border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
              >
                +
              </button>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="space-y-4">
            {user?.role?.toUpperCase() === 'SELLER' ? (
              // Seller View - Display only message
              <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
                <p className="text-blue-800 font-semibold text-lg mb-2">Seller View Mode</p>
                <p className="text-blue-600 text-sm">
                  You're viewing this product as a seller. Customers can purchase this product from the store.
                </p>
              </div>
            ) : (
              // Customer View - Show purchase options
              <div className="flex space-x-4">
                <button
                  onClick={handleAddToCart}
                  disabled={isSoldOut}
                  className={`flex-1 py-4 px-6 rounded-full font-semibold transition-colors flex items-center justify-center space-x-2 ${
                    isSoldOut ? 'bg-gray-400 text-white cursor-not-allowed' : 'bg-purple-600 text-white hover:bg-purple-700'
                  }`}
                >
                  <ShoppingCart className="h-5 w-5" />
                  <span>{isSoldOut ? 'Out of Stock' : 'Add to Cart'}</span>
                </button>
                <button
                  onClick={handleWishlistToggle}
                  className={`p-4 border-2 rounded-full transition-colors ${
                    isItemInWishlist(product.id)
                      ? 'bg-red-500 text-white border-red-500'
                      : 'bg-white text-gray-600 border-gray-300 hover:border-red-500 hover:text-red-500'
                  }`}
                >
                  <Heart className="h-6 w-6" fill={isItemInWishlist(product.id) ? 'currentColor' : 'none'} />
                </button>
              </div>
            )}
          </div>

          {/* Product Details */}
          <div className="space-y-6 pt-8 border-t border-gray-200">
            {((product as any).material) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Material</h4>
                <p className="text-gray-600">{(product as any).material}</p>
              </div>
            )}

            {((product as any).careInstructions || (product as any).care) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Care Instructions</h4>
                <ul className="text-gray-600 space-y-1">
                  {((product as any).careInstructions || (product as any).care || []).map((instruction: string, index: number) => (
                    <li key={index}>• {instruction}</li>
                  ))}
                </ul>
              </div>
            )}

            {((product as any).features && (product as any).features.length > 0) && (
              <div>
                <h4 className="text-lg font-semibold text-gray-900 mb-2">Features</h4>
                <ul className="text-gray-600 space-y-1">
                  {(product as any).features.map((feature: string, index: number) => (
                    <li key={index}>• {feature}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2 text-gray-600">
                <Truck className="h-5 w-5" />
                <span className="text-sm">Free Shipping</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <Shield className="h-5 w-5" />
                <span className="text-sm">Secure Payment</span>
              </div>
              <div className="flex items-center space-x-2 text-gray-600">
                <RotateCcw className="h-5 w-5" />
                <span className="text-sm">Easy Returns</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Reviews Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <ProductReviews productId={id || ''} />
      </div>

      {/* Size Chart Modal */}
      <SizeChartModal
        isOpen={sizeChartModalOpen}
        onClose={() => setSizeChartModalOpen(false)}
        sizeChart={sizeChartData}
      />
    </div>
  );
};

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800';

const getImageUrl = (image: any): string => {
  if (!image) return '';
  if (typeof image === 'string') return image;
  return image?.url || '';
};

const getColorCode = (color: string): string => {
  const normalized = String(color || '').trim().toLowerCase();

  const colorMap: Record<string, string> = {
    white: '#ffffff',
    black: '#000000',
    brown: '#a16207',
    gray: '#6b7280',
    grey: '#6b7280',
    navy: '#1e3a8a',
    blue: '#3b82f6',
    'dark-blue': '#1e40af',
    'light-blue': '#93c5fd',
    red: '#ef4444',
    pink: '#ec4899',
    maroon: '#7f1d1d',
    green: '#22c55e',
    olive: '#15803d',
    teal: '#14b8a6',
    yellow: '#facc15',
    orange: '#f97316',
    beige: '#fde68a',
    gold: '#ca8a04',
    purple: '#a855f7',
    charcoal: '#1f2937',
    silver: '#d1d5db',
    'floral-blue': '#60a5fa',
    'floral-pink': '#f472b6',
    'solid-white': '#ffffff',
  };

  return colorMap[normalized] || '#9ca3af';
};

const getColorClass = (color: string) => {
  const colorMap: { [key: string]: string } = {
    // Basic colors
    white: 'bg-white',
    White: 'bg-white',
    black: 'bg-black',
    Black: 'bg-black',
    brown: 'bg-amber-700',
    Brown: 'bg-amber-700',
    gray: 'bg-gray-500',
    Gray: 'bg-gray-500',
    grey: 'bg-gray-500',
    Grey: 'bg-gray-500',

    // Blues
    navy: 'bg-blue-900',
    Navy: 'bg-blue-900',
    'dark-blue': 'bg-blue-800',
    'light-blue': 'bg-blue-300',
    blue: 'bg-blue-500',
    Blue: 'bg-blue-500',

    // Reds & Pinks
    red: 'bg-red-500',
    Red: 'bg-red-500',
    pink: 'bg-pink-500',
    Pink: 'bg-pink-500',
    maroon: 'bg-red-900',
    Maroon: 'bg-red-900',

    // Greens
    green: 'bg-green-500',
    Green: 'bg-green-500',
    olive: 'bg-green-700',
    Olive: 'bg-green-700',
    teal: 'bg-teal-500',
    Teal: 'bg-teal-500',

    // Yellows & Oranges
    yellow: 'bg-yellow-400',
    Yellow: 'bg-yellow-400',
    orange: 'bg-orange-500',
    Orange: 'bg-orange-500',
    beige: 'bg-amber-200',
    Beige: 'bg-amber-200',
    gold: 'bg-yellow-600',
    Gold: 'bg-yellow-600',

    // Purples
    purple: 'bg-purple-500',
    Purple: 'bg-purple-500',

    // Special
    charcoal: 'bg-gray-800',
    'floral-blue': 'bg-blue-400',
    'floral-pink': 'bg-pink-400',
    'solid-white': 'bg-white',
    silver: 'bg-gray-300',
    Silver: 'bg-gray-300',
  };
  return colorMap[color] || 'bg-gray-400';
};

export default ProductDetailPage;
