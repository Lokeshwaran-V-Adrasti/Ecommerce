# Size Chart Feature Implementation Guide

## Overview
Complete implementation of a seller-managed, reusable size chart system with customer-facing visualization for the e-commerce platform.

## Architecture

### Database Models

#### 1. **SizeChart Model** (`server/models/SizeChart.js`)
Stores seller-created size charts with reusable data structure:

```javascript
- seller: ObjectId (reference to Seller)
- name: String (chart name, e.g., "T-Shirt Size Chart")
- category: String (product category for filtering)
- headers: Array<String> (column headers: ["Size", "Chest", "Length"])
- rows: Array<Object> (measurement data with cells array)
- isDefault: Boolean (marks default chart for category)
- timestamps: createdAt, updatedAt
```

#### 2. **Product Model Update** (`server/models/Product.js`)
Added field to link products to size charts:
- `sizeChartId: ObjectId (reference to SizeChart)`

### Frontend Components

#### 1. **SizeChartEditor Component** (`src/components/product/SizeChartEditor.tsx`)
Modal interface for sellers to create/edit size charts:

**Features:**
- Dynamic row/column management (add/delete rows and columns)
- Default template: 6 rows (XS-XXL) with 4 columns (Size, Chest, Length, Sleeve)
- Real-time cell editing
- Category-aware (tailors template based on product type)
- Input validation (name and headers required)

**Props:**
```typescript
interface SizeChartEditorProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (chartData: SizeChartData) => void;
  initialData?: SizeChartData;
  category?: string;
}
```

#### 2. **SizeChartModal Component** (`src/components/product/SizeChartModal.tsx`)
Read-only customer-facing display of size charts:

**Features:**
- Professional table rendering
- Striped row styling for readability
- Helpful tip message for customers
- Purple theme gradient header

**Props:**
```typescript
interface SizeChartModalProps {
  isOpen: boolean;
  onClose: () => void;
  sizeChart: SizeChartData;
}
```

### API Service Layer

#### **sizeChartAPI Service** (`src/utils/sizeChartAPI.ts`)
Comprehensive CRUD operations for size charts:

```typescript
- getAllSellerCharts(): GET /api/size-charts
- getChartById(chartId): GET /api/size-charts/:id
- createChart(data): POST /api/size-charts
- updateChart(chartId, data): PUT /api/size-charts/:id
- deleteChart(chartId): DELETE /api/size-charts/:id
- getChartsByCategory(category): GET /api/size-charts/category/:category
```

### Backend API Routes

#### **Size Charts Routes** (`server/routes/sizeCharts.js`)
RESTful endpoints with seller authorization:

**Endpoints:**
1. `GET /api/size-charts` - Get all charts for authenticated seller
2. `GET /api/size-charts/:id` - Get specific chart by ID
3. `GET /api/size-charts/category/:category` - Get seller's charts for specific category
4. `POST /api/size-charts` - Create new size chart
5. `PUT /api/size-charts/:id` - Update existing chart (seller ownership verified)
6. `DELETE /api/size-charts/:id` - Delete chart (seller ownership verified)

**Security Features:**
- All write operations require authentication
- Seller ownership verification on update/delete
- Category normalized to lowercase for consistency

### Page Integration

#### 1. **AddProductPage** (`src/pages/AddProductPage.tsx`)
Seller product creation/editing page:

**Features Added:**
- State management for size chart editor modal and seller's charts list
- `loadSellerSizeCharts()` - Fetches seller's existing charts on mount
- Size chart selection dropdown (shows when hasSize=true)
- "Create New Size Chart" button to open editor modal
- `handleSizeSizeChart()` - Saves new/edited chart and updates form
- Form submission includes `sizeChartId` when available
- Category-aware chart loading

**Size Chart Section UI:**
```
[If hasSize is true and subcategory selected]
├─ Size Chart Selection Section
│  ├─ Label with "📏 Size Chart" icon
│  ├─ Dropdown: existing charts for category
│  ├─ "Create New Chart" button (opens editor)
│  └─ Selected chart display
└─ Form field: sizeChartId
```

#### 2. **ProductDetailPage** (`src/pages/ProductDetailPage.tsx`)
Customer product viewing page:

**Features Added:**
- Loads size chart data from product's `sizeChartId` on mount
- Renders blue "📏 Size Chart" tag button next to size selection
- Clicking tag opens SizeChartModal with chart data
- Loading state during chart fetch
- Error handling with graceful fallback

**Customer UI:**
```
Size Selection Section
├─ Size dropdown/selector
└─ [Blue "📏 Size Chart" Tag] ← Click to view chart
    └─ Opens SizeChartModal on click
```

### Category-Specific Sizing

**CATEGORY_SIZES Mapping** (`src/data/productCatalog.ts`)
35+ product categories with appropriate size types:

**Examples:**
- **Clothing** (T-Shirts, Shirts, Dresses): XS, S, M, L, XL, XXL
- **Pants** (Jeans, Trousers, Shorts): 28-42 (numeric)
- **Shoes** (All types): 5-12 (numeric)
- **Accessories** (Caps, Scarves, Gloves): One Size
- **Jewelry** (Rings, Bracelets): One Size

**Product Filters** (`src/components/product/ProductFilters.tsx`)
- Dynamically loads sizes based on selected subcategory
- Falls back to full product sizes if category not in mapping
- Clears size selection when category/subcategory changes

## User Workflows

### Seller Workflow: Create Size Chart

