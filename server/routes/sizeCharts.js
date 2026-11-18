const express = require('express');
const router = express.Router();
const SizeChart = require('../models/SizeChart');
const { isAuthenticated } = require('../middleware/auth');

// Get all size charts for authenticated seller
router.get('/', isAuthenticated, async (req, res) => {
  try {
    const seller = req.user || req.session.user;
    if (!seller || !seller._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const charts = await SizeChart.find({ seller: seller._id }).sort({ createdAt: -1 });
    res.json({ success: true, data: charts });
  } catch (error) {
    console.error('Error fetching size charts:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch size charts' });
  }
});

// Get size chart by ID
router.get('/:id', async (req, res) => {
  try {
    const chart = await SizeChart.findById(req.params.id);
    if (!chart) {
      return res.status(404).json({ success: false, message: 'Size chart not found' });
    }
    res.json({ success: true, data: chart });
  } catch (error) {
    console.error('Error fetching size chart:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch size chart' });
  }
});

// Get size charts by category
router.get('/category/:category', isAuthenticated, async (req, res) => {
  try {
    const seller = req.user || req.session.user;
    if (!seller || !seller._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const charts = await SizeChart.find({
      seller: seller._id,
      category: req.params.category.toLowerCase()
    }).sort({ createdAt: -1 });

    res.json({ success: true, data: charts });
  } catch (error) {
    console.error('Error fetching size charts by category:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch size charts' });
  }
});

// Create new size chart
router.post('/', isAuthenticated, async (req, res) => {
  try {
    const seller = req.user || req.session.user;
    if (!seller || !seller._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const { name, category, headers, rows, isDefault } = req.body;

    if (!name || !category || !headers || !rows) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    const newChart = new SizeChart({
      seller: seller._id,
      name,
      category: category.toLowerCase(),
      headers,
      rows,
      isDefault: isDefault || false
    });

    const savedChart = await newChart.save();
    res.status(201).json({ success: true, data: savedChart });
  } catch (error) {
    console.error('Error creating size chart:', error);
    res.status(500).json({ success: false, message: 'Failed to create size chart' });
  }
});

// Update size chart
router.put('/:id', isAuthenticated, async (req, res) => {
  try {
    const seller = req.user || req.session.user;
    if (!seller || !seller._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const chart = await SizeChart.findById(req.params.id);
    if (!chart) {
      return res.status(404).json({ success: false, message: 'Size chart not found' });
    }

    // Check if seller owns this chart
    if (chart.seller.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to update this chart' });
    }

    const { name, category, headers, rows, isDefault } = req.body;

    if (name) chart.name = name;
    if (category) chart.category = category.toLowerCase();
    if (headers) chart.headers = headers;
    if (rows) chart.rows = rows;
    if (typeof isDefault === 'boolean') chart.isDefault = isDefault;
    chart.updatedAt = new Date();

    const updatedChart = await chart.save();
    res.json({ success: true, data: updatedChart });
  } catch (error) {
    console.error('Error updating size chart:', error);
    res.status(500).json({ success: false, message: 'Failed to update size chart' });
  }
});

// Delete size chart
router.delete('/:id', isAuthenticated, async (req, res) => {
  try {
    const seller = req.user || req.session.user;
    if (!seller || !seller._id) {
      return res.status(401).json({ success: false, message: 'Not authenticated' });
    }

    const chart = await SizeChart.findById(req.params.id);
    if (!chart) {
      return res.status(404).json({ success: false, message: 'Size chart not found' });
    }

    // Check if seller owns this chart
    if (chart.seller.toString() !== seller._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this chart' });
    }

    await SizeChart.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: 'Size chart deleted successfully' });
  } catch (error) {
    console.error('Error deleting size chart:', error);
    res.status(500).json({ success: false, message: 'Failed to delete size chart' });
  }
});

module.exports = router;
