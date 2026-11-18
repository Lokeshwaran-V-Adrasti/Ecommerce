import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useProductStore } from '../store/productStore';
import toast from 'react-hot-toast';
import { ArrowLeft, PlusCircle, UploadCloud, X } from 'lucide-react';
import ImageUpload, { ImageFile } from '../components/common/ImageUpload';
import SizeChartEditor from '../components/product/SizeChartEditor';
import { api } from '../utils/api';
import { sizeChartAPI } from '../utils/sizeChartAPI';
import {
  PRODUCT_BRANDS,
  PRODUCT_CATEGORIES,
  PRODUCT_SIZES,
  CATEGORY_SIZES,
} from '../data/productCatalog';

interface ProductImage {
  url: string;
  alt: string;
  isPrimary: boolean;
}

interface ColorImage extends ProductImage {
  file?: File;
}

interface ProductColor {
  clientId: string;
  name: string;
  code: string;
  images: ColorImage[];
  linkedProduct?: string;
}

interface ProductVariant {
  size: string;
  color: string;
  stock: number;
  price: number;
}

interface FormData {
  title: string;
  description: string;
  basePrice: string;
  priceCurrency: 'USD' | 'INR';
  category: string;
  subcategory: string;
  material: string;
  hasSize: boolean;
  hasColors: boolean;
  tags: string[];
  images: ProductImage[];
  colors: ProductColor[];
  variants: ProductVariant[];
  brand: string;
  features: string[];
  sizeChartId?: string;
}

const MAX_COLOR_IMAGES = 6;
const MAX_IMAGE_SIZE_MB = 5;

const getDefaultColorCode = (name: string) => {
  const normalized = name.trim().toLowerCase();

  const map: Record<string, string> = {
    black: '#000000',
    white: '#ffffff',
    red: '#ff0000',
    green: '#00ff88',
    blue: '#0000ff',
    yellow: '#ffff00',
    orange: '#ffa500',
    pink: '#ffc0cb',
    purple: '#800080',
    violet: '#8f00ff',
    brown: '#8b4513',
    grey: '#808080',
    gray: '#808080',
    maroon: '#800000',
    navy: '#000080',
    beige: '#f5f5dc',
  };

  return map[normalized] || '#000000';
};

const createEmptyColor = (index = 0): ProductColor => ({
  clientId: `color-${Date.now()}-${index}-${Math.random().toString(36).slice(2)}`,
  name: '',
  code: '#000000',
  images: [],
});

const getImageUrl = (image: any) => {
  if (typeof image === 'string') return image;
  return image?.url || '';
};

