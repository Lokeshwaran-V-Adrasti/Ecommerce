const mongoose = require('mongoose');

const sizeChartSchema = new mongoose.Schema({
  seller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Seller',
    required: true
  },
  name: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Chart name cannot exceed 100 characters']
  },
  category: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  headers: [{
    type: String,
    trim: true
  }],
  rows: [{
    cells: [{
      type: String,
      trim: true
    }]
  }],
  isDefault: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('SizeChart', sizeChartSchema);
