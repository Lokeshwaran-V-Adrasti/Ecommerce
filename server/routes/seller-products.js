const express = require('express');
const Product = require('../models/Product');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

let legacyIndexCleanup;

const ensureLegacyIndexesRemoved = async () => {
    if (!legacyIndexCleanup) {
        legacyIndexCleanup = Product.collection.dropIndex('variants.sku_1').catch((error) => {
            if (error.codeName !== 'IndexNotFound' && error.code !== 27) {
                console.warn('Unable to drop legacy variants.sku index:', error.message);
            }
        });
    }
    await legacyIndexCleanup;
};

const buildProductPayload = (body, sellerId) => ({
    ...body,
    seller: sellerId,
    variants: Array.isArray(body.variants)
        ? body.variants.map(({ sku, ...variant }) => ({
            ...variant,
            stock: Number(variant.stock),
            price: Number(variant.price)
        }))
        : [],
    images: Array.isArray(body.images)
        ? body.images.map((image, index) => ({
            url: image.url,
            alt: image.alt || body.title || 'Product image',
            isPrimary: Boolean(image.isPrimary || index === 0)
        }))
        : []
});

// @route   GET /api/seller/products
// @desc    Get all products for a seller
// @access  Private (Seller)
router.get('/', [auth, authorize('SELLER')], async (req, res) => {
    try {
        const products = await Product.find({ seller: req.user.id });
        res.json({ success: true, data: products });
    } catch (error) {
        console.error('Get seller products error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   POST /api/seller/products
// @desc    Create a new product
// @access  Private (Seller)
router.post('/', [auth, authorize('SELLER')], async (req, res) => {
    try {
        console.log('📦 Creating product with data:', JSON.stringify(req.body, null, 2));
        console.log('🖼️ Images received:', req.body.images);

        // Ensure at least one image is marked as primary
        if (req.body.images && req.body.images.length > 0) {
            const hasPrimary = req.body.images.some(img => img.isPrimary);
            if (!hasPrimary) {
                console.log('⚠️ No primary image set, marking first image as primary');
                req.body.images[0].isPrimary = true;
            }
        }

        await ensureLegacyIndexesRemoved();

        const product = new Product(buildProductPayload(req.body, req.user.id));
        await product.save();

        console.log('✅ Product created with ID:', product._id);
        console.log('🖼️ Product images saved:', JSON.stringify(product.images, null, 2));

        res.status(201).json({ success: true, message: 'Product created successfully', data: product });
    } catch (error) {
        console.error('❌ Create product error:', error);
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(err => err.message);
            return res.status(400).json({
                success: false,
                message: messages.join(', ') || 'Product validation failed',
                error: error.message
            });
        }
        if (error.code === 11000) {
            return res.status(400).json({
                success: false,
                message: 'A product with the same unique details already exists. Please try again.',
                error: error.message
            });
        }
        res.status(500).json({ success: false, message: error.message || 'Server error', error: error.message });
    }
});

// @route   PUT /api/seller/products/:id
// @desc    Update a product
// @access  Private (Seller)
router.put('/:id', [auth, authorize('SELLER')], async (req, res) => {
    try {
        const product = await Product.findOneAndUpdate(
            { _id: req.params.id, seller: req.user.id },
            req.body,
            { new: true }
        );
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product updated successfully', data: product });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   DELETE /api/seller/products/:id
// @desc    Delete a product
// @access  Private (Seller)
router.delete('/:id', [auth, authorize('SELLER')], async (req, res) => {
    try {
        const product = await Product.findOneAndDelete({ _id: req.params.id, seller: req.user.id });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        res.json({ success: true, message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
