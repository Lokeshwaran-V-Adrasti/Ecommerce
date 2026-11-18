const mongoose = require('mongoose');

/*
 * ============================================================
 * SIZE + COLOUR VARIANT
 * ============================================================
 *
 * Example:
 * Red + M
 * Blue + L
 *
 * Price, stock and SKU can be different for every combination.
 */
const variantSchema = new mongoose.Schema({
  size: {
    type: String,
    required: true,
    trim: true
  },

  color: {
    type: String,
    required: true,
    trim: true
  },

  stock: {
    type: Number,
    required: true,
    min: 0
  },

  price: {
    type: Number,
    required: true,
    min: 0
  },

  sku: {
    type: String,
    trim: true
  }
});


/*
 * ============================================================
 * PRODUCT SCHEMA
 * ============================================================
 */
const productSchema = new mongoose.Schema({

  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },

  title: {
    type: String,
    required: [true, 'Product title is required'],
    trim: true,
    maxlength: [100, 'Title cannot exceed 100 characters']
  },

  description: {
    type: String,
    required: [true, 'Product description is required'],
    maxlength: [2000, 'Description cannot exceed 2000 characters']
  },

  slug: {
    type: String,
    unique: true,
    lowercase: true
  },


  /*
   * ============================================================
   * MAIN PRODUCT IMAGES
   * ============================================================
   *
   * Used ONLY when the product does NOT have colour options.
   *
   * Maximum 6 images is enforced by the frontend.
   *
   * Example:
   *
   * images: [
   *   {
   *     url: "shirt-front.jpg",
   *     isPrimary: true
   *   },
   *   {
   *     url: "shirt-back.jpg",
   *     isPrimary: false
   *   }
   * ]
   */
  images: [{
    url: {
      type: String,
      required: true
    },

    alt: {
      type: String,
      default: ''
    },

    isPrimary: {
      type: Boolean,
      default: false
    }
  }],


  category: {
    type: String,
    required: true,
    trim: true
  },

  subcategory: {
    type: String,
    required: true
  },

  brand: {
    type: String,
    trim: true
  },

  material: {
    type: String,
    required: true
  },

  hasSize: {
    type: Boolean,
    default: true
  },

  /*
   * Optional helper field.
   *
   * true  = product uses colour-specific galleries
   * false = product uses normal main images
   *
   * The frontend can also determine this from colors.length.
   */
  hasColors: {
    type: Boolean,
    default: false
  },

  careInstructions: [String],


  /*
   * ============================================================
   * COLOUR OPTIONS
   * ============================================================
   *
   * Each colour has its OWN image gallery.
   *
   * Example:
   *
   * Green
   *   ├── code: #008000
   *   ├── images:
   *   │     ├── green-front.jpg
   *   │     └── green-back.jpg
   *   └── linkedProduct
   *
   * Red
   *   ├── code: #FF0000
   *   ├── images:
   *   │     └── red-front.jpg
   *   └── linkedProduct
   *
   * Each colour can have 1–6 images.
   *
   * IMPORTANT:
   * There is NO required `image` field here anymore.
   */
  colors: [{
    name: {
      type: String,
      required: true,
      trim: true
    },

    code: {
      type: String,
      required: true,
      trim: true
    },

    images: [{
      url: {
        type: String,
        required: true
      },

      alt: {
        type: String,
        default: ''
      },

      isPrimary: {
        type: Boolean,
        default: false
      }
    }],

    /*
     * Later this will point to the separate product
     * representing this colour.
     *
     * Example:
     *
     * Green → Product A
     * Red   → Product B
     */
    linkedProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    }
  }],


  /*
   * ============================================================
   * SIZE / STOCK / PRICE VARIANTS
   * ============================================================
   *
   * Example:
   *
   * Green + S + stock + price
   * Green + M + stock + price
   * Red   + S + stock + price
   * Red   + M + stock + price
   *
   * The colour images are NOT repeated here.
   */
  variants: {
    type: [variantSchema],
    default: []
  },


  /*
   * ============================================================
   * PRICING
   * ============================================================
   */
  basePrice: {
    type: Number,
    required: true,
    min: 0
  },

  originalPrice: {
    type: Number,
    min: 0
  },

  priceCurrency: {
    type: String,
    enum: ['USD', 'INR'],
    default: 'USD'
  },


  /*
   * ============================================================
   * PRODUCT INFORMATION
   * ============================================================
   */
  tags: [String],

  features: [String],

  dimensions: {
    length: Number,
    width: Number,
    height: Number,
    weight: Number
  },

  sizeChart: {
    type: String
  },

  sizeChartId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'SizeChart'
  },


  /*
   * ============================================================
   * RATINGS
   * ============================================================
   */
  ratingAverage: {
    type: Number,
    default: 0,
    min: 0,
    max: 5
  },

  ratingCount: {
    type: Number,
    default: 0
  },


  /*
   * ============================================================
   * SALES
   * ============================================================
   */
  totalSold: {
    type: Number,
    default: 0
  },


  /*
   * ============================================================
   * STATUS
   * ============================================================
   */
  isActive: {
    type: Boolean,
    default: true
  },

  isSoldOut: {
    type: Boolean,
    default: false
  },

  isFeatured: {
    type: Boolean,
    default: false
  },

  isNewProduct: {
    type: Boolean,
    default: true
  },


  /*
   * ============================================================
   * SEO
   * ============================================================
   */
  seoTitle: String,

  seoDescription: String,

  seoKeywords: [String]

}, {
  timestamps: true
});


