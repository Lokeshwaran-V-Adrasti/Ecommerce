import React from 'react';
import { Star } from 'lucide-react';
import { useProductStore } from '../../store/productStore';
import { useCurrencyStore } from '../../store/currencyStore';
import { PRODUCT_BRANDS, PRODUCT_CATEGORIES, PRODUCT_COLORS, PRODUCT_SIZES, CATEGORY_SIZES } from '../../data/productCatalog';

const ProductFilters = () => {
  const { filters, setFilters } = useProductStore();
  const { formatPrice } = useCurrencyStore();

  const categories = [
    { value: '', label: 'All Categories' },
    ...PRODUCT_CATEGORIES.map(category => ({ value: category.value, label: category.label })),
  ];
  const selectedCategory = PRODUCT_CATEGORIES.find(category => category.value === filters.category);
  const subcategories = selectedCategory
    ? selectedCategory.groups.flatMap(group => group.items)
    : PRODUCT_CATEGORIES.flatMap(category => category.groups.flatMap(group => group.items));

  // Get sizes based on selected subcategory
  const getAvailableSizes = () => {
    if (filters.subcategory) {
      const subcategoryKey = filters.subcategory.toLowerCase();
      return CATEGORY_SIZES[subcategoryKey] || PRODUCT_SIZES;
    }
    return PRODUCT_SIZES;
  };

  const availableSizes = getAvailableSizes();

  const toggleListValue = (key: 'sizes' | 'colors' | 'brands', value: string) => {
    const list = filters[key];
    setFilters({
      [key]: list.includes(value)
        ? list.filter(item => item !== value)
        : [...list, value],
    });
  };

  const filterRow = (
    label: string,
    checked: boolean,
    onChange: () => void
  ) => (
    <label key={label} className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm text-gray-700 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
      />
      <span className="truncate">{label}</span>
    </label>
  );

  return (
    <div className="bg-white rounded-lg border border-gray-100 shadow-sm p-5 space-y-6">
      <h3 className="text-lg font-semibold text-gray-900">Filters</h3>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Category</h4>
        <select
          value={filters.category}
          onChange={(e) => setFilters({ category: e.target.value, subcategory: '', sizes: [] })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
        >
          {categories.map(category => (
            <option key={category.value} value={category.value}>{category.label}</option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Subcategory</h4>
        <select
          value={filters.subcategory}
          onChange={(e) => setFilters({ subcategory: e.target.value, sizes: [] })}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-transparent focus:ring-2 focus:ring-purple-500"
        >
          <option value="">All Subcategories</option>
          {[...new Set(subcategories)].map(subcategory => (
            <option key={subcategory} value={subcategory}>{subcategory}</option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Price Range</h4>
        <div className="space-y-3">
          <input
            type="range"
            min="0"
            max="500"
            value={filters.priceRange[1]}
            onChange={(e) => setFilters({ priceRange: [0, parseInt(e.target.value)] })}
            className="w-full accent-purple-600"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatPrice(0)}</span>
            <span>{formatPrice(filters.priceRange[1])}</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Brand</h4>
        <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
          {PRODUCT_BRANDS.slice(0, 20).map(brand =>
            filterRow(brand, filters.brands.includes(brand), () => toggleListValue('brands', brand))
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Sizes</h4>
        <div className="grid grid-cols-2 gap-x-3">
          {availableSizes.map(size =>
            filterRow(size, filters.sizes.includes(size), () => toggleListValue('sizes', size))
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Colors</h4>
        <div className="max-h-52 space-y-0.5 overflow-y-auto pr-1">
          {PRODUCT_COLORS.slice(0, 24).map(color =>
            filterRow(color, filters.colors.includes(color), () => toggleListValue('colors', color))
          )}
        </div>
      </div>

      <div>
        <h4 className="text-sm font-medium text-gray-900 mb-3">Minimum Rating</h4>
        <div className="space-y-1">
          {[4, 3, 2, 1].map(rating => (
            <button
              key={rating}
              type="button"
              aria-pressed={filters.rating === rating}
              onClick={() => setFilters({ rating: filters.rating === rating ? 0 : rating })}
              className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-sm transition-colors ${
                filters.rating === rating ? 'bg-purple-50 text-purple-700' : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                  <Star
                    key={star}
                    className={`h-3.5 w-3.5 ${star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
                  />
                ))}
              </span>
              <span className="text-xs">& Up</span>
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => setFilters({
          category: '',
          subcategory: '',
          brands: [],
          priceRange: [0, 500],
          sizes: [],
          colors: [],
          rating: 0,
        })}
        className="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200"
      >
        Clear All Filters
      </button>
    </div>
  );
};

export default ProductFilters;
