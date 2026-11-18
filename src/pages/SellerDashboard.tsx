import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Package, DollarSign, TrendingUp, Edit, Trash2, BarChart3, PieChart, Calendar, Target, ShoppingCart, Star, Users, Eye, MessageCircle, Truck, CheckCircle, XCircle, Clock, PackageCheck, RotateCcw } from 'lucide-react';
import { useProductStore } from '../store/productStore';
import { useAuthStore } from '../store/authStore';
import { useOrderStore } from '../store/orderStore';
import { useCurrencyStore } from '../store/currencyStore';
import { ChatDashboard } from '../components/chat/ChatDashboard';
import { FloatingChatButton } from '../components/chat/FloatingChatButton';
import { PRODUCT_CATEGORIES } from '../data/productCatalog';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const getCustomerName = (customer: any) => {
  if (!customer) return 'Unknown Customer';
  if (customer.name) return customer.name;

  const fullName = [customer.firstName, customer.lastName].filter(Boolean).join(' ');
  return fullName || 'Unknown Customer';
};

const isProductSoldOut = (product: any) => {
  if (product?.isSoldOut) return true;
  if (!Array.isArray(product?.variants) || product.variants.length === 0) return false;

  return product.variants.reduce((sum: number, variant: any) => sum + Number(variant.stock || 0), 0) <= 0;
};

