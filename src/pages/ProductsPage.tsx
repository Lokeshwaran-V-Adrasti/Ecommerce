import React, { useState, useEffect, useMemo } from 'react';
import { Filter, Grid, List } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useCurrencyStore } from '../store/currencyStore';
import ProductCard from '../components/product/ProductCard';
import ProductFilters from '../components/product/ProductFilters';

interface ColorProductCard {
  product: any;
  colorVariant: {
    name: string;
    code?: string;
    images?: Array<{
      url: string;
      alt?: string;
      isPrimary?: boolean;
    }>;
    linkedProduct?: string | null;
  };
  cardKey: string;
}

const ProductsPage = () => {
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  const {
    allProducts,
    searchQuery,
    filters,
    fetchAllProducts,
  } = useProductStore();

  const { formatPrice, currency } = useCurrencyStore();

  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      await fetchAllProducts();
      setLoading(false);
    };

    loadProducts();
  }, [fetchAllProducts]);

  /*
   * First filter the real Product documents.
   *
   * Colour filtering is also aware of the new colors[] structure.
   */
  const filteredProducts = allProducts.filter((product) => {
    const productAny = product as any;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();

      const matchesSearch =
        (product.name || product.title || '')
          .toLowerCase()
          .includes(query) ||
        (product.description || '')
          .toLowerCase()
          .includes(query) ||
        (product.category || '')
          .toLowerCase()
          .includes(query);

      if (!matchesSearch) return false;
    }

    if (
      filters.category &&
      product.category !== filters.category
    ) {
      return false;
    }

    if (
      filters.subcategory &&
      product.subcategory !== filters.subcategory
    ) {
      return false;
    }

    if (filters.brands.length > 0) {
      const productBrand = (product.brand || '').toLowerCase();

      const hasMatchingBrand = filters.brands.some(
        (brand) =>
          brand.toLowerCase() === productBrand
      );

      if (!hasMatchingBrand) return false;
    }

    const productPrice =
      Number(productAny.price ?? productAny.basePrice ?? 0);

    if (
      productPrice < filters.priceRange[0] ||
      productPrice > filters.priceRange[1]
    ) {
      return false;
    }

    if (filters.sizes.length > 0) {
      const productSizes = Array.isArray(productAny.variants)
        ? productAny.variants.map((v: any) => v.size)
        : productAny.sizes || [];

      const hasMatchingSize = filters.sizes.some(
        (size) => productSizes.includes(size)
      );

      if (!hasMatchingSize) return false;
    }

    if (filters.colors.length > 0) {
      const variantColors = Array.isArray(productAny.variants)
        ? productAny.variants
            .map((v: any) => String(v.color || '').toLowerCase())
            .filter(Boolean)
        : [];

      const dedicatedColors = Array.isArray(productAny.colors)
        ? productAny.colors
            .map((c: any) =>
              String(c.name || '').toLowerCase()
            )
            .filter(Boolean)
        : [];

      const productColors = [
        ...new Set([
          ...variantColors,
          ...dedicatedColors,
        ]),
      ];

      const hasMatchingColor = filters.colors.some(
        (color) =>
          productColors.includes(color.toLowerCase())
      );

      if (!hasMatchingColor) return false;
    }

    if (filters.rating > 0) {
      const productRating =
        productAny.ratingAverage ??
        productAny.rating ??
        0;

      if (productRating < filters.rating) return false;
    }

    return true;
  });

  /*
   * ==========================================================
   * IMPORTANT:
   *
   * One MongoDB product with multiple colours becomes multiple
   * visual cards here.
   *
   * Example:
   *
   * Product "tyyy"
   *   colors: Green, Red
   *
   * becomes:
   *
   * Card 1 -> tyyy - Green
   * Card 2 -> tyyy - Red
   *
   * Products WITHOUT colors[] remain one normal card.
   * ==========================================================
   */
  const displayProducts = useMemo<ColorProductCard[]>(() => {
    const cards: ColorProductCard[] = [];

    filteredProducts.forEach((product) => {
      const productAny = product as any;
      const colors = Array.isArray(productAny.colors)
        ? productAny.colors.filter(
            (color: any) => color?.name
          )
        : [];

      if (colors.length === 0) {
        cards.push({
          product,
          colorVariant: {
            name: '',
            images: [],
          },
          cardKey: String(
            productAny.id || productAny._id
          ),
        });

        return;
      }

      colors.forEach((color: any, index: number) => {
        cards.push({
          product,
          colorVariant: {
            name: color.name,
            code: color.code,
            images: Array.isArray(color.images)
              ? color.images
              : [],
            linkedProduct: color.linkedProduct || null,
          },
          cardKey: `${productAny.id || productAny._id}-color-${color._id || index}-${color.name}`,
        });
      });
    });

    return cards;
  }, [filteredProducts]);

  /*
   * Sort the visual cards, not just the MongoDB products.
   */
  const sortedProducts = [...displayProducts].sort((a, b) => {
    const getCardPrice = (card: ColorProductCard) => {
      const productAny = card.product as any;

      if (card.colorVariant.name) {
        const matchingVariant = Array.isArray(
          productAny.variants
        )
          ? productAny.variants.find(
              (variant: any) =>
                String(variant.color || '').toLowerCase() ===
                card.colorVariant.name.toLowerCase()
            )
          : null;

        if (matchingVariant?.price != null) {
          return Number(matchingVariant.price);
        }
      }

      return Number(
        productAny.price ??
          productAny.basePrice ??
          0
      );
    };

    const priceA = getCardPrice(a);
    const priceB = getCardPrice(b);

    const ratingA =
      (a.product as any).ratingAverage ??
      (a.product as any).rating ??
      0;

    const ratingB =
      (b.product as any).ratingAverage ??
      (b.product as any).rating ??
      0;

    const nameA =
      `${a.product.name || a.product.title || ''} ${
        a.colorVariant.name || ''
      }`.toLowerCase();

    const nameB =
      `${b.product.name || b.product.title || ''} ${
        b.colorVariant.name || ''
      }`.toLowerCase();

    const dateA = new Date(
      (a.product as any).createdAt || 0
    ).getTime();

    const dateB = new Date(
      (b.product as any).createdAt || 0
    ).getTime();

    switch (sortBy) {
      case 'price-low':
        return priceA - priceB;

      case 'price-high':
        return priceB - priceA;

      case 'rating':
        return ratingB - ratingA;

      case 'name':
        return nameA.localeCompare(nameB);

      case 'newest':
      default:
        return dateB - dateA;
    }
  });

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-lg text-gray-600">
              Loading products...
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {searchQuery
              ? `Search Results for "${searchQuery}"`
              : 'All Products'}
          </h1>

          <p className="text-gray-600">
            {sortedProducts.length} products found
          </p>
        </div>

        <div className="flex items-center space-x-4 mt-4 lg:mt-0">
          <div className="flex items-center gap-2">
            <label
              htmlFor="sortBy"
              className="text-sm font-medium text-gray-700"
            >
              Sort by
            </label>

            <select
              id="sortBy"
              value={sortBy}
              onChange={(e) =>
                setSortBy(e.target.value)
              }
              className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
            >
              <option value="newest">Newest</option>
              <option value="price-low">
                Price: Low to High
              </option>
              <option value="price-high">
                Price: High to Low
              </option>
              <option value="rating">
                Highest Rated
              </option>
              <option value="name">Name</option>
            </select>
          </div>

          <button
            onClick={() =>
              setShowFilters(!showFilters)
            }
            className="lg:hidden flex items-center space-x-2 bg-gray-100 px-4 py-2 rounded-lg hover:bg-gray-200 transition-colors"
          >
            <Filter className="h-5 w-5" />
            <span>Filters</span>
          </button>

          <div className="flex items-center bg-gray-100 rounded-lg p-1">
            <button
              onClick={() =>
                setViewMode('grid')
              }
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'grid'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200'
              }`}
            >
              <Grid className="h-5 w-5" />
            </button>

            <button
              onClick={() =>
                setViewMode('list')
              }
              className={`p-2 rounded-md transition-colors ${
                viewMode === 'list'
                  ? 'bg-white shadow-sm'
                  : 'hover:bg-gray-200'
              }`}
            >
              <List className="h-5 w-5" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        {/* Filters Sidebar */}
        <div
          className={`${
            showFilters ? 'block' : 'hidden'
          } lg:block w-full lg:w-80 flex-shrink-0`}
        >
          <ProductFilters />
        </div>

        {/* Products */}
        <div className="flex-1">
          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-8">
              {sortedProducts.map((card) => (
                <ProductCard
                  key={card.cardKey}
                  product={card.product}
                  colorVariant={
                    card.colorVariant.name
                      ? card.colorVariant
                      : undefined
                  }
                />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {sortedProducts.map((card) => {
                const product = card.product as any;
                const color = card.colorVariant;
                const isColorCard = Boolean(color.name);

                const matchingVariants =
                  Array.isArray(product.variants)
                    ? product.variants.filter(
                        (variant: any) =>
                          !isColorCard ||
                          String(
                            variant.color || ''
                          ).toLowerCase() ===
                            color.name.toLowerCase()
                      )
                    : [];

                const displayPrice =
                  matchingVariants[0]?.price ??
                  product.price ??
                  product.basePrice ??
                  0;

                const images = isColorCard
                  ? color.images || []
                  : product.images || [];

                const primaryImage =
                  images.find(
                    (img: any) =>
                      typeof img === 'object' &&
                      img?.isPrimary
                  ) || images[0];

                const imageUrl =
                  typeof primaryImage === 'string'
                    ? primaryImage
                    : primaryImage?.url ||
                      'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';

                const productId =
                  product.id || product._id;

                const url = isColorCard
                  ? `/product/${productId}?color=${encodeURIComponent(
                      color.name
                    )}`
                  : `/product/${productId}`;

                return (
                  <div
                    key={card.cardKey}
                    className="bg-white rounded-2xl shadow-sm hover:shadow-lg transition-shadow p-6"
                  >
                    <Link
                      to={url}
                      className="flex gap-6"
                    >
                      <img
                        src={imageUrl}
                        alt={
                          isColorCard
                            ? `${product.name || product.title} - ${color.name}`
                            : product.name ||
                              product.title
                        }
                        className="w-32 h-32 object-cover rounded-lg"
                        onError={(e) => {
                          e.currentTarget.src =
                            'https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=400';
                        }}
                        loading="lazy"
                      />

                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-xl font-semibold text-gray-900">
                            {product.name ||
                              product.title}
                          </h3>

                          {isColorCard && (
                            <span className="text-sm font-medium text-gray-600">
                              {color.name}
                            </span>
                          )}
                        </div>

                        <p className="text-gray-600 mb-3">
                          {product.description}
                        </p>

                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-2xl font-bold text-gray-900">
                              {formatPrice(
                                Number(displayPrice)
                              )}
                            </span>

                            {currency === 'INR' && (
                              <span className="text-sm text-gray-500 ml-2">
                                ($
                                {Number(
                                  displayPrice
                                ).toFixed(2)}
                                )
                              </span>
                            )}
                          </div>

                          <span className="text-purple-600 font-medium">
                            View Details →
                          </span>
                        </div>
                      </div>
                    </Link>
                  </div>
                );
              })}
            </div>
          )}

          {sortedProducts.length === 0 && (
            <div className="text-center py-16">
              <p className="text-xl text-gray-600">
                No products found matching your criteria.
              </p>
              <p className="text-gray-500 mt-2">
                Try adjusting your filters or search terms.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProductsPage;
