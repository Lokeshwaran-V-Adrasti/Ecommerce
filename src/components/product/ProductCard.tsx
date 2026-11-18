import React from 'react';
import { Link } from 'react-router-dom';
import { Heart, Star, ShoppingCart, Eye } from 'lucide-react';
import { Product } from '../../store/productStore';
import { useCartStore } from '../../store/cartStore';
import { useWishlistStore } from '../../store/wishlistStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';

interface ProductCardProps {
  product: Product;

  // When a product has colour options, ProductsPage passes one colour here.
  // This makes every colour appear as its own product card.
  colorVariant?: {
    name: string;
    code?: string;
    images?: Array<{
      url: string;
      alt?: string;
      isPrimary?: boolean;
    }>;
    linkedProduct?: string | null;
  };
}

const FALLBACK_IMAGE =
  'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400&h=400&fit=crop&crop=center';

const ProductCard: React.FC<ProductCardProps> = ({ product, colorVariant }) => {
  const { addItem } = useCartStore();
  const {
    addItem: addToWishlist,
    removeItem: removeFromWishlist,
    isItemInWishlist,
  } = useWishlistStore();
  const { formatPrice, currency } = useCurrencyStore();
  const { user } = useAuthStore();
  const [imageError, setImageError] = React.useState(false);

  const productAny = product as any;
  const productId = product.id || productAny._id;
  const productName = product.name || productAny.title || 'Product';

  /*
   * If this is a colour card, only use variants belonging to that colour.
   * Otherwise use all product variants.
   */
  const selectedColorName = colorVariant?.name || '';

  const matchingVariants = React.useMemo(() => {
    const variants = Array.isArray(productAny.variants)
      ? productAny.variants
      : [];

    if (!selectedColorName) return variants;

    return variants.filter(
      (variant: any) =>
        String(variant.color || '').toLowerCase() ===
        selectedColorName.toLowerCase()
    );
  }, [productAny.variants, selectedColorName]);

  const totalStock = matchingVariants.reduce(
    (sum: number, variant: any) => sum + Number(variant.stock || 0),
    0
  );

  const isSoldOut = Boolean(
    productAny.isSoldOut ||
      (selectedColorName && matchingVariants.length > 0 && totalStock <= 0) ||
      (!selectedColorName &&
        typeof totalStock === 'number' &&
        totalStock <= 0)
  );

  /*
   * Price for a colour card:
   * use the first matching colour variant's price when available.
   * Otherwise fall back to the product base price.
   */
  const displayPrice =
    matchingVariants.length > 0
      ? Number(
          matchingVariants[0].price ??
            productAny.price ??
            productAny.basePrice ??
            0
        )
      : Number(productAny.price ?? productAny.basePrice ?? 0);

  const getImageUrl = () => {
    // Colour card: ONLY use this colour's image gallery.
    if (colorVariant) {
      const colorImages = Array.isArray(colorVariant.images)
        ? colorVariant.images
        : [];

      if (colorImages.length > 0) {
        const primaryImage = colorImages.find(
          (img: any) =>
            typeof img === 'object' && img?.isPrimary === true
        );

        if (primaryImage) {
          return typeof primaryImage === 'string'
            ? primaryImage
            : primaryImage.url;
        }

        const firstImage = colorImages[0];
        return typeof firstImage === 'string'
          ? firstImage
          : firstImage?.url || FALLBACK_IMAGE;
      }

      return FALLBACK_IMAGE;
    }

    // Normal product without colour options.
    const images = Array.isArray(productAny.images)
      ? productAny.images
      : [];

    if (images.length > 0) {
      const primaryImage = images.find(
        (img: any) =>
          typeof img === 'object' && img?.isPrimary === true
      );

      if (primaryImage) {
        return typeof primaryImage === 'string'
          ? primaryImage
          : primaryImage.url;
      }

      const firstImage = images[0];
      return typeof firstImage === 'string'
        ? firstImage
        : firstImage?.url || FALLBACK_IMAGE;
    }

    return FALLBACK_IMAGE;
  };

  const imageUrl = imageError ? FALLBACK_IMAGE : getImageUrl();

  const buildProductUrl = () => {
    const id = productId;

    if (!id) return '/products';

    if (colorVariant?.name) {
      return `/product/${id}?color=${encodeURIComponent(
        colorVariant.name
      )}`;
    }

    return `/product/${id}`;
  };

  const handleImageError = () => {
    setImageError(true);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSoldOut) {
      toast.error('This product is sold out');
      return;
    }

    const seller = productAny.seller;
    const sellerId =
      typeof seller === 'object' && seller !== null
        ? seller._id || seller.id || ''
        : seller || productAny.sellerId || '';

    if (!sellerId) {
      toast.error(
        'Unable to add to cart: seller information missing. Please try from product details page.'
      );
      return;
    }

    const hasSize =
      productAny.hasSize !== false &&
      matchingVariants.some(
        (variant: any) => variant.size && variant.size !== 'One Size'
      );

    const availableSizes = hasSize
      ? [
          ...new Set(
            matchingVariants
              .map((variant: any) => variant.size)
              .filter(Boolean)
          ),
        ]
      : ['One Size'];

    const selectedColor =
      colorVariant?.name ||
      matchingVariants[0]?.color ||
      productAny.colors?.[0]?.name ||
      'Black';

    const selectedImage = getImageUrl();

    addItem({
      productId: id,
      sellerId,
      name: productName,
      price: displayPrice,
      image: selectedImage,
      size: availableSizes[0],
      hasSize,
      color: selectedColor,
      quantity: 1,
    });

    toast.success(
      colorVariant?.name
        ? `${colorVariant.name} added to cart!`
        : 'Added to cart!'
    );
  };

  const handleWishlistToggle = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (isItemInWishlist(productId)) {
      removeFromWishlist(productId);
      toast.success('Removed from wishlist');
    } else {
      addToWishlist({
        id: Date.now().toString(),
        productId,
        name: colorVariant?.name
          ? `${productName} - ${colorVariant.name}`
          : productName,
        price: displayPrice,
        image: getImageUrl(),
      });
      toast.success('Added to wishlist');
    }
  };

  const rating = productAny.ratingAverage ?? productAny.rating ?? 0;
  const ratingCount = productAny.ratingCount || 0;

  return (
    <div className="group relative bg-white rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 transform hover:-translate-y-2 overflow-hidden">
      <div className="relative overflow-hidden rounded-t-2xl bg-gray-100">
        <Link to={buildProductUrl()} className="block">
          <img
            src={imageUrl}
            alt={
              colorVariant?.name
                ? `${productName} - ${colorVariant.name}`
                : productName
            }
            className="w-full h-64 object-cover group-hover:scale-110 transition-transform duration-500"
            onError={handleImageError}
            loading="lazy"
          />
        </Link>

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col space-y-2 pointer-events-none">
          {productAny.isNewProduct !== false && (
            <span className="bg-green-500 text-white px-2 py-1 rounded-full text-xs font-semibold">
              NEW
            </span>
          )}

          {isSoldOut && (
            <span className="bg-red-600 text-white px-2 py-1 rounded-full text-xs font-semibold">
              SOLD OUT
            </span>
          )}
        </div>

        {/* Quick Actions - Hide for Sellers */}
        {user?.role?.toUpperCase() !== 'SELLER' && (
          <>
            <div className="absolute top-4 right-4 flex flex-col space-y-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleWishlistToggle}
                className={`p-2 rounded-full transition-colors ${
                  isItemInWishlist(productId)
                    ? 'bg-red-500 text-white'
                    : 'bg-white text-gray-600 hover:bg-red-500 hover:text-white'
                }`}
              >
                <Heart
                  className="h-5 w-5"
                  fill={
                    isItemInWishlist(productId)
                      ? 'currentColor'
                      : 'none'
                  }
                />
              </button>
            </div>

            <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <button
                onClick={handleAddToCart}
                disabled={isSoldOut}
                className={`w-full py-2 px-4 rounded-full transition-colors flex items-center justify-center space-x-2 ${
                  isSoldOut
                    ? 'bg-gray-400 text-white cursor-not-allowed'
                    : 'bg-purple-600 text-white hover:bg-purple-700'
                }`}
              >
                <ShoppingCart className="h-4 w-4" />
                <span>{isSoldOut ? 'Out of Stock' : 'Add to Cart'}</span>
              </button>
            </div>
          </>
        )}

        {/* Seller View */}
        {user?.role?.toUpperCase() === 'SELLER' && (
          <div className="absolute bottom-4 left-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <Link
              to={buildProductUrl()}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-full hover:bg-blue-700 transition-colors flex items-center justify-center space-x-2"
            >
              <Eye className="h-4 w-4" />
              <span>View Details</span>
            </Link>
          </div>
        )}
      </div>

      <Link to={buildProductUrl()} className="block p-6">
        <div className="space-y-3">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-lg font-semibold text-gray-900 group-hover:text-purple-600 transition-colors">
              {productName}
            </h3>

            {colorVariant?.name && (
              <span className="text-sm font-medium text-gray-600 whitespace-nowrap">
                {colorVariant.name}
              </span>
            )}
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => {
                const fillPercentage = Math.max(
                  0,
                  Math.min(1, rating - i)
                );

                return (
                  <div key={i} className="relative">
                    {fillPercentage > 0 && fillPercentage < 1 ? (
                      <div className="relative h-4 w-4">
                        <Star className="h-4 w-4 text-gray-300 absolute" />
                        <div
                          style={{
                            width: `${fillPercentage * 100}%`,
                            overflow: 'hidden',
                          }}
                          className="absolute"
                        >
                          <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                        </div>
                      </div>
                    ) : (
                      <Star
                        className={`h-4 w-4 ${
                          i < Math.floor(rating)
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            <span className="text-sm text-gray-600">
              {Number(rating).toFixed(1)} ({ratingCount})
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <span className="text-2xl font-bold text-gray-900">
              {formatPrice(displayPrice)}
            </span>

            {currency === 'INR' && (
              <span className="text-sm text-gray-500">
                (${displayPrice.toFixed(2)})
              </span>
            )}
          </div>

          {/* Colour swatches.
              On a colour card, highlight the card's colour first.
              On a normal product, show all available colours. */}
          <div className="flex flex-wrap gap-2 items-center">
            {(colorVariant
              ? [colorVariant]
              : Array.isArray(productAny.colors) &&
                productAny.colors.length > 0
              ? productAny.colors
              : [
                  ...new Map(
                    (productAny.variants || [])
                      .filter((v: any) => v.color)
                      .map((v: any) => [
                        String(v.color).toLowerCase(),
                        {
                          name: v.color,
                          code: undefined,
                        },
                      ])
                  ).values(),
                ]
            )
              .slice(0, 4)
              .map((color: any, index: number) => (
                <div
                  key={`${color.name}-${index}`}
                  title={color.name}
                  className="w-6 h-6 rounded-full border-2 border-gray-300"
                  style={{
                    backgroundColor:
                      color.code || getColorClass(color.name),
                  }}
                />
              ))}
          </div>
        </div>
      </Link>
    </div>
  );
};

const getColorClass = (color: string) => {
  const colorLower = String(color || '').toLowerCase().trim();

  const colorMap: { [key: string]: string } = {
    white: '#ffffff',
    black: '#000000',
    red: '#ef4444',
    blue: '#3b82f6',
    green: '#22c55e',
    yellow: '#eab308',
    purple: '#a855f7',
    pink: '#ec4899',
    orange: '#f97316',
    brown: '#92400e',
    gray: '#6b7280',
    grey: '#6b7280',
    navy: '#1e3a8a',
    'dark-blue': '#1e40af',
    'light-blue': '#93c5fd',
    charcoal: '#1f2937',
    beige: '#d6b98c',
    cream: '#fff7ed',
    maroon: '#7f1d1d',
    olive: '#15803d',
  };

  return colorMap[colorLower] || '#9ca3af';
};

export default ProductCard;