const SellerDashboard = () => {
  const { user } = useAuthStore();
  const { products, fetchSellerProducts, updateProduct } = useProductStore();
  const { orders, fetchSellerOrders } = useOrderStore();
  const { formatPrice } = useCurrencyStore();
  const [activeTab, setActiveTab] = useState('overview');
  const [analyticsTimeFrame, setAnalyticsTimeFrame] = useState('30d');
  const [analyticsCategory, setAnalyticsCategory] = useState('all');
  const [restockQuantities, setRestockQuantities] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchSellerProducts();
    fetchSellerOrders();
  }, [fetchSellerProducts, fetchSellerOrders]);

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipping': return 'text-blue-600 bg-blue-100';
      case 'packing': return 'text-purple-600 bg-purple-100';
      case 'confirmed': return 'text-indigo-600 bg-indigo-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'returned': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  // Enhanced seller analytics
  const calculateSellerStats = () => {
    // Ensure orders is an array
    const ordersList = Array.isArray(orders) ? orders : [];
    const totalOrders = ordersList.length;
    const totalRevenue = ordersList.reduce((acc, order) => acc + (order.total || 0), 0);
    const totalProducts = products.length;

    // Calculate profit (assuming 30% profit margin)
    const totalProfit = totalRevenue * 0.3;

    // Calculate per product analytics
    const productSales = products.map(product => {
      const productOrders = ordersList.filter(order =>
        order.items && order.items.some(item => item.productId === product.id || item.productId === product._id)
      );
      const productRevenue = productOrders.reduce((acc, order) => {
        const productItems = order.items.filter(item => item.productId === product.id || item.productId === product._id);
        return acc + productItems.reduce((itemAcc, item) => itemAcc + (item.price * item.quantity), 0);
      }, 0);

      return {
        ...product,
        orderCount: productOrders.length,
        revenue: productRevenue,
        profit: productRevenue * 0.3
      };
    }).sort((a, b) => b.revenue - a.revenue);

    // Calculate monthly data (mock for last 6 months)
    const monthlyData = [
      { month: 'Jan', orders: Math.floor(totalOrders * 0.15), revenue: totalRevenue * 0.15, profit: totalProfit * 0.15 },
      { month: 'Feb', orders: Math.floor(totalOrders * 0.12), revenue: totalRevenue * 0.12, profit: totalProfit * 0.12 },
      { month: 'Mar', orders: Math.floor(totalOrders * 0.18), revenue: totalRevenue * 0.18, profit: totalProfit * 0.18 },
      { month: 'Apr', orders: Math.floor(totalOrders * 0.20), revenue: totalRevenue * 0.20, profit: totalProfit * 0.20 },
      { month: 'May', orders: Math.floor(totalOrders * 0.17), revenue: totalRevenue * 0.17, profit: totalProfit * 0.17 },
      { month: 'Jun', orders: Math.floor(totalOrders * 0.18), revenue: totalRevenue * 0.18, profit: totalProfit * 0.18 }
    ];

    return {
      totalProducts,
      totalOrders,
      totalRevenue,
      totalProfit,
      averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      monthlyGrowth: 12.5,
      productSales,
      monthlyData,
      topProducts: productSales.slice(0, 5),
      recentOrders: ordersList.slice(0, 5).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    };
  };

  const sellerStats = calculateSellerStats();
  const handleSoldOutToggle = async (product: any) => {
    const productId = product._id || product.id;
    if (!productId) return;

    try {
      const currentlySoldOut = isProductSoldOut(product);

      if (currentlySoldOut) {
        const restockQuantity = Number(restockQuantities[String(productId)] || 0);

        if (!Number.isFinite(restockQuantity) || restockQuantity <= 0) {
          toast.error('Enter stock quantity before marking available');
          return;
        }

        const variants = Array.isArray(product.variants) && product.variants.length > 0
          ? product.variants.map((variant: any) => ({ ...variant, stock: restockQuantity }))
          : [{ size: 'One Size', color: 'Black', stock: restockQuantity, price: product.basePrice || product.price || 0 }];

        await updateProduct(productId, { isSoldOut: false, variants });
        setRestockQuantities(prev => ({ ...prev, [String(productId)]: '' }));
        toast.success('Product restocked and marked available');
      } else {
        const variants = Array.isArray(product.variants)
          ? product.variants.map((variant: any) => ({ ...variant, stock: 0 }))
          : [];

        await updateProduct(productId, { isSoldOut: true, variants });
        toast.success('Product marked as sold out');
      }
      fetchSellerProducts();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update product status');
    }
  };
  const productLookup = new Map(products.map((product: any) => [String(product._id || product.id), product]));
  const getProductForItem = (item: any) => {
    const productId = String(item.productId?._id || item.productId || item.product?._id || item.product || '');
    return productLookup.get(productId);
  };
  const getItemAmount = (item: any) => Number(item.total || ((item.price || 0) * (item.quantity || 1)) || 0);
  const getTimeFrameStart = () => {
    if (analyticsTimeFrame === 'all') return null;
    const daysByFrame: Record<string, number> = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365,
    };
    const days = daysByFrame[analyticsTimeFrame] || 30;
    const start = new Date();
    start.setDate(start.getDate() - days);
    start.setHours(0, 0, 0, 0);
    return start;
  };
  const analyticsCategoryGroups = PRODUCT_CATEGORIES.map(category => ({
    label: category.label,
    categoryValue: `category:${category.value}`,
    subcategories: Array.from(new Set(category.groups.flatMap(group => group.items))).sort((a, b) => a.localeCompare(b)),
  }));
  const analytics = (() => {
    const ordersList = Array.isArray(orders) ? orders : [];
    const startDate = getTimeFrameStart();
    const filteredOrders = ordersList.filter(order => {
      const orderDate = new Date(order.createdAt || Date.now());
      return !startDate || orderDate >= startDate;
    });
    const entries = filteredOrders.flatMap(order => {
      const orderDate = new Date(order.createdAt || Date.now());
      return (order.items || []).map((item: any) => {
        const product = getProductForItem(item);
        return {
          order,
          item,
          product,
          date: orderDate,
          amount: getItemAmount(item),
          quantity: Number(item.quantity || 1),
          title: item.title || product?.title || product?.name || 'Product',
          category: product?.category || 'uncategorized',
          subcategory: product?.subcategory || 'Uncategorized',
        };
      });
    }).filter(entry => {
      if (analyticsCategory === 'all') return true;
      const [type, value] = analyticsCategory.split(':');
      return type === 'category' ? entry.category === value : entry.subcategory === value;
    });

    const revenue = entries.reduce((sum, entry) => sum + entry.amount, 0);
    const units = entries.reduce((sum, entry) => sum + entry.quantity, 0);
    const orderIds = new Set(entries.map(entry => entry.order._id || entry.order.id));
    const bucketCount = analyticsTimeFrame === '7d' ? 7 : analyticsTimeFrame === '90d' ? 6 : analyticsTimeFrame === '1y' || analyticsTimeFrame === 'all' ? 12 : 5;
    const buckets = Array.from({ length: bucketCount }, (_, index) => {
      const date = new Date();
      if (analyticsTimeFrame === '1y' || analyticsTimeFrame === 'all') {
        date.setMonth(date.getMonth() - (bucketCount - 1 - index));
        return { label: date.toLocaleString('en-US', { month: 'short' }), revenue: 0, orders: new Set<string>(), units: 0 };
      }
      const span = analyticsTimeFrame === '90d' ? 15 : analyticsTimeFrame === '30d' ? 6 : 1;
      date.setDate(date.getDate() - ((bucketCount - 1 - index) * span));
      return { label: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }), revenue: 0, orders: new Set<string>(), units: 0 };
    });
    entries.forEach(entry => {
      const orderId = String(entry.order._id || entry.order.id || entry.date.getTime());
      let index = buckets.length - 1;
      if (analyticsTimeFrame === '1y' || analyticsTimeFrame === 'all') {
        const monthDiff = (new Date().getFullYear() - entry.date.getFullYear()) * 12 + (new Date().getMonth() - entry.date.getMonth());
        index = buckets.length - 1 - monthDiff;
      } else {
        const dayDiff = Math.floor((Date.now() - entry.date.getTime()) / 86400000);
        const span = analyticsTimeFrame === '90d' ? 15 : analyticsTimeFrame === '30d' ? 6 : 1;
        index = buckets.length - 1 - Math.floor(dayDiff / span);
      }
      if (index >= 0 && index < buckets.length) {
        buckets[index].revenue += entry.amount;
        buckets[index].orders.add(orderId);
        buckets[index].units += entry.quantity;
      }
    });
    const productMap = new Map<string, any>();
    const categoryMap = new Map<string, any>();
    entries.forEach(entry => {
      const productKey = String(entry.product?._id || entry.product?.id || entry.title);
      const productData = productMap.get(productKey) || { title: entry.title, revenue: 0, units: 0, orders: new Set<string>() };
      productData.revenue += entry.amount;
      productData.units += entry.quantity;
      productData.orders.add(String(entry.order._id || entry.order.id));
      productMap.set(productKey, productData);

      const categoryLabel = entry.subcategory || entry.category;
      const categoryData = categoryMap.get(categoryLabel) || { label: categoryLabel, revenue: 0, units: 0 };
      categoryData.revenue += entry.amount;
      categoryData.units += entry.quantity;
      categoryMap.set(categoryLabel, categoryData);
    });

    return {
      revenue,
      units,
      orders: orderIds.size,
      averageOrderValue: orderIds.size ? revenue / orderIds.size : 0,
      profit: revenue * 0.3,
      buckets: buckets.map(bucket => ({ ...bucket, orders: bucket.orders.size })),
      topProducts: Array.from(productMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6).map(product => ({ ...product, orders: product.orders.size })),
      categoryBreakdown: Array.from(categoryMap.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 6),
      statusCounts: filteredOrders.reduce((acc: Record<string, number>, order) => {
        acc[order.status || 'pending'] = (acc[order.status || 'pending'] || 0) + 1;
        return acc;
      }, {}),
    };
  })();
  const maxBucketRevenue = Math.max(...analytics.buckets.map(bucket => bucket.revenue), 1);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'products', label: 'Products', icon: Package },
    { id: 'orders', label: 'Orders', icon: ShoppingCart },
    { id: 'messages', label: 'Messages', icon: MessageCircle },
    { id: 'analytics', label: 'Analytics', icon: PieChart },
    { id: 'performance', label: 'Performance', icon: Target }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Header */}
        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
                Welcome to your Store, {user?.name}! 🏪
              </h1>
              <p className="text-gray-600">Manage your products and grow your business</p>
            </div>

            {/* Quick Stats - Responsive */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 lg:flex lg:items-center lg:space-x-6">
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-green-600">{sellerStats.totalProducts}</div>
                <div className="text-xs md:text-sm text-gray-600">Products</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-blue-600">{sellerStats.totalOrders}</div>
                <div className="text-xs md:text-sm text-gray-600">Orders</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-yellow-600">{formatPrice(sellerStats.totalRevenue)}</div>
                <div className="text-xs md:text-sm text-gray-600">Revenue</div>
              </div>
              <div className="text-center">
                <div className="text-xl md:text-2xl font-bold text-purple-600">{formatPrice(sellerStats.totalProfit)}</div>
                <div className="text-xs md:text-sm text-gray-600">Profit</div>
              </div>
            </div>
          </div>
        </div>

      <div className="flex items-center justify-between mb-8">
        <h2 className="text-2xl font-semibold text-gray-900">Store Management</h2>
        <Link to="/seller/products/new" className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2">
          <Plus className="h-5 w-5" />
          <span>Add Product</span>
        </Link>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="flex flex-wrap space-x-4 md:space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-2 md:px-4 border-b-2 font-medium text-sm transition-colors flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-green-500 text-green-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-8">
          {/* Enhanced Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-6">
            {/* Total Products */}
            <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm font-medium">Total Products</p>
                  <p className="text-2xl md:text-3xl font-bold">{sellerStats.totalProducts}</p>
                  <p className="text-green-200 text-xs mt-1">Active listings</p>
                </div>
                <Package className="h-8 w-8 text-green-200" />
              </div>
            </div>

            {/* Total Orders */}
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Total Orders</p>
                  <p className="text-2xl md:text-3xl font-bold">{sellerStats.totalOrders}</p>
                  <p className="text-blue-200 text-xs mt-1">All time</p>
                </div>
                <ShoppingCart className="h-8 w-8 text-blue-200" />
              </div>
            </div>

            {/* Total Revenue */}
            <div className="bg-gradient-to-r from-yellow-500 to-yellow-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-yellow-100 text-sm font-medium">Total Revenue</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatPrice(sellerStats.totalRevenue)}</p>
                  <p className="text-yellow-200 text-xs mt-1">Gross sales</p>
                </div>
                <DollarSign className="h-8 w-8 text-yellow-200" />
              </div>
            </div>

            {/* Total Profit */}
            <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm font-medium">Total Profit</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatPrice(sellerStats.totalProfit)}</p>
                  <p className="text-purple-200 text-xs mt-1">30% margin</p>
                </div>
                <Target className="h-8 w-8 text-purple-200" />
              </div>
            </div>

            {/* Average Order Value */}
            <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-2xl shadow-lg p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-indigo-100 text-sm font-medium">Avg Order Value</p>
                  <p className="text-2xl md:text-3xl font-bold">{formatPrice(sellerStats.averageOrderValue)}</p>
                  <p className="text-indigo-200 text-xs mt-1">Per order</p>
                </div>
                <TrendingUp className="h-8 w-8 text-indigo-200" />
              </div>
            </div>
          </div>

          {/* Top Performing Products */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Star className="h-5 w-5 text-yellow-500 mr-2" />
                  Top Performing Products
                </h3>
              </div>
              <div className="p-6">
                {sellerStats.topProducts.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No product sales data available</p>
                ) : (
                  <div className="space-y-4">
                    {sellerStats.topProducts.map((product, index) => (
                      <div key={product.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                        <div className="flex items-center space-x-4">
                          <div className="flex-shrink-0">
                            <span className="inline-flex items-center justify-center h-8 w-8 rounded-full bg-green-100 text-green-800 text-sm font-medium">
                              #{index + 1}
                            </span>
                          </div>
                          <div>
                            <h4 className="text-sm font-medium text-gray-900">{product.name || product.title}</h4>
                            <p className="text-xs text-gray-500">{product.orderCount} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-semibold text-gray-900">{formatPrice(product.revenue)}</p>
                          <p className="text-xs text-green-600">+{formatPrice(product.profit)} profit</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Monthly Performance */}
            <div className="bg-white rounded-2xl shadow-sm">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Calendar className="h-5 w-5 text-blue-500 mr-2" />
                  Monthly Performance
                </h3>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {sellerStats.monthlyData.map((month, index) => (
                    <div key={month.month} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                        <span className="text-sm font-medium text-gray-900">{month.month} 2025</span>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-gray-900">{month.orders} orders</p>
                        <p className="text-xs text-gray-500">{formatPrice(month.revenue)} revenue</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Recent Orders */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                  <ShoppingCart className="h-5 w-5 text-green-500 mr-2" />
                  Recent Orders
                </h3>
                <button
                  onClick={() => setActiveTab('orders')}
                  className="text-green-600 hover:text-green-700 font-medium text-sm"
                >
                  View All
                </button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Product
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {orders.map((order) => (
                    <tr key={order._id || order.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        #{order.id}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {getCustomerName(order.customer)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {order.items.map(item => item.title).join(', ')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {formatPrice(order.total)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Products Tab */}
      {activeTab === 'products' && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-2xl font-semibold text-gray-900">Your Products</h3>
            <Link
              to="/seller/products/new"
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="h-5 w-5" />
              <span>Add New Product</span>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {sellerStats.productSales.map((product) => {
              const salesData = sellerStats.productSales.find(p => p.id === product.id) || { orderCount: 0, revenue: 0, profit: 0 };
              const productSoldOut = isProductSoldOut(product);
              return (
                <div key={product.id} className="bg-white rounded-2xl shadow-sm overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={(() => {
                        console.log(`\n🏪 Seller Dashboard - Product: "${product.name || product.title}"`);
                        console.log('📦 Product ID:', product.id);
                        console.log('🎨 Images:', JSON.stringify(product.images, null, 2));

                        // Find primary image
                        const primaryImage = product.images?.find((img: any) =>
                          typeof img === 'object' && img.isPrimary === true
                        );
                        if (primaryImage) {
                          console.log('✅ Using primary:', primaryImage.url);
                          return primaryImage.url;
                        }

                        // Fallback to first image
                        const firstImage = product.images?.[0];
                        const url = typeof firstImage === 'string' ? firstImage : firstImage?.url || 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400';
                        console.log('⚠️ No primary, using:', url);
                        return url;
                      })()}
                      alt={product.name}
                      className="w-full h-48 object-cover"
                      onError={(e) => {
                        console.error('❌ Image failed to load for:', product.name, e.currentTarget.src);
                        e.currentTarget.src = 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=400';
                      }}
                    />
                    {salesData.orderCount > 0 && (
                      <div className="absolute top-2 right-2 bg-green-500 text-white px-2 py-1 rounded-full text-xs font-medium">
                        {salesData.orderCount} sold
                      </div>
                    )}
                    {productSoldOut && (
                      <div className="absolute top-2 left-2 bg-red-600 text-white px-2 py-1 rounded-full text-xs font-medium">
                        Sold Out
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <h4 className="font-semibold text-gray-900 mb-2">{product.name || product.title}</h4>
                    <p className="text-purple-600 font-bold mb-3">{formatPrice(product.price || product.basePrice || 0)}</p>

                    {/* Sales Performance */}
                    <div className="bg-gray-50 rounded-lg p-3 mb-3">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="text-center">
                          <p className="text-gray-500">Orders</p>
                          <p className="font-semibold text-gray-900">{salesData.orderCount}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-gray-500">Revenue</p>
                          <p className="font-semibold text-green-600">{formatPrice(salesData.revenue)}</p>
                        </div>
                      </div>
                    </div>

                    {productSoldOut && (
                      <div className="mb-3">
                        <label className="block text-xs font-medium text-gray-600 mb-1">
                          Restock quantity per variant
                        </label>
                        <input
                          type="number"
                          min="1"
                          value={restockQuantities[String(product._id || product.id)] || ''}
                          onChange={(e) => setRestockQuantities(prev => ({
                            ...prev,
                            [String(product._id || product.id)]: e.target.value,
                          }))}
                          placeholder="Enter stock to restock"
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                        />
                      </div>
                    )}

                    <div className="flex space-x-2">
                      <Link
                        to={`/seller/products/${product._id || product.id}/edit`}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-3 rounded-lg hover:bg-gray-200 transition-colors flex items-center justify-center space-x-1"
                      >
                        <Edit className="h-4 w-4" />
                        <span>Edit</span>
                      </Link>
                      <Link
                        to={`/product/${product._id || product.id}`}
                        className="bg-blue-100 text-blue-700 py-2 px-3 rounded-lg hover:bg-blue-200 transition-colors"
                        title="View product"
                      >
                        <Eye className="h-4 w-4" />
                      </Link>
                      <button className="bg-red-100 text-red-700 py-2 px-3 rounded-lg hover:bg-red-200 transition-colors">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleSoldOutToggle(product)}
                      className={`mt-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                        productSoldOut
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-red-100 text-red-700 hover:bg-red-200'
                      }`}
                    >
                      {productSoldOut ? 'Restock' : 'Mark as Sold Out'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Messages Tab */}
      {activeTab === 'messages' && (
        <div>
          <ChatDashboard />
        </div>
      )}

      {/* Orders Tab */}
      {activeTab === 'orders' && <OrdersTab orders={Array.isArray(orders) ? orders : []} fetchSellerOrders={fetchSellerOrders} />}

      {/* Analytics Tab */}
      {activeTab === 'analytics' && (
        <div className="space-y-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h3 className="text-2xl font-semibold text-gray-900">Sales Analytics</h3>
              <p className="text-sm text-gray-600 mt-1">Track sales by time frame and product category.</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Time frame</label>
                <select
                  value={analyticsTimeFrame}
                  onChange={(e) => setAnalyticsTimeFrame(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                >
                  <option value="7d">Last 7 days</option>
                  <option value="30d">Last 30 days</option>
                  <option value="90d">Last 90 days</option>
                  <option value="1y">Last 12 months</option>
                  <option value="all">All time</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Category / subcategory</label>
                <select
                  value={analyticsCategory}
                  onChange={(e) => setAnalyticsCategory(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-green-500 focus:ring-2 focus:ring-green-200"
                >
                  <option value="all">All Categories</option>
                  {analyticsCategoryGroups.map(group => (
                    <optgroup key={group.label} label={group.label}>
                      <option value={group.categoryValue}>All {group.label}</option>
                      {group.subcategories.map(subcategory => (
                        <option key={`${group.label}-${subcategory}`} value={`subcategory:${subcategory}`}>
                          {subcategory}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4">
            {[
              { label: 'Sales Revenue', value: formatPrice(analytics.revenue), icon: DollarSign, color: 'text-green-600 bg-green-50' },
              { label: 'Orders', value: analytics.orders, icon: ShoppingCart, color: 'text-blue-600 bg-blue-50' },
              { label: 'Units Sold', value: analytics.units, icon: Package, color: 'text-indigo-600 bg-indigo-50' },
              { label: 'Avg Order Value', value: formatPrice(analytics.averageOrderValue), icon: TrendingUp, color: 'text-purple-600 bg-purple-50' },
              { label: 'Estimated Profit', value: formatPrice(analytics.profit), icon: Target, color: 'text-emerald-600 bg-emerald-50' },
            ].map((metric) => {
              const Icon = metric.icon;
              return (
                <div key={metric.label} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-gray-500">{metric.label}</p>
                      <p className="text-2xl font-bold text-gray-900 mt-1">{metric.value}</p>
                    </div>
                    <div className={`h-11 w-11 rounded-lg flex items-center justify-center ${metric.color}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h4 className="text-lg font-semibold text-gray-900">Total Sales by Time Frame</h4>
                  <p className="text-sm text-gray-500">Revenue trend for selected filters</p>
                </div>
                <BarChart3 className="h-5 w-5 text-green-600" />
              </div>
              <div className="h-72 flex items-end gap-3 border-b border-gray-200 pb-4">
                {analytics.buckets.map(bucket => (
                  <div key={bucket.label} className="flex-1 flex flex-col items-center justify-end gap-2 h-full">
                    <div className="text-xs font-medium text-gray-500">{formatPrice(bucket.revenue)}</div>
                    <div
                      className="w-full max-w-12 rounded-t-lg bg-gradient-to-t from-green-600 to-emerald-300 transition-all"
                      style={{ height: `${Math.max((bucket.revenue / maxBucketRevenue) * 85, bucket.revenue > 0 ? 8 : 2)}%` }}
                      title={`${bucket.label}: ${formatPrice(bucket.revenue)}, ${bucket.orders} orders`}
                    />
                    <div className="text-xs text-gray-500 text-center">{bucket.label}</div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-5">Order Status</h4>
              <div className="space-y-3">
                {Object.entries(analytics.statusCounts).length === 0 ? (
                  <p className="text-sm text-gray-500">No orders in this selection.</p>
                ) : Object.entries(analytics.statusCounts).map(([status, count]) => (
                  <div key={status} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(status)}`}>{status}</span>
                    <span className="font-semibold text-gray-900">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-5">Category Breakdown</h4>
              <div className="space-y-4">
                {analytics.categoryBreakdown.length === 0 ? (
                  <p className="text-sm text-gray-500">No category sales yet.</p>
                ) : analytics.categoryBreakdown.map(category => (
                  <div key={category.label}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-800">{category.label}</span>
                      <span className="text-gray-600">{formatPrice(category.revenue)} · {category.units} units</span>
                    </div>
                    <div className="h-2 rounded-full bg-gray-100">
                      <div
                        className="h-2 rounded-full bg-blue-500"
                        style={{ width: `${Math.min((category.revenue / (analytics.revenue || 1)) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h4 className="text-lg font-semibold text-gray-900 mb-5">Top Products</h4>
              <div className="space-y-3">
                {analytics.topProducts.length === 0 ? (
                  <p className="text-sm text-gray-500">No product sales for this filter.</p>
                ) : analytics.topProducts.map((product, index) => (
                  <div key={`${product.title}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">{product.title}</p>
                      <p className="text-xs text-gray-500">{product.units} units · {product.orders} orders</p>
                    </div>
                    <p className="font-semibold text-green-600">{formatPrice(product.revenue)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-gray-100">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="h-5 w-5 text-green-500 mr-2" />
                Product Performance Analysis
              </h4>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Orders</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Units</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Performance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {analytics.topProducts.map((product, index) => (
                    <tr key={`${product.title}-${index}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 rounded-lg mr-3 bg-green-50 text-green-600 flex items-center justify-center font-bold">{index + 1}</div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{product.title}</p>
                            <p className="text-xs text-gray-500">Filtered analytics</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.orders}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{product.units}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{formatPrice(product.revenue)}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-16 bg-gray-200 rounded-full h-2 mr-2">
                            <div
                              className="bg-green-500 h-2 rounded-full"
                              style={{ width: `${Math.min((product.revenue / (analytics.revenue || 1)) * 100, 100)}%` }}
                            ></div>
                          </div>
                          <span className="text-xs text-gray-500">
                            {((product.revenue / (analytics.revenue || 1)) * 100).toFixed(1)}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Performance Tab */}
      {activeTab === 'performance' && (
        <div className="space-y-8">
          <h3 className="text-2xl font-semibold text-gray-900 mb-6">Vendor Performance Dashboard</h3>

          {/* Performance Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-green-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Store Rating</p>
                  <div className="flex items-center space-x-1 mt-1">
                    <Star className="h-5 w-5 text-yellow-400 fill-current" />
                    <span className="text-2xl font-bold text-gray-900">4.8</span>
                    <span className="text-sm text-gray-500">/5.0</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Based on {sellerStats.totalOrders} orders</p>
                </div>
                <Star className="h-8 w-8 text-yellow-400" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-blue-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Response Time</p>
                  <p className="text-2xl font-bold text-gray-900">2.4h</p>
                  <p className="text-xs text-gray-500 mt-1">Average response</p>
                </div>
                <Calendar className="h-8 w-8 text-blue-500" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-purple-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Return Rate</p>
                  <p className="text-2xl font-bold text-gray-900">2.1%</p>
                  <p className="text-xs text-gray-500 mt-1">Very low</p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-500" />
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm p-6 border-l-4 border-orange-500">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Fulfillment Rate</p>
                  <p className="text-2xl font-bold text-gray-900">98.5%</p>
                  <p className="text-xs text-gray-500 mt-1">Excellent</p>
                </div>
                <Target className="h-8 w-8 text-orange-500" />
              </div>
            </div>
          </div>

          {/* Monthly Trends */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 text-blue-500 mr-2" />
                Monthly Sales Trends
              </h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {sellerStats.monthlyData.map((month, index) => (
                  <div key={month.month} className="text-center p-4 bg-gray-50 rounded-lg">
                    <p className="text-sm font-medium text-gray-900">{month.month}</p>
                    <p className="text-lg font-bold text-blue-600">{month.orders}</p>
                    <p className="text-xs text-gray-500">orders</p>
                    <p className="text-sm font-semibold text-green-600 mt-1">{formatPrice(month.revenue)}</p>
                    <p className="text-xs text-gray-500">revenue</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Vendor Insights */}
          <div className="bg-white rounded-2xl shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <h4 className="text-lg font-semibold text-gray-900 flex items-center">
                <Users className="h-5 w-5 text-purple-500 mr-2" />
                Vendor Performance Insights
              </h4>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900">Store Performance</h5>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                      <span className="text-sm text-gray-700">Products with Sales</span>
                      <span className="font-semibold text-green-600">
                        {sellerStats.productSales.filter(p => p.orderCount > 0).length} / {sellerStats.totalProducts}
                      </span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                      <span className="text-sm text-gray-700">Best Selling Category</span>
                      <span className="font-semibold text-blue-600">Fashion</span>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                      <span className="text-sm text-gray-700">Peak Sales Month</span>
                      <span className="font-semibold text-purple-600">
                        {sellerStats.monthlyData.reduce((max, month) => month.revenue > max.revenue ? month : max, sellerStats.monthlyData[0]).month}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <h5 className="font-semibold text-gray-900">Growth Opportunities</h5>
                  <div className="space-y-3">
                    <div className="p-3 bg-yellow-50 rounded-lg">
                      <p className="text-sm font-medium text-yellow-800">Inventory Optimization</p>
                      <p className="text-xs text-yellow-600 mt-1">
                        {sellerStats.productSales.filter(p => p.orderCount === 0).length} products have no sales
                      </p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm font-medium text-blue-800">Revenue Potential</p>
                      <p className="text-xs text-blue-600 mt-1">
                        Increase avg order value by 15% = +{formatPrice(sellerStats.totalRevenue * 0.15)}
                      </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-800">Performance Score</p>
                      <p className="text-xs text-green-600 mt-1">
                        Excellent seller - Top 10% performance
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Floating Chat Button */}
    <FloatingChatButton />
    </div>
  );
};

// Orders Tab Component
const OrdersTab: React.FC<{ orders: any[]; fetchSellerOrders: () => void }> = ({ orders, fetchSellerOrders }) => {
  const { formatPrice } = useCurrencyStore();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [trackingNumber, setTrackingNumber] = useState('');
  const [carrier, setCarrier] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Debug: Log orders prop
  useEffect(() => {
    console.log('📋 OrdersTab - Received orders:', orders, 'Is Array:', Array.isArray(orders));
  }, [orders]);

  // Helper function for status colors
  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'delivered': return 'text-green-600 bg-green-100';
      case 'shipping': return 'text-blue-600 bg-blue-100';
      case 'packing': return 'text-purple-600 bg-purple-100';
      case 'confirmed': return 'text-indigo-600 bg-indigo-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'returned': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const updateOrderStatus = async (orderId: string, status: string) => {
    try {
      const token = localStorage.getItem('token');
      const payload: any = { status };

      if (status === 'shipping') {
        if (!trackingNumber || !carrier) {
          toast.error('Please provide tracking number and carrier');
          return;
        }
        payload.trackingNumber = trackingNumber;
        payload.carrier = carrier;
      }

      await axios.put(
        `http://localhost:5000/api/seller/orders/${orderId}/status`,
        payload,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success('Order status updated successfully');
      setShowStatusModal(false);
      setSelectedOrder(null);
      setTrackingNumber('');
      setCarrier('');
      fetchSellerOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to update order status');
    }
  };

  const handleReturnRequest = async (orderId: string, approve: boolean, note?: string) => {
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `http://localhost:5000/api/seller/orders/${orderId}/return`,
        { approve, note },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      toast.success(approve ? 'Return approved' : 'Return rejected');
      fetchSellerOrders();
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to process return');
    }
  };

  const getNextStatus = (currentStatus: string) => {
    const statusFlow: { [key: string]: string } = {
      'pending': 'confirmed',
      'confirmed': 'packing',
      'packing': 'shipping',
      'shipping': 'delivered',
    };
    return statusFlow[currentStatus];
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'confirmed': return <CheckCircle className="h-4 w-4" />;
      case 'packing': return <PackageCheck className="h-4 w-4" />;
      case 'shipping': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      case 'returned': return <RotateCcw className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  // Ensure orders is always an array
  const safeOrders = Array.isArray(orders) ? orders : [];
  const filteredOrders = filterStatus === 'all'
    ? safeOrders
    : safeOrders.filter(order => order.status === filterStatus);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-2xl font-semibold text-gray-900">Manage Orders</h3>

        {/* Status Filter */}
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="border border-gray-300 rounded-lg px-4 py-2 focus:ring-2 focus:ring-green-500"
        >
          <option value="all">All Orders</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="packing">Packing</option>
          <option value="shipping">Shipping</option>
          <option value="delivered">Delivered</option>
          <option value="returned">Returned</option>
        </select>
      </div>

      {/* Order Cards */}
      <div className="grid grid-cols-1 gap-4">
        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-2xl shadow-sm p-8 text-center">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No orders found</p>
          </div>
        ) : (
          filteredOrders.map((order) => (
            <div key={order._id || order.id} className="bg-white rounded-2xl shadow-sm p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                {/* Order Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h4 className="font-semibold text-gray-900">
                      Order #{order.orderNumber || order._id?.slice(-8)}
                    </h4>
                    <span className={`px-3 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(order.status)}`}>
                      {getStatusIcon(order.status)}
                      {order.status}
                    </span>
                    {order.returnRequested && !order.returnApproved && (
                      <span className="px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                        Return Requested
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Customer</p>
                      <p className="font-medium text-gray-900">{getCustomerName(order.customer)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Items</p>
                      <p className="font-medium text-gray-900">{order.items?.length || 0} products</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Total</p>
                      <p className="font-medium text-gray-900">{formatPrice(order.total)}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Date</p>
                      <p className="font-medium text-gray-900">
                        {new Date(order.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  </div>

                  {order.trackingNumber && (
                    <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                      <p className="text-sm text-blue-900">
                        <strong>Tracking:</strong> {order.trackingNumber} ({order.carrier})
                      </p>
                    </div>
                  )}

                  {/* Return Request Info */}
                  {order.returnRequested && order.returnReason && (
                    <div className="mt-3 p-4 bg-orange-50 border border-orange-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <RotateCcw className="h-5 w-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-orange-900 mb-1">Return Reason:</p>
                          <p className="text-sm text-orange-800">{order.returnReason}</p>
                          {order.returnRequestedAt && (
                            <p className="text-xs text-orange-600 mt-1">
                              Requested on: {new Date(order.returnRequestedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col gap-2 lg:w-48">
                  {order.returnRequested && !order.returnApproved && (
                    <>
                      <button
                        onClick={() => handleReturnRequest(order._id || order.id, true)}
                        className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Approve Return
                      </button>
                      <button
                        onClick={() => handleReturnRequest(order._id || order.id, false)}
                        className="w-full bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm"
                      >
                        Reject Return
                      </button>
                    </>
                  )}

                  {!order.returnRequested && order.status !== 'delivered' && order.status !== 'cancelled' && (
                    <button
                      onClick={() => {
                        setSelectedOrder(order);
                        setShowStatusModal(true);
                      }}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors text-sm flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      Update Status
                    </button>
                  )}

                  {order.status === 'delivered' && (
                    <div className="w-full bg-green-100 text-green-800 px-4 py-2 rounded-lg text-sm text-center font-medium">
                      Order Completed
                    </div>
                  )}
                </div>
              </div>

              {/* Order Items */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">Order Items:</p>
                <div className="flex flex-wrap gap-2">
                  {order.items?.map((item: any, index: number) => (
                    <div key={index} className="text-xs bg-gray-100 px-3 py-1 rounded-full">
                      {item.title} x{item.quantity}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Status Update Modal */}
      {showStatusModal && selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">
              Update Order Status
            </h3>

            <div className="space-y-4">
              <div>
                <p className="text-sm text-gray-600 mb-2">Current Status:</p>
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedOrder.status)}`}>
                  {selectedOrder.status}
                </span>
              </div>

              <div className="space-y-2">
                <button
                  onClick={() => updateOrderStatus(selectedOrder._id || selectedOrder.id, 'confirmed')}
                  disabled={selectedOrder.status !== 'pending'}
                  className="w-full bg-indigo-600 text-white px-4 py-3 rounded-lg hover:bg-indigo-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Confirm Order
                </button>

                <button
                  onClick={() => updateOrderStatus(selectedOrder._id || selectedOrder.id, 'packing')}
                  disabled={selectedOrder.status !== 'confirmed'}
                  className="w-full bg-purple-600 text-white px-4 py-3 rounded-lg hover:bg-purple-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <PackageCheck className="h-5 w-5" />
                  Start Packing
                </button>

                {selectedOrder.status === 'packing' && (
                  <div className="space-y-2 p-4 bg-blue-50 rounded-lg">
                    <input
                      type="text"
                      placeholder="Tracking Number"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <input
                      type="text"
                      placeholder="Carrier (e.g., FedEx, UPS)"
                      value={carrier}
                      onChange={(e) => setCarrier(e.target.value)}
                      className="w-full border border-gray-300 rounded-lg px-4 py-2"
                    />
                    <button
                      onClick={() => updateOrderStatus(selectedOrder._id || selectedOrder.id, 'shipping')}
                      className="w-full bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Truck className="h-5 w-5" />
                      Mark as Shipped
                    </button>
                  </div>
                )}

                <button
                  onClick={() => updateOrderStatus(selectedOrder._id || selectedOrder.id, 'delivered')}
                  disabled={selectedOrder.status !== 'shipping'}
                  className="w-full bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  <CheckCircle className="h-5 w-5" />
                  Mark as Delivered
                </button>
              </div>

              <button
                onClick={() => {
                  setShowStatusModal(false);
                  setSelectedOrder(null);
                  setTrackingNumber('');
                  setCarrier('');
                }}
                className="w-full bg-gray-200 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SellerDashboard;