/*
 * ============================================================
 * CREATE SLUG
 * ============================================================
 */
productSchema.pre('save', function(next) {

  if (this.isModified('title')) {

    const suffix = this._id
      ? `-${this._id.toString().slice(-6)}`
      : `-${Date.now()}`;

    this.slug = this.title
      .toLowerCase()
      .replace(/[^a-zA-Z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '') + suffix;
  }

  next();
});


/*
 * ============================================================
 * TOTAL STOCK
 * ============================================================
 */
productSchema.virtual('totalStock').get(function() {

  return this.variants.reduce(
    (total, variant) => total + variant.stock,
    0
  );

});


/*
 * ============================================================
 * AVAILABLE SIZES
 * ============================================================
 */
productSchema.virtual('availableSizes').get(function() {

  return [
    ...new Set(
      this.variants
        .map(v => v.size)
        .filter(Boolean)
    )
  ];

});


/*
 * ============================================================
 * AVAILABLE COLOURS
 * ============================================================
 *
 * New products:
 *   colors[].name
 *
 * Older products:
 *   variants[].color
 *
 * This keeps backward compatibility.
 */
productSchema.virtual('availableColors').get(function() {

  if (this.colors?.length) {

    return [
      ...new Set(
        this.colors
          .map(color => color.name)
          .filter(Boolean)
      )
    ];

  }

  return [
    ...new Set(
      this.variants
        .map(variant => variant.color)
        .filter(Boolean)
    )
  ];

});


/*
 * ============================================================
 * GET COLOUR
 * ============================================================
 *
 * Example:
 *
 * product.getColor('Red')
 */
productSchema.methods.getColor = function(colorName) {

  if (!colorName || !this.colors?.length) {
    return null;
  }

  return this.colors.find(
    color =>
      color.name &&
      color.name.toLowerCase() === colorName.toLowerCase()
  );

};


/*
 * ============================================================
 * GET COLOUR VARIANTS
 * ============================================================
 *
 * Example:
 *
 * product.getColorVariants('Red')
 *
 * Returns:
 *
 * Red + S
 * Red + M
 * Red + L
 */
productSchema.methods.getColorVariants = function(colorName) {

  if (!colorName) {
    return [];
  }

  return this.variants.filter(
    variant =>
      variant.color &&
      variant.color.toLowerCase() === colorName.toLowerCase()
  );

};


/*
 * ============================================================
 * JSON / OBJECT VIRTUALS
 * ============================================================
 */
productSchema.set('toJSON', {
  virtuals: true
});

productSchema.set('toObject', {
  virtuals: true
});


/*
 * ============================================================
 * EXPORT
 * ============================================================
 */
module.exports = mongoose.model('Product', productSchema);