1. Navigate to Add/Edit Product Page
2. Select category and subcategory (size options appear)
3. Check "Has Size Variants" checkbox
4. **Size Chart Section appears:**
   - Option to select existing chart from dropdown
   - OR click "Create New Chart" button
5. **SizeChartEditor Modal opens:**
   - Pre-filled with category-appropriate template
   - Edit headers and rows as needed
   - Click "Save Chart"
6. Chart is saved to MongoDB and appears in dropdown
7. Select chart to apply to product
8. Submit product form - sizeChartId is saved with product

### Seller Workflow: Reuse Size Chart

1. Navigate to Add Product Page
2. Select same category/subcategory
3. Size Chart section shows previously created charts
4. Select from dropdown
5. Chart is instantly applied to new product
6. Submit product - new product linked to same chart

### Customer Workflow: View Size Chart

1. Browse and click on product
2. On product detail page near size selection:
   - Blue "📏 Size Chart" tag visible if product has chart
3. Click tag to open SizeChartModal
4. View professional size chart table
5. Reference measurements when selecting size
6. Close modal and select size from dropdown

## Database Structure

### Size Chart Document Example
```json
{
  "_id": "ObjectId",
  "seller": "ObjectId(seller._id)",
  "name": "T-Shirt Size Chart",
  "category": "t-shirts",
  "headers": ["Size", "Chest (in)", "Length (in)", "Sleeve (in)"],
  "rows": [
    {
      "cells": ["XS", "34-36", "27-28", "31-32"]
    },
    {
      "cells": ["S", "36-38", "28-29", "32-33"]
    },
    // ... more rows
  ],
  "isDefault": true,
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z"
}
```

### Product Document Update
```json
{
  "_id": "ObjectId",
  "title": "Classic T-Shirt",
  "sizeChartId": "ObjectId(sizeChart._id)",
  "category": "clothing",
  "subcategory": "t-shirts",
  // ... other product fields
}
```

## Testing Checklist

### Frontend Testing
- [ ] Seller can open AddProductPage
- [ ] Size Chart section appears when hasSize=true and category selected
- [ ] "Create New Chart" button opens SizeChartEditor modal
- [ ] Can add/remove rows and columns in editor
- [ ] Can edit chart cells
- [ ] Chart saves and appears in dropdown
- [ ] Can select chart from dropdown
- [ ] Product form submits with sizeChartId
- [ ] Customer sees blue "📏 Size Chart" tag on ProductDetailPage
- [ ] Clicking tag opens SizeChartModal with correct data
- [ ] Modal closes properly

### Backend Testing
- [ ] GET /api/size-charts returns seller's charts only
- [ ] GET /api/size-charts/:id returns correct chart
- [ ] GET /api/size-charts/category/:category filters properly
- [ ] POST /api/size-charts creates chart and saves to DB
- [ ] PUT /api/size-charts/:id updates chart
- [ ] DELETE /api/size-charts/:id removes chart
- [ ] Authorization checks prevent unauthorized access
- [ ] Category is stored lowercase for consistency

### Integration Testing
- [ ] Create product → Save size chart → Product created with chartId
- [ ] Edit product → Change chart → Product updated correctly
- [ ] View product → See chart tag → Open modal → View data
- [ ] Seller reuses chart → Both products reference same chart
- [ ] Delete chart → Products remain (chart reference preserved)

## Common Issues & Solutions

### Issue: Size Chart not appearing in dropdown
**Solution:**
- Ensure category/subcategory selected before clicking "Create New Chart"
- Check browser console for API errors
- Verify seller is authenticated (req.user exists)

### Issue: Chart data not showing in modal
**Solution:**
- Verify product.sizeChartId is set in database
- Check network tab for failed chart fetch request
- Ensure SizeChart record exists with matching _id

### Issue: Size Chart modal appears blank
**Solution:**
- Check if sizeChartData is properly loaded
- Verify chart structure has headers and rows
- Check for JavaScript errors in console

## File References

**Frontend:**
- [src/components/product/SizeChartEditor.tsx](src/components/product/SizeChartEditor.tsx) - Chart creator
- [src/components/product/SizeChartModal.tsx](src/components/product/SizeChartModal.tsx) - Customer view
- [src/utils/sizeChartAPI.ts](src/utils/sizeChartAPI.ts) - API service
- [src/pages/AddProductPage.tsx](src/pages/AddProductPage.tsx) - Seller integration
- [src/pages/ProductDetailPage.tsx](src/pages/ProductDetailPage.tsx) - Customer integration
- [src/data/productCatalog.ts](src/data/productCatalog.ts) - Category mappings

**Backend:**
- [server/models/SizeChart.js](server/models/SizeChart.js) - Database model
- [server/models/Product.js](server/models/Product.js) - Updated with sizeChartId
- [server/routes/sizeCharts.js](server/routes/sizeCharts.js) - API routes
- [server/server.js](server/server.js) - Route registration

## Environment Requirements

- Node.js runtime with Express.js server
- MongoDB database connection
- React frontend with TypeScript
- Zustand for state management
- Authentication middleware (isAuthenticated)
- CORS enabled for API requests

## Next Steps

1. **Testing:** Run full end-to-end test workflow
2. **UI Refinement:** Gather user feedback on editor UX
3. **Advanced Features:** Consider default charts per category
4. **Bulk Operations:** Allow uploading CSV size charts
5. **Analytics:** Track most-used size chart measurements