const AddProductPage = () => {
  const { id } = useParams<{ id: string }>();
  const isEditMode = Boolean(id);

  const {
    addProduct,
    updateProduct,
    fetchSellerProducts,
    products,
  } = useProductStore();

  const navigate = useNavigate();

  const [formData, setFormData] = useState<FormData>({
    title: '',
    description: '',
    basePrice: '',
    priceCurrency: 'USD',
    category: PRODUCT_CATEGORIES[0].value,
    subcategory: '',
    material: '',
    hasSize: true,
    hasColors: false,
    tags: [],
    images: [],
    colors: [],
    variants: [
      {
        size: PRODUCT_SIZES[1],
        color: 'No Color',
        stock: 10,
        price: 0,
      },
    ],
    brand: '',
    features: [],
  });

  const [loading, setLoading] = useState(false);
  const [tagInput, setTagInput] = useState('');
  const [featureInput, setFeatureInput] = useState('');
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  const [isCustomBrand, setIsCustomBrand] = useState(false);
  const [sizeChartEditorOpen, setSizeChartEditorOpen] = useState(false);
  const [sellerSizeCharts, setSellerSizeCharts] = useState<any[]>([]);
  const [loadingSizeCharts, setLoadingSizeCharts] = useState(false);

  const selectedCategory =
    PRODUCT_CATEGORIES.find(
      category => category.value === formData.category
    ) || PRODUCT_CATEGORIES[0];

  const needsSize = formData.hasSize;

  const availableSizes =
    CATEGORY_SIZES[formData.subcategory.toLowerCase()] || ['One Size'];

  React.useEffect(() => {
    if (isEditMode && products.length === 0) {
      fetchSellerProducts();
    }

    loadSellerSizeCharts();
  }, [fetchSellerProducts, isEditMode, products.length]);

  const loadSellerSizeCharts = async () => {
    setLoadingSizeCharts(true);

    try {
      const charts = await sizeChartAPI.getAllSellerCharts();
      setSellerSizeCharts(charts);
    } catch (error) {
      console.error('Failed to load size charts:', error);
    } finally {
      setLoadingSizeCharts(false);
    }
  };

  React.useEffect(() => {
    if (!isEditMode || !id) return;

    const product = products.find(
      (item: any) => String(item._id || item.id) === id
    );

    if (!product) return;

    const brand = (product as any).brand || '';

    const existingColors: ProductColor[] = Array.isArray(
      (product as any).colors
    )
      ? (product as any).colors.map((color: any, index: number) => {
          let colorImages: ColorImage[] = [];

          if (Array.isArray(color.images)) {
            colorImages = color.images.map((image: any, imageIndex: number) => ({
              url: getImageUrl(image),
              alt:
                image?.alt ||
                `${color.name || 'Colour'} image ${imageIndex + 1}`,
              isPrimary: Boolean(image?.isPrimary || imageIndex === 0),
            }));
          } else if (color.image) {
            colorImages = [
              {
                url: getImageUrl(color.image),
                alt: `${color.name || 'Colour'} image`,
                isPrimary: true,
              },
            ];
          }

          return {
            clientId: `existing-color-${index}-${color._id || Date.now()}`,
            name: color.name || '',
            code: color.code || getDefaultColorCode(color.name || ''),
            images: colorImages,
            linkedProduct: color.linkedProduct
              ? String(color.linkedProduct._id || color.linkedProduct)
              : undefined,
          };
        })
      : [];

    const hasColorsFromProduct =
      Boolean((product as any).hasColors) || existingColors.length > 0;

    const existingImages: ProductImage[] = Array.isArray(product.images)
      ? product.images.map((image: any, index: number) =>
          typeof image === 'string'
            ? {
                url: image,
                alt:
                  product.name ||
                  product.title ||
                  'Product image',
                isPrimary: index === 0,
              }
            : {
                url: image.url,
                alt:
                  image.alt ||
                  product.name ||
                  product.title ||
                  'Product image',
                isPrimary: Boolean(image.isPrimary || index === 0),
              }
        )
      : [];

    const existingVariants: ProductVariant[] =
      product.variants && product.variants.length > 0
        ? product.variants.map((variant: any) => ({
            size: variant.size || 'One Size',
            color:
              variant.color ||
              (hasColorsFromProduct
                ? existingColors[0]?.name || ''
                : 'No Color'),
            stock: Number(variant.stock || 0),
            price: Number(
              variant.price ||
                (product as any).basePrice ||
                product.price ||
                0
            ),
          }))
        : [
            {
              size: 'One Size',
              color: hasColorsFromProduct
                ? existingColors[0]?.name || ''
                : 'No Color',
              stock: 10,
              price: Number(
                (product as any).basePrice || product.price || 0
              ),
            },
          ];

    setIsCustomBrand(
      Boolean(brand) && !PRODUCT_BRANDS.includes(brand)
    );

    setFormData({
      title: (product as any).title || product.name || '',
      description: product.description || '',
      basePrice: String(
        (product as any).basePrice || product.price || ''
      ),
      priceCurrency:
        ((product as any).priceCurrency || 'USD') as 'USD' | 'INR',
      category:
        product.category || PRODUCT_CATEGORIES[0].value,
      subcategory: (product as any).subcategory || '',
      material: (product as any).material || '',
      hasSize: (product as any).hasSize !== false,
      hasColors: hasColorsFromProduct,
      tags: (product as any).tags || [],
      images: existingImages,
      colors: existingColors,
      variants: existingVariants,
      brand,
      features: (product as any).features || [],
      sizeChartId: (product as any).sizeChartId
        ? String((product as any).sizeChartId._id || (product as any).sizeChartId)
        : '',
    });
  }, [id, isEditMode, products]);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;

    if (name === 'category') {
      setFormData(prev => ({
        ...prev,
        category: value,
        subcategory: '',
      }));
      return;
    }

    if (name === 'subcategory') {
      setFormData(prev => ({
        ...prev,
        subcategory: value,
      }));
      return;
    }

    if (name === 'hasSize') {
      const checked = (e.target as HTMLInputElement).checked;

      setFormData(prev => ({
        ...prev,
        hasSize: checked,
        variants: prev.variants.map(variant => ({
          ...variant,
          size: checked
            ? variant.size === 'One Size'
              ? PRODUCT_SIZES[1]
              : variant.size
            : 'One Size',
        })),
      }));
      return;
    }

    if (name === 'hasColors') {
      const checked = (e.target as HTMLInputElement).checked;

      setFormData(prev => ({
        ...prev,
        hasColors: checked,
        colors:
          checked && prev.colors.length === 0
            ? [createEmptyColor(0)]
            : prev.colors,
        variants: prev.variants.map(variant => ({
          ...variant,
          color: checked
            ? prev.colors[0]?.name || ''
            : 'No Color',
        })),
      }));

      return;
    }

    if (name === 'brandMode') {
      const useCustomBrand = value === 'custom';

      setIsCustomBrand(useCustomBrand);

      setFormData(prev => ({
        ...prev,
        brand: useCustomBrand ? '' : PRODUCT_BRANDS[0],
      }));

      return;
    }

    if (name === 'basePrice' || name === 'priceCurrency') {
      const nextPrice =
        name === 'basePrice'
          ? parseFloat(value) || 0
          : parseFloat(formData.basePrice) || 0;

      setFormData(prev => ({
        ...prev,
        [name]: value,
        variants: prev.variants.map(variant => ({
          ...variant,
          price: nextPrice,
        })),
      }));

      return;
    }

    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImagesChange = (images: ImageFile[]) => {
    setImageFiles(images);
  };

  const addColor = () => {
    if (formData.colors.length >= 20) {
      toast.error('You can add up to 20 colours.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      colors: [...prev.colors, createEmptyColor(prev.colors.length)],
    }));
  };

  const removeColor = (colorIndex: number) => {
    if (formData.colors.length <= 1) {
      toast.error('At least one colour is required when colour options are enabled.');
      return;
    }

    const removedName = formData.colors[colorIndex]?.name;

    setFormData(prev => ({
      ...prev,
      colors: prev.colors.filter((_, index) => index !== colorIndex),
      variants: prev.variants.filter(
        variant => !removedName || variant.color !== removedName
      ),
    }));
  };

  const updateColor = (
    colorIndex: number,
    field: 'name' | 'code',
    value: string
  ) => {
    setFormData(prev => {
      const oldName = prev.colors[colorIndex]?.name || '';

      const nextColors = prev.colors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              [field]: value,
            }
          : color
      );

      if (field !== 'name') {
        return {
          ...prev,
          colors: nextColors,
        };
      }

      return {
        ...prev,
        colors: nextColors,
        variants: prev.variants.map(variant =>
          variant.color === oldName
            ? { ...variant, color: value }
            : variant
        ),
      };
    });
  };

  const handleColorNameBlur = (colorIndex: number) => {
    const color = formData.colors[colorIndex];

    if (!color || color.code !== '#000000' || !color.name.trim()) {
      return;
    }

    const suggestedCode = getDefaultColorCode(color.name);

    if (suggestedCode !== '#000000') {
      updateColor(colorIndex, 'code', suggestedCode);
    }
  };

  const handleColorImagesChange = (
    colorIndex: number,
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const selectedFiles = Array.from(event.target.files || []);

    if (selectedFiles.length === 0) return;

    const currentImages = formData.colors[colorIndex]?.images || [];
    const remainingSlots =
      MAX_COLOR_IMAGES - currentImages.length;

    if (remainingSlots <= 0) {
      toast.error(`Maximum ${MAX_COLOR_IMAGES} images allowed for one colour.`);
      event.target.value = '';
      return;
    }

    const filesToAdd = selectedFiles.slice(0, remainingSlots);

    if (selectedFiles.length > remainingSlots) {
      toast.error(
        `Only ${remainingSlots} more image(s) can be added to this colour.`
      );
    }

    const invalidFiles = filesToAdd.filter(file => {
      if (!file.type.startsWith('image/')) return true;
      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) return true;
      return false;
    });

    if (invalidFiles.length > 0) {
      toast.error(
        `Each colour image must be an image file up to ${MAX_IMAGE_SIZE_MB} MB.`
      );
      event.target.value = '';
      return;
    }

    const newImages: ColorImage[] = filesToAdd.map(
      (file, index) => ({
        url: URL.createObjectURL(file),
        alt: `${formData.colors[colorIndex]?.name || 'Colour'} image`,
        isPrimary:
          currentImages.length === 0 && index === 0,
        file,
      })
    );

    setFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              images: [...color.images, ...newImages],
            }
          : color
      ),
    }));

    event.target.value = '';
  };

  const removeColorImage = (
    colorIndex: number,
    imageIndex: number
  ) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, index) => {
        if (index !== colorIndex) return color;

        const nextImages = color.images.filter(
          (_, currentIndex) => currentIndex !== imageIndex
        );

        if (
          nextImages.length > 0 &&
          !nextImages.some(image => image.isPrimary)
        ) {
          nextImages[0] = {
            ...nextImages[0],
            isPrimary: true,
          };
        }

        return {
          ...color,
          images: nextImages,
        };
      }),
    }));
  };

  const setPrimaryColorImage = (
    colorIndex: number,
    imageIndex: number
  ) => {
    setFormData(prev => ({
      ...prev,
      colors: prev.colors.map((color, index) =>
        index === colorIndex
          ? {
              ...color,
              images: color.images.map((image, currentIndex) => ({
                ...image,
                isPrimary: currentIndex === imageIndex,
              })),
            }
          : color
      ),
    }));
  };

  const addFeature = () => {
    const value = featureInput.trim();

    if (value && !formData.features.includes(value)) {
      setFormData(prev => ({
        ...prev,
        features: [...prev.features, value],
      }));

      setFeatureInput('');
    }
  };

  const removeFeature = (featureToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      features: prev.features.filter(
        feature => feature !== featureToRemove
      ),
    }));
  };

  const updateVariant = (
    index: number,
    field: keyof ProductVariant,
    value: string | number
  ) => {
    setFormData(prev => ({
      ...prev,
      variants: prev.variants.map((variant, currentIndex) =>
        currentIndex === index
          ? { ...variant, [field]: value }
          : variant
      ),
    }));
  };

  const addVariant = () => {
    const basePrice = parseFloat(formData.basePrice) || 0;

    setFormData(prev => ({
      ...prev,
      variants: [
        ...prev.variants,
        {
          size: needsSize ? PRODUCT_SIZES[1] : 'One Size',
          color: prev.hasColors
            ? prev.colors[0]?.name || ''
            : 'No Color',
          stock: 10,
          price: basePrice,
        },
      ],
    }));
  };

  const removeVariant = (index: number) => {
    if (formData.variants.length <= 1) {
      toast.error('At least one variant is required.');
      return;
    }

    setFormData(prev => ({
      ...prev,
      variants: prev.variants.filter(
        (_, currentIndex) => currentIndex !== index
      ),
    }));
  };

  const handleSizeSizeChart = async (chartData: any) => {
    try {
      const savedChart = await sizeChartAPI.createChart(chartData);

      if (savedChart) {
        setFormData(prev => ({
          ...prev,
          sizeChartId: savedChart._id,
        }));

        await loadSellerSizeCharts();
        setSizeChartEditorOpen(false);
        toast.success('Chart created');
      }
    } catch (error) {
      console.error('Failed to create size chart:', error);
      toast.error('Failed to create size chart');
    }
  };

  const handleTagKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>
  ) => {
    if (e.key === 'Enter' && tagInput.trim() !== '') {
      e.preventDefault();

      const value = tagInput.trim();

      if (!formData.tags.includes(value)) {
        setFormData(prev => ({
          ...prev,
          tags: [...prev.tags, value],
        }));
      }

      setTagInput('');
    }
  };

  const removeTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove),
    }));
  };

  const uploadImages = async () => {
    try {
      const files = imageFiles.map(img => img.file);
      const response = await api.uploadProductImages(files);

      if (response.success && response.data) {
        return response.data.map((img: any, index: number) => ({
          ...img,
          isPrimary: imageFiles[index]?.isPrimary || index === 0,
        }));
      }

      throw new Error(
        response.message || 'Product image upload failed'
      );
    } catch (error) {
      console.error('Product image upload error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload product images';

      toast.error(`Upload failed: ${message}`);
      return null;
    }
  };

  const uploadColorImages = async (): Promise<ProductColor[] | null> => {
    try {
      const uploadedColors: ProductColor[] = [];

      for (const color of formData.colors) {
        if (!color.name.trim()) {
          throw new Error('Every colour must have a colour name.');
        }

        if (color.images.length < 1) {
          throw new Error(
            `Please upload at least one image for ${color.name}.`
          );
        }

        if (color.images.length > MAX_COLOR_IMAGES) {
          throw new Error(
            `${color.name} has more than ${MAX_COLOR_IMAGES} images.`
          );
        }

        const newFiles = color.images
          .filter(image => image.file)
          .map(image => image.file as File);

        let uploadedNewImages: any[] = [];

        if (newFiles.length > 0) {
          const response = await api.uploadProductImages(newFiles);

          if (!response.success || !response.data) {
            throw new Error(
              response.message ||
                `Failed to upload images for ${color.name}`
            );
          }

          uploadedNewImages = response.data;
        }

        let uploadIndex = 0;

        const finalImages: ProductImage[] = color.images.map(
          image => {
            if (image.file) {
              const uploaded = uploadedNewImages[uploadIndex];
              uploadIndex += 1;

              return {
                url: uploaded?.url || image.url,
                alt:
                  uploaded?.alt ||
                  image.alt ||
                  `${color.name} image`,
                isPrimary: image.isPrimary,
              };
            }

            return {
              url: image.url,
              alt: image.alt || `${color.name} image`,
              isPrimary: image.isPrimary,
            };
          }
        );

        if (
          finalImages.length > 0 &&
          !finalImages.some(image => image.isPrimary)
        ) {
          finalImages[0].isPrimary = true;
        }

        uploadedColors.push({
          ...color,
          images: finalImages,
        });
      }

      return uploadedColors;
    } catch (error) {
      console.error('Colour image upload error:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Failed to upload colour images';

      toast.error(message);
      return null;
    }
  };

  const validateColors = () => {
    if (!formData.hasColors) return true;

    if (formData.colors.length === 0) {
      toast.error('Add at least one colour.');
      return false;
    }

    const names = new Set<string>();

    for (const color of formData.colors) {
      const name = color.name.trim();

      if (!name) {
        toast.error('Every colour must have a colour name.');
        return false;
      }

      const normalized = name.toLowerCase();

      if (names.has(normalized)) {
        toast.error(`Duplicate colour found: ${name}`);
        return false;
      }

      names.add(normalized);

      if (!/^#[0-9A-Fa-f]{6}$/.test(color.code)) {
        toast.error(`Invalid colour code for ${name}.`);
        return false;
      }

      if (color.images.length < 1) {
        toast.error(`Upload at least one image for ${name}.`);
        return false;
      }

      if (color.images.length > MAX_COLOR_IMAGES) {
        toast.error(
          `${name} can have a maximum of ${MAX_COLOR_IMAGES} images.`
        );
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title.trim()) {
      toast.error('Product title is required');
      return;
    }

    if (!formData.description.trim()) {
      toast.error('Product description is required');
      return;
    }

    if (
      !formData.basePrice ||
      parseFloat(formData.basePrice) <= 0
    ) {
      toast.error('Valid base price is required');
      return;
    }

    if (!formData.subcategory.trim()) {
      toast.error('Please select a subcategory');
      return;
    }

    if (!formData.brand.trim()) {
      toast.error('Please select or create a brand');
      return;
    }

    if (!formData.material.trim()) {
      toast.error('Material is required');
      return;
    }

    if (formData.variants.length === 0) {
      toast.error('At least one variant is required');
      return;
    }

    if (!formData.hasColors) {
      if (!isEditMode && imageFiles.length === 0) {
        toast.error('Please upload at least one product image');
        return;
      }

      if (
        isEditMode &&
        imageFiles.length === 0 &&
        formData.images.length === 0
      ) {
        toast.error('Please keep or upload at least one product image');
        return;
      }
    } else {
      if (!validateColors()) return;
    }

    if (formData.hasColors) {
      const colorNames = new Set(
        formData.colors
          .map(color => color.name.trim())
          .filter(Boolean)
          .map(name => name.toLowerCase())
      );

      const invalidVariant = formData.variants.find(
        variant =>
          !variant.color.trim() ||
          !colorNames.has(variant.color.trim().toLowerCase())
      );

      if (invalidVariant) {
        toast.error(
          'Every variant must be assigned to one of the added colours.'
        );
        return;
      }
    }

    setLoading(true);

    try {
      let uploadedImages: ProductImage[] = [];

      if (!formData.hasColors) {
        const result =
          imageFiles.length > 0
            ? await uploadImages()
            : formData.images;

        if (!result || result.length === 0) {
          toast.error(
            isEditMode
              ? 'Please keep or upload at least one product image'
              : 'Failed to upload images'
          );
          setLoading(false);
          return;
        }

        uploadedImages = result;
      }

      let uploadedColors: ProductColor[] = [];

      if (formData.hasColors) {
        const result = await uploadColorImages();

        if (!result) {
          setLoading(false);
          return;
        }

        uploadedColors = result;
      }

      const basePriceInUSD =
        formData.priceCurrency === 'INR'
          ? parseFloat(formData.basePrice) / 83
          : parseFloat(formData.basePrice);

      const pendingTag = tagInput.trim();
      const pendingFeature = featureInput.trim();

      const cleanColors = uploadedColors.map(color => ({
        name: color.name.trim(),
        code: color.code,
        images: color.images.map(image => ({
          url: image.url,
          alt: image.alt,
          isPrimary: Boolean(image.isPrimary),
        })),
        ...(color.linkedProduct
          ? { linkedProduct: color.linkedProduct }
          : {}),
      }));

      const productData = {
        ...formData,
        hasColors: formData.hasColors,
        tags:
          pendingTag && !formData.tags.includes(pendingTag)
            ? [...formData.tags, pendingTag]
            : formData.tags,
        features:
          pendingFeature &&
          !formData.features.includes(pendingFeature)
            ? [...formData.features, pendingFeature]
            : formData.features,
        images: formData.hasColors ? [] : uploadedImages,
        colors: formData.hasColors ? cleanColors : [],
        basePrice: basePriceInUSD,
        sizeChartId: formData.sizeChartId || undefined,
        variants: formData.variants.map(variant => ({
          ...variant,
          size: needsSize ? variant.size : 'One Size',
          color: formData.hasColors
            ? variant.color
            : 'No Color',
          stock: Number(variant.stock),
          price:
            formData.priceCurrency === 'INR'
              ? Number(variant.price) / 83
              : Number(variant.price),
        })),
      };

      console.log('Submitting product data:', productData);

      if (isEditMode && id) {
        await updateProduct(id, productData);
        toast.success('Product updated successfully!');
      } else {
        await addProduct(productData);
        toast.success('Product added successfully!');
      }

      navigate('/seller-dashboard');
    } catch (error) {
      console.error('Product creation error:', error);

      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to save product. Please check all required fields.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="min-h-screen bg-gray-100 p-8">
        <div className="max-w-4xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="mr-2" />
            Back to Dashboard
          </button>

          <div className="bg-white rounded-lg shadow-md p-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-6">
              {isEditMode ? 'Edit Product' : 'Add New Product'}
            </h1>

            <form onSubmit={handleSubmit} className="space-y-8">

              {/* IMAGE MODE */}
              {!formData.hasColors ? (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-4">
                    Product Images *{' '}
                    {isEditMode
                      ? '(Upload new images to replace existing ones)'
                      : '(Required - Upload up to 6 images)'}
                  </label>

                  <ImageUpload
                    images={imageFiles}
                    onImagesChange={handleImagesChange}
                    maxImages={6}
                    maxSizeMB={5}
                  />

                  {isEditMode &&
                    imageFiles.length === 0 &&
                    formData.images.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs text-gray-500 mb-2">
                          Existing images:
                        </p>

                        <div className="flex flex-wrap gap-3">
                          {formData.images.map((image, index) => (
                            <img
                              key={`${image.url}-${index}`}
                              src={image.url}
                              alt={image.alt}
                              className="h-20 w-20 rounded-md object-cover border"
                            />
                          ))}
                        </div>
                      </div>
                    )}
                </div>
              ) : (
                /* COLOUR IMAGE MODE */
                <div>
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Product Colours *
                      </label>

                      <p className="text-xs text-gray-500 mt-1">
                        Add each colour once. Each colour can have 1–6 images.
                        Images are shared across all sizes of that colour.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={addColor}
                      className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                    >
                      <PlusCircle className="h-4 w-4 mr-2" />
                      Add Colour
                    </button>
                  </div>

                  <div className="space-y-5">
                    {formData.colors.map((color, colorIndex) => (
                      <div
                        key={color.clientId}
                        className="border border-gray-200 rounded-lg p-5"
                      >
                        <div className="flex items-center justify-between mb-5">
                          <h3 className="font-semibold text-gray-900">
                            Colour {colorIndex + 1}
                          </h3>

                          {formData.colors.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeColor(colorIndex)}
                              className="text-red-600 hover:text-red-800"
                              title="Remove colour"
                            >
                              <X className="h-5 w-5" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Colour Name *
                            </label>

                            <input
                              type="text"
                              value={color.name}
                              onChange={e =>
                                updateColor(
                                  colorIndex,
                                  'name',
                                  e.target.value
                                )
                              }
                              onBlur={() =>
                                handleColorNameBlur(colorIndex)
                              }
                              placeholder="e.g. Green"
                              required
                              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                            />
                          </div>

                          <div>
                            <label className="block text-xs font-medium text-gray-700">
                              Colour Code *
                            </label>

                            <div className="mt-1 flex items-center gap-2">
                              <input
                                type="color"
                                value={
                                  /^#[0-9A-Fa-f]{6}$/.test(color.code)
                                    ? color.code
                                    : '#000000'
                                }
                                onChange={e =>
                                  updateColor(
                                    colorIndex,
                                    'code',
                                    e.target.value
                                  )
                                }
                                className="h-10 w-12 p-1 border border-gray-300 rounded"
                              />

                              <input
                                type="text"
                                value={color.code}
                                onChange={e =>
                                  updateColor(
                                    colorIndex,
                                    'code',
                                    e.target.value
                                  )
                                }
                                placeholder="#000000"
                                maxLength={7}
                                className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                              />
                            </div>
                          </div>
                        </div>

                        <div className="mt-5">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <p className="text-xs font-medium text-gray-700">
                                Colour Images *
                              </p>

                              <p className="text-xs text-gray-500">
                                {color.images.length}/
                                {MAX_COLOR_IMAGES} images
                              </p>
                            </div>

                            {color.images.length < MAX_COLOR_IMAGES && (
                              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-2 border border-dashed border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50">
                                <UploadCloud className="h-4 w-4" />
                                Add Images
                                <input
                                  type="file"
                                  accept="image/*"
                                  multiple
                                  className="hidden"
                                  onChange={e =>
                                    handleColorImagesChange(
                                      colorIndex,
                                      e
                                    )
                                  }
                                />
                              </label>
                            )}
                          </div>

                          {color.images.length === 0 ? (
                            <div className="border-2 border-dashed border-gray-200 rounded-lg p-8 text-center">
                              <UploadCloud className="mx-auto h-8 w-8 text-gray-400" />

                              <p className="mt-2 text-sm text-gray-600">
                                Upload at least 1 image for this colour
                              </p>

                              <p className="text-xs text-gray-400 mt-1">
                                Maximum 6 images, 5 MB each
                              </p>
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-4">
                              {color.images.map((image, imageIndex) => (
                                <div
                                  key={`${image.url}-${imageIndex}`}
                                  className="relative"
                                >
                                  <img
                                    src={image.url}
                                    alt={image.alt}
                                    className={`h-28 w-28 object-cover rounded-lg border-2 ${
                                      image.isPrimary
                                        ? 'border-indigo-500'
                                        : 'border-gray-200'
                                    }`}
                                  />

                                  {image.isPrimary && (
                                    <span className="absolute left-1 bottom-1 rounded bg-indigo-600 text-white text-[10px] px-1.5 py-0.5">
                                      Main
                                    </span>
                                  )}

                                  {!image.isPrimary && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPrimaryColorImage(
                                          colorIndex,
                                          imageIndex
                                        )
                                      }
                                      className="absolute left-1 bottom-1 rounded bg-white/90 text-gray-700 text-[10px] px-1.5 py-0.5"
                                    >
                                      Make Main
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeColorImage(
                                        colorIndex,
                                        imageIndex
                                      )
                                    }
                                    className="absolute -right-2 -top-2 bg-white rounded-full shadow border border-gray-200 text-red-600 hover:text-red-800"
                                    title="Remove image"
                                  >
                                    <X className="h-5 w-5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-md bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-800">
                      <strong>Example:</strong> Green can have 2 images,
                      Red can have 1 image, and Black can have 4 images.
                      You do not need to upload the same image for S, M, L,
                      or other sizes.
                    </p>
                  </div>
                </div>
              )}

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div>
                  <label
                    htmlFor="title"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Product Title *
                  </label>

                  <input
                    type="text"
                    name="title"
                    id="title"
                    value={formData.title}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="category"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Category *
                  </label>

                  <select
                    name="category"
                    id="category"
                    value={formData.category}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    {PRODUCT_CATEGORIES.map(category => (
                      <option
                        key={category.value}
                        value={category.value}
                      >
                        {category.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="subcategory"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Subcategory *
                  </label>

                  <select
                    name="subcategory"
                    id="subcategory"
                    value={formData.subcategory}
                    onChange={handleChange}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="">Select subcategory</option>

                    {selectedCategory.groups.map(group => (
                      <optgroup
                        key={group.title}
                        label={group.title}
                      >
                        {group.items.map(item => (
                          <option
                            key={`${group.title}-${item}`}
                            value={item}
                          >
                            {item}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="brandMode"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Brand *
                  </label>

                  <select
                    name="brandMode"
                    id="brandMode"
                    value={
                      isCustomBrand ? 'custom' : 'existing'
                    }
                    onChange={handleChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  >
                    <option value="existing">
                      Select existing brand
                    </option>
                    <option value="custom">
                      Create new brand
                    </option>
                  </select>
                </div>

                <div>
                  <label
                    htmlFor="brand"
                    className="block text-sm font-medium text-gray-700"
                  >
                    {isCustomBrand
                      ? 'New Brand Name *'
                      : 'Select Brand *'}
                  </label>

                  {isCustomBrand ? (
                    <input
                      type="text"
                      name="brand"
                      id="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      required
                      placeholder="Enter your brand name"
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  ) : (
                    <select
                      name="brand"
                      id="brand"
                      value={formData.brand}
                      onChange={handleChange}
                      required
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">Select brand</option>

                      {PRODUCT_BRANDS.map(brand => (
                        <option key={brand} value={brand}>
                          {brand}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                <div>
                  <label
                    htmlFor="material"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Material *
                  </label>

                  <input
                    type="text"
                    name="material"
                    id="material"
                    value={formData.material}
                    onChange={handleChange}
                    required
                    placeholder="e.g., Cotton, Polyester, Leather"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />
                </div>

                <div>
                  <label
                    htmlFor="basePrice"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Base Price * (
                    {formData.priceCurrency === 'USD'
                      ? '$'
                      : '₹'}
                    )
                  </label>

                  <div className="mt-1 flex rounded-md shadow-sm">
                    <select
                      name="priceCurrency"
                      value={formData.priceCurrency}
                      onChange={handleChange}
                      className="inline-flex items-center px-3 rounded-l-md border border-r-0 border-gray-300 bg-gray-50 text-gray-500 sm:text-sm"
                    >
                      <option value="USD">USD ($)</option>
                      <option value="INR">INR (₹)</option>
                    </select>

                    <input
                      type="number"
                      name="basePrice"
                      id="basePrice"
                      value={formData.basePrice}
                      onChange={handleChange}
                      required
                      min="0"
                      step="0.01"
                      placeholder={
                        formData.priceCurrency === 'USD'
                          ? '99.99'
                          : '8299.00'
                      }
                      className="flex-1 block w-full rounded-none rounded-r-md border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    />
                  </div>

                  <p className="mt-1 text-xs text-gray-500">
                    {formData.basePrice &&
                    formData.priceCurrency === 'INR'
                      ? `≈ $${(
                          parseFloat(formData.basePrice) / 83
                        ).toFixed(2)} USD`
                      : formData.basePrice &&
                        formData.priceCurrency === 'USD'
                      ? `≈ ₹${(
                          parseFloat(formData.basePrice) * 83
                        ).toFixed(2)} INR`
                      : 'Enter price in your preferred currency'}
                  </p>
                </div>
              </div>

              <div>
                <label
                  htmlFor="description"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description *
                </label>

                <textarea
                  name="description"
                  id="description"
                  value={formData.description}
                  onChange={handleChange}
                  required
                  rows={6}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                />
              </div>

              {/* Product Options */}
              <div className="border border-gray-200 rounded-lg p-5">
                <div className="space-y-3">
                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="hasColors"
                      checked={formData.hasColors}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />

                    This product has colour options
                  </label>

                  <p className="text-xs text-gray-500 ml-6">
                    Turn this on when the product has separate colour
                    choices such as Green, Red, Black, etc. Each colour
                    gets its own 1–6 image gallery.
                  </p>
                </div>
              </div>

              {/* Product Variants */}
              <div>
                <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Product Variants *
                    </label>

                    <p className="text-xs text-gray-500 mt-1">
                      {formData.hasColors
                        ? 'Assign every size/stock/price combination to a colour.'
                        : 'Use variants for size, stock and price. Colour is not required for this product.'}
                    </p>
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-gray-700">
                    <input
                      type="checkbox"
                      name="hasSize"
                      checked={formData.hasSize}
                      onChange={handleChange}
                      className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />

                    This product has size options
                  </label>
                </div>

                {formData.variants.map((variant, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 rounded-lg p-4 mb-4"
                  >
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="text-sm font-medium text-gray-900">
                        Variant {index + 1}
                      </h4>

                      {formData.variants.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            removeVariant(index)
                          }
                          className="text-red-600 hover:text-red-800"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    <div
                      className={`grid grid-cols-1 ${
                        needsSize
                          ? formData.hasColors
                            ? 'md:grid-cols-4'
                            : 'md:grid-cols-3'
                          : formData.hasColors
                          ? 'md:grid-cols-3'
                          : 'md:grid-cols-2'
                      } gap-4`}
                    >
                      {needsSize && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Size
                          </label>

                          <select
                            value={variant.size}
                            onChange={e =>
                              updateVariant(
                                index,
                                'size',
                                e.target.value
                              )
                            }
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            {availableSizes.map(size => (
                              <option
                                key={size}
                                value={size}
                              >
                                {size}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      {formData.hasColors && (
                        <div>
                          <label className="block text-xs font-medium text-gray-700">
                            Colour
                          </label>

                          <select
                            value={variant.color}
                            onChange={e =>
                              updateVariant(
                                index,
                                'color',
                                e.target.value
                              )
                            }
                            required
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                          >
                            <option value="">
                              Select colour
                            </option>

                            {formData.colors.map(color => (
                              <option
                                key={color.clientId}
                                value={color.name}
                              >
                                {color.name ||
                                  `Colour ${
                                    formData.colors.indexOf(
                                      color
                                    ) + 1
                                  }`}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Stock
                        </label>

                        <input
                          type="number"
                          value={variant.stock}
                          onChange={e =>
                            updateVariant(
                              index,
                              'stock',
                              parseInt(e.target.value) || 0
                            )
                          }
                          min="0"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-gray-700">
                          Price (
                          {formData.priceCurrency ===
                          'INR'
                            ? '₹'
                            : '$'}
                          )
                        </label>

                        <input
                          type="number"
                          value={variant.price}
                          onChange={e =>
                            updateVariant(
                              index,
                              'price',
                              parseFloat(
                                e.target.value
                              ) || 0
                            )
                          }
                          min="0"
                          step="0.01"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                        />
                      </div>
                    </div>
                  </div>
                ))}

                <button
                  type="button"
                  onClick={addVariant}
                  className="mt-2 inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Variant
                </button>
              </div>

              {/* Size Chart */}
              {formData.hasSize && (
                <div className="border border-blue-200 bg-blue-50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <span>📏</span>
                    Size Chart (Optional)
                  </h3>

                  <p className="text-xs text-gray-600 mb-3">
                    Add a size chart to help customers choose the
                    right size. You can reuse size charts from other
                    products.
                  </p>

                  <div className="mb-3">
                    <label className="block text-xs font-medium text-gray-700 mb-2">
                      Use Existing Size Chart
                    </label>

                    <select
                      value={formData.sizeChartId || ''}
                      onChange={e =>
                        setFormData(prev => ({
                          ...prev,
                          sizeChartId: e.target.value,
                        }))
                      }
                      disabled={loadingSizeCharts}
                      className="w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                    >
                      <option value="">
                        -- Select or Create New --
                      </option>

                      {sellerSizeCharts.map(chart => (
                        <option
                          key={chart._id}
                          value={chart._id}
                        >
                          {chart.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setSizeChartEditorOpen(true)
                    }
                    className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                  >
                    {formData.sizeChartId
                      ? 'Create Another Chart'
                      : 'Create New Size Chart'}
                  </button>

                  {formData.sizeChartId && (
                    <button
                      type="button"
                      onClick={() =>
                        setFormData(prev => ({
                          ...prev,
                          sizeChartId: '',
                        }))
                      }
                      className="w-full mt-2 px-3 py-2 bg-red-100 text-red-700 text-sm font-medium rounded-md hover:bg-red-200 transition-colors"
                    >
                      Remove Selected Chart
                    </button>
                  )}
                </div>
              )}

              {/* Features */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Features
                </label>

                <div className="flex gap-2 mb-4">
                  <input
                    type="text"
                    placeholder="Add a feature"
                    value={featureInput}
                    onChange={e =>
                      setFeatureInput(e.target.value)
                    }
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addFeature();
                      }
                    }}
                    className="flex-1 rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm"
                  />

                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Add
                  </button>
                </div>

                {formData.features.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {formData.features.map(
                      (feature, index) => (
                        <span
                          key={index}
                          className="inline-flex items-center gap-1 bg-gray-100 text-gray-800 text-sm px-3 py-1 rounded-full"
                        >
                          {feature}

                          <button
                            type="button"
                            onClick={() =>
                              removeFeature(feature)
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      )
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label
                  htmlFor="tags"
                  className="block text-sm font-medium text-gray-700"
                >
                  Tags
                </label>

                <div className="mt-1 flex flex-wrap items-center gap-2 p-2 border border-gray-300 rounded-md">
                  {formData.tags.map(tag => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 bg-indigo-100 text-indigo-800 text-sm font-medium px-2 py-1 rounded-full"
                    >
                      {tag}

                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </span>
                  ))}

                  <input
                    type="text"
                    id="tags"
                    value={tagInput}
                    onChange={e =>
                      setTagInput(e.target.value)
                    }
                    onKeyDown={handleTagKeyDown}
                    className="flex-grow border-none focus:ring-0 p-1"
                    placeholder="Add a tag and press Enter"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center px-8 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-60"
                >
                  <PlusCircle className="mr-3" />

                  {loading
                    ? isEditMode
                      ? 'Updating Product...'
                      : 'Adding Product...'
                    : isEditMode
                    ? 'Update Product'
                    : 'Add Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Size Chart Editor Modal */}
      <SizeChartEditor
        isOpen={sizeChartEditorOpen}
        onClose={() => setSizeChartEditorOpen(false)}
        onSave={handleSizeSizeChart}
        category={
          formData.subcategory || formData.category
        }
      />
    </>
  );
};

export default AddProductPage;
