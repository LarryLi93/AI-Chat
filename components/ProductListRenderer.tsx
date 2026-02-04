
import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  Filter, 
  ArrowLeft, 
  Info, 
  FileText, 
  Package, 
  ShoppingCart, 
  Plus, 
  AlertCircle,
  X,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  List,
  Heart,
  Scissors,
  Search,
} from 'lucide-react';
import { Product } from '../types';

const BASE_URL = 'https://lobe.wyoooni.net';

// 格式化图片 URL
const formatImageUrl = (url: string | null, type: 'thumbnail' | 'original' = 'original'): string | null => {
  if (!url) return null;
  
  // 如果是完整链接
  if (url.startsWith('http')) {
    if (type === 'thumbnail' && url.includes('/pic/') && !url.includes('/pic/mini/')) {
      return url.replace('/pic/', '/pic/mini/');
    }
    if (type === 'original' && url.includes('/pic/mini/')) {
      return url.replace('/pic/mini/', '/pic/');
    }
    return url;
  }
  
  // 处理相对路径
  // 移除可能存在的缩略图前缀，确保从原始路径开始处理
  let cleanPath = url.replace(/^\/?thumbnails\/thumb_/, '/');
  if (!cleanPath.startsWith('/')) cleanPath = '/' + cleanPath;

  if (type === 'thumbnail') {
    // 缩略图路径：/aiModels/uploads/pic/mini/ + 文件名
    // 如果 cleanPath 已经是 /pic/... 格式
    if (cleanPath.startsWith('/pic/')) {
      return `${BASE_URL}/aiModels/uploads/pic/mini${cleanPath.substring(4)}`;
    }
    // 如果 cleanPath 已经是 /aiModels/uploads/pic/... 格式
    if (cleanPath.includes('/pic/') && !cleanPath.includes('/pic/mini/')) {
      return `${BASE_URL}${cleanPath.replace('/pic/', '/pic/mini/')}`;
    }
    return `${BASE_URL}${cleanPath}`;
  }
  
  // 原图路径
  if (cleanPath.startsWith('/pic/')) {
    return `${BASE_URL}/aiModels/uploads${cleanPath}`;
  }
  return `${BASE_URL}${cleanPath}`;
};

// 解析图片 URL 的辅助函数
export const getImageUrl = (imageUrls?: any, type: 'thumbnail' | 'original' = 'original') => {
  if (!imageUrls) return null;
  
  let rawUrl = '';

  // 处理数组格式 (可能在某些地方已经是数组)
  if (Array.isArray(imageUrls)) {
    rawUrl = imageUrls[0];
  } else if (typeof imageUrls === 'string') {
    rawUrl = imageUrls;
  } else {
    return null;
  }

  if (!rawUrl) return null;

  // 1. 处理完整 http 链接
  if (rawUrl.includes('http')) {
    const urlMatch = rawUrl.match(/https?:\/\/[^\s,`'"]+/);
    if (urlMatch) {
      const matchedUrl = urlMatch[0];
      return formatImageUrl(matchedUrl, type);
    }
  }
  
  // 2. 处理后端返回的相对路径或带文件名的格式
  // 可能格式: "/pic/..." 或 "filename:/pic/..."
  const parts = rawUrl.split(/[,，]/); // 处理可能的多图字符串
  let path = parts[0];
  
  // 移除文件名前缀（如果存在）
  if (path.includes(':')) {
    const p = path.split(':');
    path = p[p.length - 1].trim(); // 取最后一部分，通常是路径
  }
  
  // 清理路径中的反引号等字符
  path = path.replace(/[`'"]/g, '').trim();

  // 如果是相对路径 (以 / 开头)
  if (path.startsWith('/')) {
    return formatImageUrl(path, type);
  }

  return null;
};

// 获取所有图片 URL 的辅助函数
export const getAllImageUrls = (imageUrls?: any, type: 'thumbnail' | 'original' = 'original'): string[] => {
  if (!imageUrls) return [];
  
  const urls: string[] = [];
  const rawList = Array.isArray(imageUrls) ? imageUrls : [imageUrls];

  rawList.forEach(item => {
    if (typeof item !== 'string') return;
    
    // 分割可能的多图字符串
    const parts = item.split(/[,，]/);
    
    parts.forEach(part => {
      let path = part.trim();
      
      // 提取路径
      if (path.includes('http')) {
        const urlMatch = path.match(/https?:\/\/[^\s,`'"]+/);
        if (urlMatch) {
          const matchedUrl = urlMatch[0];
          urls.push(formatImageUrl(matchedUrl, type) || matchedUrl);
          return;
        }
      }
      
      // 处理相对路径
      if (path.includes(':')) {
        const p = path.split(':');
        path = p[p.length - 1].trim();
      }
      
      path = path.replace(/[`'"]/g, '').trim();
      
      if (path.startsWith('/')) {
        const formatted = formatImageUrl(path, type);
        if (formatted) urls.push(formatted);
      }
    });
  });
  
  return Array.from(new Set(urls)); // 去重
};

// 获取色卡图片 URL 的辅助函数
export const getColorCardUrl = (imageUrls?: any, type: 'thumbnail' | 'original' = 'original'): string | null => {
  if (!imageUrls) return null;
  const rawList = Array.isArray(imageUrls) ? imageUrls : [imageUrls];
  
  for (const item of rawList) {
    if (typeof item !== 'string') continue;
    // 匹配标题包含“色卡”的图片项，例如 "色卡: http://..." 或 "文件名色卡:http://..."
    if (item.includes('色卡')) {
      const urlMatch = item.match(/(https?:\/\/[^\s,`'"]+|\/pic\/[^\s,`'"]+)/);
      if (urlMatch) {
        let url = urlMatch[0];
        // 如果是相对路径，添加域名
        if (url.startsWith('/')) {
            return formatImageUrl(url, type);
        }
        return url;
      }
    }
  }
  return null;
};

// 获取缩略图 URL 的辅助函数
// 轻提示组件 (Toast)
const Toast: React.FC<{ 
  message: string; 
  visible: boolean; 
  onClose: () => void;
  duration?: number;
}> = ({ message, visible, onClose, duration = 2000 }) => {
  React.useEffect(() => {
    if (visible) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [visible, duration, onClose]);

  if (!visible) return null;

  return (
    <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[200] animate-in fade-in zoom-in-95 duration-300 pointer-events-none">
      <div className="bg-black/80 backdrop-blur-md text-white px-6 py-3 rounded-2xl shadow-2xl flex items-center gap-3 min-w-[200px] justify-center">
        <div className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
        <span className="text-[14px] font-medium tracking-wide">{message}</span>
      </div>
    </div>
  );
};

// 优化的图片组件，不再使用懒加载，直接显示图片
const OptimizedImage: React.FC<{
  src: string;
  alt: string;
  className?: string;
  priority?: boolean; // 是否为高优先级图片（如首屏）
  width?: number; // 期望显示的宽度
  objectFit?: 'cover' | 'contain';
}> = ({ src, alt, className, priority = false, width, objectFit = 'cover' }) => {
  const [error, setError] = React.useState(false);
  
  if (error) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-gray-300 ${className}`}>
        <AlertCircle size={20} />
      </div>
    );
  }

  return (
    <div className={`relative overflow-hidden bg-gray-50 ${className}`}>
      <img
        src={src || ''}
        alt={alt}
        className={`w-full h-full ${objectFit === 'cover' ? 'object-cover' : 'object-contain'} transition-opacity duration-300`}
        onError={() => setError(true)}
        // @ts-ignore
        fetchpriority={priority ? "high" : "auto"}
        loading="eager" // 全部改为立即加载
      />
    </div>
  );
};

// PDF 预览弹窗组件
const PdfPreviewModal: React.FC<{ 
  url: string; 
  onClose: () => void;
  title?: string;
}> = ({ url, onClose, title }) => {
  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-black/90 animate-in fade-in duration-300">
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10">
        <h3 className="text-white text-[15px] font-medium truncate flex-1 mr-4">{title || 'PDF 预览'}</h3>
        <button 
          onClick={onClose}
          className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
        >
          <X size={24} />
        </button>
      </div>
      
      <div className="flex-1 w-full h-full relative overflow-hidden bg-gray-100">
        <iframe 
          src={`${url}#toolbar=0`} 
          className="w-full h-full border-none"
          title="PDF Preview"
        />
      </div>

      <div className="px-4 py-4 bg-black/50 backdrop-blur-md flex justify-center gap-6">
        <a 
          href={url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-full text-[14px] font-bold active:scale-95 transition-transform"
        >
          <FileText size={18} />
          新窗口打开
        </a>
      </div>
    </div>
  );
};

// 图片预览弹窗组件
const ImagePreviewModal: React.FC<{ 
  url: string; 
  onClose: () => void;
  title?: string;
}> = ({ url, onClose, title }) => {
  const [scale, setScale] = React.useState(1);
  const [position, setPosition] = React.useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = React.useState(false);
  const [dragStart, setDragStart] = React.useState({ x: 0, y: 0 });
  const imgRef = React.useRef<HTMLImageElement>(null);

  const handleZoomIn = () => setScale(prev => Math.min(prev + 0.5, 5));
  const handleZoomOut = () => {
    setScale(prev => {
      const newScale = Math.max(prev - 0.5, 0.5);
      if (newScale <= 1) setPosition({ x: 0, y: 0 });
      return newScale;
    });
  };

  const handleReset = () => {
    setScale(1);
    setPosition({ x: 0, y: 0 });
  };

  const onMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const onMouseUp = () => setIsDragging(false);

  // 触控处理
  const onTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging) {
      const touch = e.touches[0];
      setPosition({
        x: touch.clientX - dragStart.x,
        y: touch.clientY - dragStart.y
      });
    }
  };

  const onTouchEnd = () => setIsDragging(false);

  // 处理滚轮缩放
  const handleWheel = (e: React.WheelEvent) => {
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] bg-black/90 flex flex-col animate-in fade-in duration-300"
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* 顶部工具栏 */}
      <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-20 bg-gradient-to-b from-black/50 to-transparent">
        <div className="text-white text-[14px] font-medium truncate max-w-[60%]">
          {title || '图片预览'}
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center bg-white/10 backdrop-blur rounded-full px-2">
            <button onClick={handleZoomOut} className="p-2 text-white/80 hover:text-white transition-colors">
              <ZoomOut size={20} />
            </button>
            <span className="text-white/90 text-[12px] font-mono min-w-[45px] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button onClick={handleZoomIn} className="p-2 text-white/80 hover:text-white transition-colors">
              <ZoomIn size={20} />
            </button>
            <div className="w-px h-4 bg-white/20 mx-1" />
            <button onClick={handleReset} className="p-2 text-white/80 hover:text-white transition-colors">
              <Maximize2 size={18} />
            </button>
          </div>
          <button 
            onClick={onClose}
            className="w-10 h-10 rounded-full bg-white/10 backdrop-blur flex items-center justify-center text-white hover:bg-white/20 transition-all"
          >
            <X size={24} />
          </button>
        </div>
      </div>

      {/* 图片容器 */}
      <div 
        className="flex-1 overflow-hidden flex items-center justify-center relative touch-none"
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        <img
          ref={imgRef}
          src={url}
          alt="Preview"
          className={`max-w-full max-h-full transition-transform duration-100 select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
          style={{
            transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
          }}
          draggable={false}
          onDoubleClick={handleReset}
        />
      </div>

      {/* 底部提示 */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur rounded-full text-white/60 text-[11px] pointer-events-none">
        双击重置 · 滚轮缩放 · 拖拽移动
      </div>
    </div>
  );
};

// 全屏商品列表视图组件
export const ProductListView: React.FC<{
  groups: ProductGroup[];
  initialGroupIndex: number;
  initialScrollTop?: number;
  onBack: () => void;
  onViewProduct: (product: Product, scrollTop: number) => void;
  onAction?: (action: string, data: any) => void;
}> = ({ groups, initialGroupIndex, initialScrollTop = 0, onBack, onViewProduct, onAction }) => {
  const [activeGroupIndex, setActiveGroupIndex] = React.useState(initialGroupIndex);
  const [currentPage, setCurrentPage] = React.useState(1);
  const pageSize = 10;
  
  const currentGroup = groups[activeGroupIndex] || groups[0];
  const totalPages = Math.ceil(currentGroup.list.length / pageSize);
  
  // 切换分组时重置页码
  React.useEffect(() => {
    setCurrentPage(1);
  }, [activeGroupIndex]);

  const pagedList = currentGroup.list.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 监听分组或页码变化，重置滚动位置
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const isFirstMount = React.useRef(true);

  React.useEffect(() => {
    if (scrollRef.current) {
      if (isFirstMount.current && initialScrollTop > 0) {
        scrollRef.current.scrollTop = initialScrollTop;
        isFirstMount.current = false;
      } else {
        scrollRef.current.scrollTop = 0;
      }
    }
  }, [activeGroupIndex, currentPage]);

  // 初始挂载时恢复位置
  React.useEffect(() => {
    if (scrollRef.current && initialScrollTop > 0) {
      scrollRef.current.scrollTop = initialScrollTop;
    }
    isFirstMount.current = false;
  }, []);

  // 处理滑动翻页
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const [touchEnd, setTouchEnd] = React.useState<number | null>(null);
  
  // 图片预览状态
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState('');
  const [previewImageTitle, setPreviewImageTitle] = React.useState('');

  const minSwipeDistance = 50;

  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe && currentPage < totalPages) {
      setCurrentPage(prev => prev + 1);
    } else if (isRightSwipe && currentPage > 1) {
      setCurrentPage(prev => prev - 1);
    }
  };

  return (
    <div className="w-full h-full bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300 overflow-hidden">
      {/* 顶部栏 */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30 border-b border-gray-100/50">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
        <h2 className="text-[15px] font-medium text-gray-900 tracking-tight">所有商品</h2>
        <div className="w-9" />
      </div>

      {/* 分组栏 */}
      <div className="px-5 py-3 bg-white border-b border-gray-100 flex flex-wrap gap-2 shrink-0">
        {groups.map((group, idx) => (
          <button
            key={idx}
            onClick={() => setActiveGroupIndex(idx)}
            className={`px-3.5 py-1.5 text-[11px] font-medium rounded transition-all duration-300 whitespace-nowrap active:scale-95 border uppercase tracking-wider ${
              activeGroupIndex === idx 
                ? 'bg-gray-900 text-white border-gray-900 shadow-sm' 
                : 'bg-white text-gray-500 hover:bg-gray-50 border-gray-100'
            }`}
          >
            {group.title} ({group.list.length})
          </button>
        ))}
      </div>

      {/* 商品列表区域 */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto no-scrollbar touch-pan-y min-h-[400px]"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div className="divide-y divide-gray-100 min-h-full">
          {pagedList.map((product, index) => {
            const imageUrls = getAllImageUrls(product.image_urls, 'thumbnail');
            return (
              <div 
                key={index} 
                onClick={() => onViewProduct(product, scrollRef.current?.scrollTop || 0)}
                className="px-5 py-6 bg-white hover:bg-gray-50/30 transition-all cursor-pointer group border-b border-gray-100 last:border-0 flex flex-col gap-4 active:bg-gray-100"
              >
                {/* 1. 顶部：编号 + 名称 */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-[18px] font-black font-mono text-gray-900 leading-none flex-shrink-0">
                      {product.code || 'NO.CODE'}
                    </span>
                    <h3 className="text-[18px] font-bold text-gray-800 truncate">
                      {product.name || product.fabric_structure_two || '未命名商品'}
                    </h3>
                  </div>
                  
                  {/* 2. 系列标签 (移动到标题下方) */}
                  {product.series && (
                    <div className="flex flex-wrap gap-2">
                      {product.series.split(/[,，]/).filter((s: string) => s.trim()).map((s: string, idx: number) => (
                        <span key={idx} className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold bg-blue-50/80 px-2 py-0.5 rounded">
                          {s.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. 中间：详细参数 */}
                <div className="flex flex-col gap-2 py-0.5">
                  <div className="flex items-start gap-3 text-[13px]">
                    <span className="text-gray-400 font-medium flex-shrink-0 w-8">成分</span>
                    <span className="text-gray-900 leading-snug line-clamp-2">{product.elem || '-'}</span>
                  </div>
                  
                  <div className="flex items-start gap-3 text-[13px]">
                    <span className="text-gray-400 font-medium flex-shrink-0 w-8">布种</span>
                    <span className="text-gray-900 leading-snug truncate">{product.fabric_structure_two || product.series || '-'}</span>
                  </div>

                  {product.production_process && (
                    <div className="flex items-start gap-3 text-[13px]">
                      <span className="text-gray-400 font-medium flex-shrink-0 w-8">工艺</span>
                      <span className="text-gray-900 leading-snug line-clamp-1">{product.production_process}</span>
                    </div>
                  )}

                  <div className="flex items-start gap-3 text-[13px]">
                    <span className="text-gray-400 font-medium flex-shrink-0 w-8">克重</span>
                    <div className="flex items-center gap-3 text-gray-900 leading-snug">
                      <span>{product.weight ? `${product.weight}g` : '-'}</span>
                      {product.quality_level && (
                        <>
                          <span className="w-px h-2.5 bg-gray-200" />
                          <span>{product.quality_level}</span>
                        </>
                      )}
                      {product.type_notes && (
                        <>
                          <span className="w-px h-2.5 bg-gray-200" />
                          <span className="text-blue-600 font-medium">{product.type_notes}</span>
                        </>
                      )}
                      {!product.quality_level && !product.type_notes && product.type_name && (
                        <>
                          <span className="w-px h-2.5 bg-gray-200" />
                          <span className="text-blue-600 font-medium">{product.type_name}</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 text-[13px]">
                    <span className="text-gray-400 font-medium flex-shrink-0 w-8">幅宽</span>
                    <span className="text-gray-900 leading-snug">{product.width || '-'}</span>
                  </div>
                </div>

                {/* 4. 图片展示：横向多张排列，在价格上方 */}
                {imageUrls.length > 0 && (
                  <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                    {imageUrls.map((url, imgIdx) => (
                      <div key={imgIdx} className="w-24 h-24 rounded bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100/50 relative group/img">
                        <OptimizedImage 
                          src={url} 
                          alt={`${product.name || ''}-${imgIdx}`} 
                          className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                          priority={index < 4 && imgIdx === 0}
                          width={192}
                        />
                      </div>
                    ))}
                  </div>
                )}
                
                {/* 5. 底部：价格 */}
                <div className="pt-2 mt-1">
                  <div className="flex items-center gap-6">
                    {/* 公斤价 */}
                    {product.taxkgprice && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-gray-400">公斤价</span>
                        <div className="flex items-baseline gap-0.5 text-gray-900 font-semibold">
                          <span className="text-[14px] font-medium">¥</span>
                          <span className="text-[24px] leading-none tracking-tight">{product.taxkgprice}</span>
                        </div>
                      </div>
                    )}

                    {/* 米价 */}
                    {product.taxmprice && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-gray-400">米价</span>
                        <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                          <span className="text-[12px]">¥</span>
                          <span className="text-[18px] leading-none">{product.taxmprice}</span>
                        </div>
                      </div>
                    )}

                    {/* 大货价 */}
                    {product.price && (
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-[11px] font-medium text-gray-400">大货价</span>
                        <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                          <span className="text-[12px]">¥</span>
                          <span className="text-[18px] leading-none">{product.price}</span>
                        </div>
                      </div>
                    )}

                    {/* 如果没有任何具体价格，显示默认价格样式 */}
                    {!product.taxkgprice && !product.taxmprice && !product.price && (
                      <div className="flex items-baseline gap-0.5 text-gray-900 font-medium">
                        <span className="text-[13px]">¥</span>
                        <span className="text-[22px] leading-none tracking-tight font-semibold">-</span>
                        <span className="text-[11px] text-gray-400 font-normal ml-1">/米</span>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center gap-2 ml-auto">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onAction && onAction('cutSample', product);
                        // 如果是在 ProductListView 内部，没有直接访问 toast 的方法，但可以通过 onAction 传出
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-50 text-gray-600 rounded-lg hover:bg-gray-100 transition-colors active:scale-95"
                    >
                      <Scissors size={14} />
                      <span className="text-[12px] font-medium">剪样</span>
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onViewProduct(product, scrollRef.current?.scrollTop || 0);
                      }}
                      className="flex items-center gap-1.5 px-3 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors active:scale-95"
                    >
                      <Search size={14} />
                      <span className="text-[12px] font-medium">详细</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 分页控制栏 */}
      <div className="px-6 py-4 bg-white border-t border-gray-100 flex items-center justify-between shrink-0">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(prev => prev - 1)}
          className={`p-2 rounded transition-all border ${
            currentPage === 1 
              ? 'border-transparent text-gray-200 cursor-not-allowed' 
              : 'border-gray-100 text-gray-900 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <ChevronLeft size={18} />
        </button>
        
        <div className="flex flex-col items-center">
          <div className="flex items-baseline gap-1.5">
            <span className="text-[14px] font-medium text-gray-900">
              {totalPages === 0 ? 0 : currentPage}
            </span>
            <span className="text-gray-300 text-[12px]">/</span>
            <span className="text-[12px] text-gray-400">
              {totalPages}
            </span>
          </div>
          <span className="text-[10px] text-gray-300 uppercase tracking-widest mt-0.5">Swipe to flip</span>
        </div>

        <button 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(prev => prev + 1)}
          className={`p-2 rounded transition-all border ${
            currentPage === totalPages 
              ? 'border-transparent text-gray-200 cursor-not-allowed' 
              : 'border-gray-100 text-gray-900 hover:bg-gray-50 active:bg-gray-100'
          }`}
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {/* 图片预览弹窗 */}
      {isPreviewOpen && previewImageUrl && (
        <ImagePreviewModal
          url={previewImageUrl}
          title={previewImageTitle}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewImageUrl('');
            setPreviewImageTitle('');
          }}
        />
      )}
    </div>
  );
};

// 独立的商品详情视图组件
export const ProductDetailView: React.FC<{ 
  product: Product; 
  onBack: () => void;
  detailUrl?: string;
  detailField?: string;
}> = ({ product: initialProduct, onBack, detailUrl, detailField }) => {
  const [product, setProduct] = React.useState<any>(initialProduct);
  const [detailedData, setDetailedData] = React.useState<any>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState('');
  const [previewImageTitle, setPreviewImageTitle] = React.useState('');
  const [isPdfPreviewOpen, setIsPdfPreviewOpen] = React.useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = React.useState('');
  const [previewPdfTitle, setPreviewPdfTitle] = React.useState('');
  const [activeTab, setActiveTab] = React.useState('产品');
  const [toastMessage, setToastMessage] = React.useState('');
  const [showToast, setShowToast] = React.useState(false);
  
  const tabs = ['产品', '规格', '质量', '工艺', '报告'];

  const showLightHint = (msg: string) => {
    setToastMessage(msg);
    setShowToast(true);
  };
  
  // 轮播图状态
  const [currentImgIndex, setCurrentImgIndex] = React.useState(0);
  const thumbnailUrls = getAllImageUrls(product.image_urls, 'thumbnail');
  const originalImageUrls = getAllImageUrls(product.image_urls, 'original');
  const currentImageUrl = originalImageUrls[currentImgIndex] || '';
  const colorCardUrl = getColorCardUrl(product.image_urls, 'thumbnail');
  const originalColorCardUrl = getColorCardUrl(product.image_urls, 'original');

  // 处理手势滑动
  const [touchStart, setTouchStart] = React.useState<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => setTouchStart(e.touches[0].clientX);
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStart === null) return;
    const touchEnd = e.changedTouches[0].clientX;
    const diff = touchStart - touchEnd;
    
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentImgIndex < thumbnailUrls.length - 1) {
        setCurrentImgIndex(prev => prev + 1);
      } else if (diff < 0 && currentImgIndex > 0) {
        setCurrentImgIndex(prev => prev - 1);
      }
    }
    setTouchStart(null);
  };

  React.useEffect(() => {
    setProduct(initialProduct);
    setCurrentImgIndex(0); // 重置索引
  }, [initialProduct]);

  React.useEffect(() => {
    const fetchDetail = async () => {
      if (!detailUrl || !detailField || !initialProduct) return;
      
      // @ts-ignore
      const fieldValue = initialProduct[detailField];
      if (!fieldValue) return;

      setIsLoading(true);
      try {
        const separator = detailUrl.includes('?') ? '&' : '?';
        const url = `${detailUrl}${separator}${detailField}=${encodeURIComponent(fieldValue)}`;
        
        const res = await fetch(url);
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setDetailedData(json.data);
            // 同时更新基础 product 对象以保持兼容性
            const basic = json.data.basic || {};
            const specs = json.data.specs || {};
            const price = json.data.price || {};
            const operation = json.data.operation || {};
            
            setProduct((prev: any) => ({
              ...prev,
              name: basic.name || prev.name,
              code: basic.code || prev.code,
              series: basic.series || prev.series,
              image_urls: basic.image_urls || prev.image_urls,
              elem: specs.elem || prev.elem,
              fabric_structure_two: specs.fabric_structure_two || prev.fabric_structure_two,
              weight: specs.weight || prev.weight,
              width: specs.width || prev.width,
              price: price.price || prev.price,
              taxkgprice: price.taxkgprice || prev.taxkgprice,
              taxmprice: price.taxmprice || prev.taxmprice,
              stock_qty: operation.stock_qty || prev.stock_qty,
              emptyqty: price.emptyqty || prev.emptyqty,
              papertubeqty: price.papertubeqty || prev.papertubeqty,
            }));
          }
        }
      } catch (e) {
        console.error("Failed to fetch product detail:", e);
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetail();
  }, [detailUrl, detailField, initialProduct]);

  // 渲染属性行的辅助函数
  const RenderRow = ({ label, value }: { label: string; value: any }) => {
    if (value === undefined || value === null || value === '') return null;
    return (
      <div className="flex justify-between items-start py-4 text-[14px] border-b border-gray-50 last:border-none">
        <span className="text-gray-400 font-light shrink-0">{label}</span>
        <span className="text-gray-900 font-normal text-right ml-4 break-words leading-relaxed">
          {typeof value === 'string' && (value.includes('\r\n') || value.includes('\n')) ? (
            <div className="whitespace-pre-line">{value.trim()}</div>
          ) : value}
        </span>
      </div>
    );
  };

  return (
    <div className="w-full h-full bg-white flex flex-col animate-in fade-in zoom-in-95 duration-300 relative overflow-hidden">
      {isLoading && (
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 overflow-hidden z-50">
          <div className="h-full bg-blue-500 w-1/3 animate-[shimmer_1s_infinite] absolute top-0 bottom-0"></div>
        </div>
      )}
      
      {/* 详情页导航栏 */}
      <div className="px-4 py-3 flex items-center justify-between bg-white/80 backdrop-blur-md sticky top-0 z-30">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-50 rounded-full transition-colors"
        >
          <ArrowLeft size={20} className="text-gray-900" />
        </button>
        <h2 className="text-[15px] font-medium text-gray-900 tracking-tight">商品详情</h2>
        <div className="w-9" />
      </div>

      <div className="flex-1 overflow-y-auto no-scrollbar pb-10">
        {/* 1. 轮播图展示 */}
        <div 
          className="w-full aspect-square bg-gray-50 relative overflow-hidden group touch-pan-y"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          {thumbnailUrls.length > 0 ? (
            <div 
              className="w-full h-full flex transition-transform duration-500 ease-out"
              style={{ transform: `translateX(-${currentImgIndex * 100}%)` }}
            >
              {thumbnailUrls.map((url, idx) => (
                <div 
                    key={idx} 
                    className="w-full h-full flex-shrink-0 cursor-zoom-in"
                    onClick={() => {
                      setPreviewImageUrl(originalImageUrls[idx]);
                      setPreviewImageTitle(`${product.name} - ${idx + 1}`);
                      setIsPreviewOpen(true);
                    }}
                  >
                    <OptimizedImage 
                      src={url} 
                      alt={`${product.name} - ${idx + 1}`} 
                      className="w-full h-full" 
                      width={800} // 详情页轮播图使用中等大小
                      objectFit="cover"
                      priority={idx === 0}
                    />
                  </div>
              ))}
            </div>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-gray-200 text-6xl font-bold bg-gradient-to-br from-gray-50 to-gray-100">
              {product.name?.charAt(0) || '?'}
            </div>
          )}

          {/* 轮播指示器 */}
          {thumbnailUrls.length > 1 && (
            <>
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                {thumbnailUrls.map((_, idx) => (
                  <div 
                    key={idx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      currentImgIndex === idx ? 'w-6 bg-white shadow-sm' : 'w-1.5 bg-white/40'
                    }`}
                  />
                ))}
              </div>
              
              {/* 左右切换按钮 (仅在大屏幕显示或 Hover 时) */}
              <button 
                onClick={(e) => { e.stopPropagation(); currentImgIndex > 0 && setCurrentImgIndex(prev => prev - 1); }}
                className={`absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white transition-opacity ${currentImgIndex === 0 ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <ChevronLeft size={24} />
              </button>
              <button 
                onClick={(e) => { e.stopPropagation(); currentImgIndex < thumbnailUrls.length - 1 && setCurrentImgIndex(prev => prev + 1); }}
                className={`absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white transition-opacity ${currentImgIndex === thumbnailUrls.length - 1 ? 'opacity-0' : 'opacity-0 group-hover:opacity-100'}`}
              >
                <ChevronRight size={24} />
              </button>

              {/* 页码显示 */}
              <div className="absolute top-4 left-4 px-2.5 py-1 bg-black/30 backdrop-blur-md rounded-full text-white text-[11px] font-bold">
                {currentImgIndex + 1} / {thumbnailUrls.length}
              </div>
            </>
          )}

          {currentImageUrl && (
            <div className="absolute bottom-4 right-4 w-10 h-10 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
              <Maximize2 size={20} />
            </div>
          )}

          {product.series && (
            <div className="absolute top-4 right-4 flex flex-col gap-1.5 items-end z-10">
              {product.series.split(/[,，]/).map((s: string, i: number) => (
                <span key={i} className="px-2.5 py-1 bg-blue-50/90 backdrop-blur-sm shadow-sm rounded text-[11px] font-bold text-blue-600 uppercase tracking-wider">
                  {s.trim()}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 2. 标题与描述 */}
        <div className="px-6 pt-8 pb-2">
          <div className="flex justify-between items-start gap-4 mb-3">
            <h1 className="text-[24px] font-medium text-gray-900 leading-tight tracking-tight">
              {product.code ? <span className="text-gray-400 font-mono text-[18px] block mb-1">{product.code}</span> : ''}
              {product.name}
            </h1>
          </div>
          
          {detailedData?.operation?.introduce && (
            <p className="text-[14px] text-gray-500 leading-relaxed font-light">
              {detailedData.operation.introduce.trim()}
            </p>
          )}
        </div>

        {/* 3. 价格与操作 */}
        <div className="px-6 py-6 flex items-center justify-between border-b border-gray-50">
          <div className="flex items-baseline gap-1">
            <span className="text-[14px] text-gray-900 font-medium">¥</span>
            <span className="text-[28px] text-gray-900 font-semibold tracking-tight">
              {product.price || '-'}
            </span>
          </div>
          
          <button 
            onClick={() => {
              if (originalColorCardUrl) {
                setPreviewImageUrl(originalColorCardUrl);
                setPreviewImageTitle(`${product.name} - 色卡`);
                setIsPreviewOpen(true);
              } else {
                showLightHint('暂无色卡图片');
              }
            }}
            className={`px-5 py-2 text-[13px] font-medium rounded transition-all border ${
              colorCardUrl 
                ? 'border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white' 
                : 'border-gray-200 text-gray-300 cursor-not-allowed'
            }`}
          >
            查看色卡
          </button>
        </div>

        {/* 4. 切换按钮 (Tabs) */}
        <div className="px-4 sticky top-[51px] bg-white/95 backdrop-blur-sm z-20">
          <div className="flex items-center overflow-x-auto no-scrollbar border-b border-gray-100">
            {tabs.map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className="flex-1 min-w-[70px] py-4 relative flex flex-col items-center group transition-all"
              >
                <span className={`text-[13px] tracking-widest uppercase transition-colors duration-300 ${
                  activeTab === tab ? 'text-gray-900 font-semibold' : 'text-gray-400 font-normal group-hover:text-gray-600'
                }`}>
                  {tab}
                </span>
                {activeTab === tab && (
                  <div className="absolute bottom-0 w-6 h-0.5 bg-gray-900 rounded-full animate-in fade-in slide-in-from-bottom-1 duration-300" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* 5. Tab 内容区域 */}
        <div className="px-6 py-8 min-h-[400px]">
          {activeTab === '产品' && (
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {detailedData?.operation?.introduce && (
                <section>
                  <div className="flex items-center gap-3 mb-6">
                    <div className="w-1 h-1 bg-gray-900 rounded-full" />
                    <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">产品描述</h3>
                  </div>
                  <div className="text-[15px] text-gray-600 leading-loose whitespace-pre-line font-light italic">
                    {detailedData.operation.introduce.trim()}
                  </div>
                </section>
              )}
              
              <section>
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-1 h-1 bg-gray-900 rounded-full" />
                  <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">基础信息</h3>
                </div>
                <div className="divide-y divide-gray-50 border-t border-gray-50">
                  <RenderRow label="产品编号" value={product.code} />
                  <RenderRow label="产品名称" value={product.name} />
                  <RenderRow label="系列" value={product.series} />
                  <RenderRow label="库存数量" value={product.stock_qty || '0'} />
                  <RenderRow label="空差" value={product.emptyqty} />
                  <RenderRow label="纸管" value={product.papertubeqty} />
                  <RenderRow label="年度销量" value="*" />
                </div>
              </section>

              {detailedData?.operation?.notice && detailedData.operation.notice.trim() !== '.' && (
                <section className="bg-gray-50 rounded p-6 border border-gray-100">
                  <p className="text-gray-900 text-[13px] font-semibold mb-2 flex items-center gap-2 uppercase tracking-wider">
                    <AlertCircle size={14} /> 温馨提示
                  </p>
                  <p className="text-gray-500 text-[13px] leading-relaxed font-light">
                    {detailedData.operation.notice}
                  </p>
                </section>
              )}
            </div>
          )}

          {activeTab === '规格' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-1 bg-gray-900 rounded-full" />
                <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">规格参数</h3>
              </div>
              <div className="divide-y divide-gray-50 border-t border-gray-50">
                {detailedData?.specs ? (
                  <>
                    <RenderRow label="成分" value={detailedData.specs.elem} />
                    <RenderRow label="内部成分" value={detailedData.specs.inelem} />
                    <RenderRow label="布种" value={detailedData.specs.fabric_structure_two} />
                    <RenderRow label="纱支" value={detailedData.specs.yarncount} />
                    <RenderRow label="克重" value={detailedData.specs.weight ? `${detailedData.specs.weight}g` : null} />
                    <RenderRow label="幅宽" value={detailedData.specs.width} />
                    <RenderRow label="横密" value={detailedData.specs.hdensity} />
                    <RenderRow label="纵密" value={detailedData.specs.ldensity} />
                    <RenderRow label="纤维类型" value={detailedData.specs.fiber_type} />
                  </>
                ) : (
                  <div className="py-20 text-center text-gray-300 text-[14px] font-light italic">暂无规格信息</div>
                )}
              </div>
            </div>
          )}

          {activeTab === '质量' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-1 bg-gray-900 rounded-full" />
                <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">质量指标</h3>
              </div>
              <div className="divide-y divide-gray-50 border-t border-gray-50">
                {detailedData?.quality ? (
                  <>
                    <RenderRow label="质量等级" value={detailedData.quality.quality_level} />
                    <RenderRow label="可定制等级" value={detailedData.quality.customizable_grade} />
                    <RenderRow label="抗起毛起球" value={detailedData.quality.unpilling} />
                    <RenderRow label="干摩擦牢度" value={detailedData.quality.dry_rubbing_fastness} />
                    <RenderRow label="湿擦牢度" value={detailedData.quality.wet_rubfast} />
                    <RenderRow label="耐光色牢度" value={detailedData.quality.light_fastness} />
                    <RenderRow label="水洗缩率(直)" value={detailedData.quality.swzoomin} />
                    <RenderRow label="水洗缩率(横)" value={detailedData.quality.shzoomin} />
                    <RenderRow label="扭度" value={detailedData.quality.twist} />
                    <RenderRow label="PH值" value={detailedData.quality.sph} />
                  </>
                ) : (
                  <div className="py-20 text-center text-gray-300 text-[14px] font-light italic">暂无质量指标</div>
                )}
              </div>
            </div>
          )}

          {activeTab === '工艺' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-1 h-1 bg-gray-900 rounded-full" />
                <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">生产工艺</h3>
              </div>
              <div className="divide-y divide-gray-50 border-t border-gray-50">
                {detailedData?.process ? (
                  <>
                    <RenderRow label="工艺流程" value={detailedData.process.production_process} />
                    <RenderRow label="染色方法" value={detailedData.process.dyemethod} />
                    <RenderRow label="染整工艺" value={detailedData.process.dyeing_process} />
                    <RenderRow label="开发类型" value={detailedData.process.devtype} />
                  </>
                ) : (
                  <div className="py-20 text-center text-gray-300 text-[14px] font-light italic">暂无工艺信息</div>
                )}
              </div>
            </div>
          )}

          {activeTab === '报告' && (
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-1 h-1 bg-gray-900 rounded-full" />
                <h3 className="text-gray-900 font-semibold text-[15px] tracking-wide uppercase">相关报告</h3>
              </div>
              {detailedData?.basic?.report_urls && Array.isArray(detailedData.basic.report_urls) && detailedData.basic.report_urls.length > 0 ? (
                <div className="space-y-4">
                  {detailedData.basic.report_urls.map((report: string, idx: number) => {
                    let name = '';
                    let url = '';

                    if (report.includes(': `')) {
                      const parts = report.split(': `');
                      name = parts[0].trim();
                      url = parts[1]?.replace('`', '').trim();
                    } else if (report.includes(':http')) {
                      const firstColonIndex = report.indexOf(':http');
                      name = report.substring(0, firstColonIndex).trim();
                      url = report.substring(firstColonIndex + 1).trim();
                    } else {
                      const parts = report.split(':');
                      if (parts.length > 1) {
                        name = parts[0].trim();
                        url = parts.slice(1).join(':').trim();
                      } else {
                        url = report.trim();
                        name = url.split('/').pop() || '相关报告';
                      }
                    }

                    if (!url) return null;
                    const isPdf = url.toLowerCase().endsWith('.pdf') || name.toLowerCase().includes('pdf');

                    return (
                      <div 
                        key={idx}
                        onClick={() => {
                          if (isPdf) {
                            setPreviewPdfUrl(url);
                            setPreviewPdfTitle(name);
                            setIsPdfPreviewOpen(true);
                          } else {
                            window.open(url, '_blank');
                          }
                        }}
                        className="group flex items-center justify-between p-5 bg-white border border-gray-100 rounded hover:border-gray-900 transition-all cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <div className={`w-10 h-10 rounded flex items-center justify-center shrink-0 bg-gray-50 text-gray-400`}>
                            <FileText size={20} strokeWidth={1.5} />
                          </div>
                          <div className="min-w-0">
                            <p className="text-[14px] font-medium text-gray-900 truncate group-hover:text-gray-900 transition-colors">{name}</p>
                            <p className="text-[11px] text-gray-400 mt-0.5 uppercase tracking-tighter">{isPdf ? 'PDF Document' : 'External Link'}</p>
                          </div>
                        </div>
                        <ChevronRight size={16} className="text-gray-300 group-hover:text-gray-900 transition-colors" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-20 flex flex-col items-center justify-center text-gray-300 gap-3 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                  <FileText size={40} className="opacity-20" />
                  <p className="text-[14px]">暂无相关报告文件</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* 底部操作栏 */}
      <div className="px-6 py-4 bg-white/90 backdrop-blur-md border-t border-gray-100 flex items-center gap-4 shrink-0 z-30">
        <button 
          onClick={() => showLightHint('订单助手即将接入~')}
          className="flex-1 py-4 bg-gray-900 text-white text-[15px] font-medium rounded active:scale-[0.98] transition-all flex items-center justify-center gap-2 uppercase tracking-widest"
        >
          <ShoppingCart size={18} strokeWidth={1.5} />
          立刻下单
        </button>
      </div>

      <Toast 
        message={toastMessage} 
        visible={showToast} 
        onClose={() => setShowToast(false)} 
      />

      {/* 图片预览弹窗 */}
      {isPreviewOpen && previewImageUrl && (
        <ImagePreviewModal
          url={previewImageUrl}
          title={previewImageTitle || product.name}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewImageUrl('');
            setPreviewImageTitle('');
          }}
        />
      )}

      {/* PDF预览弹窗 */}
      {isPdfPreviewOpen && previewPdfUrl && (
        <PdfPreviewModal 
          url={previewPdfUrl} 
          title={previewPdfTitle}
          onClose={() => setIsPdfPreviewOpen(false)} 
        />
      )}
    </div>
  );
};

interface ProductGroup {
  title: string;
  list: Product[];
  filters?: any;
}

interface ProductListProps {
  query?: string;   // 搜索关键词
  think?: string;   // 思考过程
  intent?: string;  // 意图识别
  groups?: ProductGroup[];
  list?: any[];     // 可能是 Product[] (旧格式) 或 ProductGroup[] (新格式)
  title?: string;   // 兼容单个分组格式
  isStreaming?: boolean; // 是否正在流式输出
  onAction?: (action: string, data: any) => void;
}

const LABEL_MAP: Record<string, string> = {
  'FABRIC_STRUCTURE_TWO': '布种',
  'fabric_structure_two': '布种',
  'series': '系列',
  'code': '编号',
  'name': '名称',
  'elem': '成分',
  'weight': '克重',
  'price': '价格',
  'production_process': '工艺',
  'emptyqty': '空差',
  'papertubeqty': '纸管',
  'quality_level': '质量等级'
};

const ProductListRenderer: React.FC<ProductListProps> = ({ query, think, intent, groups, list, title, isStreaming, onAction }) => {
  // 递归寻找包含商品列表的最深层 list，并展平所有层级
  const flattenToProducts = (data: any): any[] => {
    if (!data) return [];
    
    // 如果是数组，处理每一项并展平
    if (Array.isArray(data)) {
      let result: any[] = [];
      for (const item of data) {
        const subItems = flattenToProducts(item);
        result = result.concat(subItems);
      }
      return result;
    }

    // 如果是对象
    if (typeof data === 'object') {
      // 检查是否是商品对象（通过特征字段判断）
      const isProduct = 'elem' in data || 'price' in data || 'code' in data || 'name' in data;
      if (isProduct) return [data];

      // 如果不是商品，但包含 list 或 items 字段，则深挖
      if ('list' in data && Array.isArray(data.list)) {
        return flattenToProducts(data.list);
      }
      if ('items' in data && Array.isArray(data.items)) {
        return flattenToProducts(data.items);
      }
    }

    return [];
  };

  // 获取归一化后的分组数据
  const displayGroups = React.useMemo(() => {
    if (!list) return [];
    
    // 归一化为数组处理
    const normalizedList = Array.isArray(list) ? list : (list.items || list.groups || [list]);

    return normalizedList.map((item: any) => {
      if (item && typeof item === 'object') {
        // 兼容不同的标题字段
        const titleText = item.title || item.element || item.name || title || "推荐商品";
        // 兼容不同的商品列表字段
        const products = flattenToProducts(item.list || item.items || item);
        
        // 提取筛选信息
        const filterData = (item.query && typeof item.query === 'object') ? item.query : item;

        return {
          title: titleText,
          list: products,
          filters: filterData
        };
      }
      return null;
    })
    .filter((g: any) => g !== null)
    .sort((a: any, b: any) => {
      // 有数据的排在前面，没数据的排在后面
      const aLen = a.list?.length || 0;
      const bLen = b.list?.length || 0;
      if (aLen > 0 && bLen === 0) return -1;
      if (aLen === 0 && bLen > 0) return 1;
      return 0;
    });
  }, [list, title]);

  const [expandedFilters, setExpandedFilters] = React.useState<Set<number>>(new Set());
  const [viewMode, setViewMode] = React.useState<'card' | 'table' | 'simple'>('simple');
  const listScrollRef = React.useRef<HTMLDivElement>(null);

  // 图片预览状态
  const [isPreviewOpen, setIsPreviewOpen] = React.useState(false);
  const [previewImageUrl, setPreviewImageUrl] = React.useState('');
  const [previewImageTitle, setPreviewImageTitle] = React.useState('');

  // 解析指定分组中的筛选维度
  const getGroupFilters = (group: any) => {
    const source = group?.filters;
    if (!source || typeof source !== 'object') return null;

    const excludedFields = ['title', 'sort', 'fields', 'list', 'items', 'element', 'query'];
    const filtered: Record<string, any> = {};
    let hasData = false;

    Object.entries(source).forEach(([key, value]) => {
      if (
        !excludedFields.includes(key) && 
        value !== undefined && 
        value !== null && 
        value !== ''
      ) {
        // 允许字符串、数字或非空数组
        if (typeof value !== 'object' || Array.isArray(value)) {
          // 如果是数组，过滤掉空值并转为字符串
          if (Array.isArray(value)) {
            const validValues = value.filter(v => v !== null && v !== undefined && v !== '');
            if (validValues.length > 0) {
              filtered[key] = validValues.join('、');
              hasData = true;
            }
          } else {
            filtered[key] = value;
            hasData = true;
          }
        }
      }
    });

    return hasData ? filtered : null;
  };

  const toggleFilter = (idx: number) => {
    const next = new Set(expandedFilters);
    if (next.has(idx)) next.delete(idx);
    else next.add(idx);
    setExpandedFilters(next);
  };

  const hasInfo = !!(query || think || intent);
  if (displayGroups.length === 0 && !hasInfo) return null;

  return (
    <div className="w-full bg-white rounded-t-none rounded-b-[26px] overflow-hidden flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* 搜索关键词与思考文本 */}
      {hasInfo && (
        <div className="px-5 py-4 bg-gray-50/50 border-b border-gray-100 flex flex-col gap-3">
          {(query || intent) && (
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0 flex-1">
                <span className="px-1.5 py-0.5 bg-gray-900 text-white text-[10px] font-medium rounded-sm uppercase tracking-widest shrink-0">
                  AI推理
                </span>
              </div>
              {intent && (
                <div className="px-1.5 py-0.5 bg-gray-50 text-[10px] font-medium text-gray-400 border border-gray-100 rounded-sm whitespace-nowrap uppercase tracking-wider">
                  {intent}
                </div>
              )}
            </div>
          )}
          
          {think && (
            <div className="text-[13px] text-gray-500 leading-relaxed italic">
              <ReactMarkdown 
                remarkPlugins={[remarkGfm]}
                components={{
                  strong: ({node, ...props}) => <span className="font-bold text-gray-700" {...props} />,
                  p: ({node, ...props}) => <p className="mb-1 last:mb-0 whitespace-pre-wrap" {...props} />,
                  ul: ({node, ...props}) => <ul className="list-disc list-inside pl-2" {...props} />,
                  ol: ({node, ...props}) => <ol className="list-decimal list-inside pl-2" {...props} />,
                  li: ({node, ...props}) => <li className="mb-0.5" {...props} />
                }}
              >
                {think.replace(/\\n/g, '\n')}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}

      {/* 商品列表 - 平铺显示所有分组 */}
      {displayGroups.filter(g => g.title !== '无识别').length > 0 && (
        <div ref={listScrollRef} className="flex-1 overflow-y-auto no-scrollbar min-h-[320px]">
          <div className="flex flex-col">
            {/* 顶部汇总信息 */}
            <div className="px-5 py-3 border-b border-gray-100 bg-white flex items-center justify-between">
              <p className="text-[14px] text-gray-500 font-medium">
                共找到 {displayGroups.filter(g => g.title !== '无识别').reduce((acc, g) => acc + g.list.length, 0)} 款
              </p>

              {/* 视图切换按钮 */}
              <div className="flex items-center bg-gray-100/80 p-0.5 rounded-lg">
                <button
                  onClick={() => setViewMode('simple')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 ${
                    viewMode === 'simple' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-[12px] font-bold">简单</span>
                </button>
                <button
                  onClick={() => setViewMode('card')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all duration-300 ${
                    viewMode === 'card' 
                      ? 'bg-white text-gray-900 shadow-sm' 
                      : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <span className="text-[12px] font-bold">详细</span>
                </button>
              </div>
            </div>

            {displayGroups.map((group, groupIdx) => {
              if (group.title === '无识别') return null;
              const groupFilters = getGroupFilters(group);
              const isExpanded = expandedFilters.has(groupIdx);

              return (
                <div key={groupIdx} className={`${groupIdx > 0 ? 'mt-6' : ''}`}>
                  {/* 分组标题 - 仅在详细模式或有多个分组时显示 */}
                  {(viewMode !== 'simple' || displayGroups.length > 1) && (
                    <div className="px-5 py-4 bg-gray-50/50 flex items-center justify-between border-y border-gray-100/50">
                      <div className="flex items-center gap-2.5">
                        <div className="w-1.5 h-4 bg-gray-900 rounded-full" />
                        <span className="text-[14px] font-black text-gray-900 tracking-tight">{group.title}</span>
                      </div>
                      
                      {/* 分组右侧：筛选维度按钮 */}
                      {groupFilters && (
                        <button 
                          onClick={() => toggleFilter(groupIdx)}
                          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all duration-300 ${
                            isExpanded 
                              ? 'bg-gray-900 text-white shadow-sm' 
                              : 'text-gray-400 hover:text-gray-900 hover:bg-gray-100'
                          }`}
                        >
                          <Filter className="w-3.5 h-3.5" />
                          <span className="text-[12px] font-bold">筛选维度</span>
                          <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </button>
                      )}
                    </div>
                  )}

                  {/* 展开的筛选维度内容 */}
                  {groupFilters && isExpanded && (
                    <div className="px-5 py-3 bg-white border-b border-gray-100 animate-in fade-in slide-in-from-top-2 duration-300">
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(groupFilters).map(([key, value]) => (
                          <div key={key} className="flex items-center bg-gray-100/50 rounded-md px-2 py-1">
                            <span className="text-[11px] text-gray-500 mr-1.5 uppercase tracking-tight font-medium">
                              {LABEL_MAP[key] || LABEL_MAP[key.toUpperCase()] || key}:
                            </span>
                            <span className="text-[12px] text-gray-700 font-bold">{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 分组内的商品列表 */}
                  <div className="overflow-x-auto no-scrollbar">
                    {group.list.length > 0 ? (
                      viewMode === 'simple' ? (
                        <div className="grid grid-cols-5 gap-2 px-5 py-4 bg-white">
                          {group.list.slice(0, 15).map((product, index) => (
                            <div 
                              key={`${groupIdx}-${index}`}
                              onClick={() => onAction && onAction('viewProduct', product)}
                              className="aspect-[4/3] bg-gray-50 border border-gray-100 rounded-sm flex items-center justify-center p-1 cursor-pointer hover:border-gray-900 transition-all active:scale-95"
                            >
                              <span className="text-[10px] font-bold font-mono text-gray-900 text-center break-all line-clamp-2 leading-tight">
                                {product.code || 'N/A'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : viewMode === 'card' ? (
                        <div className="divide-y divide-gray-100">
                          {group.list.slice(0, 3).map((product, index) => {
                          const imageUrls = getAllImageUrls(product.image_urls, 'thumbnail');
                          
                          return (
                            <div 
                              key={`${groupIdx}-${index}`} 
                              onClick={() => onAction && onAction('viewProduct', product)}
                              className="px-4 py-4 hover:bg-gray-50/50 transition-colors cursor-pointer group flex flex-col gap-3 active:bg-gray-100"
                            >
                              {/* 1. 顶部：编号 + 名称 */}
                              <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="text-[18px] font-black font-mono text-gray-900 leading-none flex-shrink-0">
                                    {product.code || 'NO.CODE'}
                                  </span>
                                  <h3 className="text-[18px] font-bold text-gray-800 truncate">
                                    {product.name || product.fabric_structure_two || '未命名商品'}
                                  </h3>
                                </div>
                                
                                {/* 2. 系列标签 (移动到标题下方) */}
                                {product.series && (
                                  <div className="flex flex-wrap gap-2">
                                    {product.series.split(/[,，]/).filter(s => s.trim()).map((s, idx) => (
                                      <span key={idx} className="flex items-center gap-1 text-[11px] text-blue-600 font-semibold bg-blue-50/80 px-2 py-0.5 rounded">
                                        {s.trim()}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>

                              {/* 3. 中间：详细参数 */}
                              <div className="flex flex-col gap-2 py-0.5">
                                <div className="flex items-start gap-3 text-[13px]">
                                  <span className="text-gray-400 font-medium flex-shrink-0 w-8">成分</span>
                                  <span className="text-gray-900 leading-snug line-clamp-2">{product.elem || '-'}</span>
                                </div>
                                
                                <div className="flex items-start gap-3 text-[13px]">
                                  <span className="text-gray-400 font-medium flex-shrink-0 w-8">布种</span>
                                  <span className="text-gray-900 leading-snug truncate">{product.fabric_structure_two || product.series || '-'}</span>
                                </div>

                                <div className="flex items-start gap-3 text-[13px]">
                                  <span className="text-gray-400 font-medium flex-shrink-0 w-8">克重</span>
                                  <div className="flex items-center gap-3 text-gray-900 leading-snug">
                                    <span>{product.weight ? `${product.weight}g` : '-'}</span>
                                    {product.quality_level && (
                                      <>
                                        <span className="w-px h-2.5 bg-gray-200" />
                                        <span>{product.quality_level}</span>
                                      </>
                                    )}
                                    {product.type_notes && (
                                      <>
                                        <span className="w-px h-2.5 bg-gray-200" />
                                        <span className="text-blue-600 font-medium">{product.type_notes}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* 4. 图片展示：横向多张排列，在价格上方 */}
                              {imageUrls.length > 0 && (
                                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                                  {imageUrls.map((url, imgIdx) => (
                                    <div key={imgIdx} className="w-[60px] h-[60px] rounded bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100/50 relative group/img">
                                      <OptimizedImage 
                                        src={url} 
                                        alt={`${product.name || ''}-${imgIdx}`} 
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover/img:scale-110"
                                        priority={groupIdx === 0 && index < 4 && imgIdx === 0}
                                        width={120}
                                      />
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* 5. 底部：价格 */}
                              <div className="pt-2 mt-1">
                                <div className="flex items-center gap-6">
                                  {/* 公斤价 */}
                                  {product.taxkgprice && (
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-[11px] font-medium text-gray-400">公斤价</span>
                                      <div className="flex items-baseline gap-0.5 text-gray-900 font-semibold">
                                        <span className="text-[14px] font-medium">¥</span>
                                        <span className="text-[24px] leading-none tracking-tight">{product.taxkgprice}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 米价 */}
                                  {product.taxmprice && (
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-[11px] font-medium text-gray-400">米价</span>
                                      <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                                        <span className="text-[12px]">¥</span>
                                        <span className="text-[18px] leading-none">{product.taxmprice}</span>
                                      </div>
                                    </div>
                                  )}

                                  {/* 大货价 */}
                                  {product.price && (
                                    <div className="flex items-baseline gap-1.5">
                                      <span className="text-[11px] font-medium text-gray-400">大货价</span>
                                      <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                                        <span className="text-[12px]">¥</span>
                                        <span className="text-[18px] leading-none">{product.price}</span>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        </div>
                      ) : (
                        <div className="px-2 py-2">
                          <table className="w-full text-left border-collapse min-w-[780px]">
                            <thead>
                              <tr className="bg-gray-50/30">
                                <th className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest border-b border-gray-100/50">商品</th>
                                <th className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest border-b border-gray-100/50">系列/布种</th>
                                <th className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest border-b border-gray-100/50">成分/克重</th>
                                <th className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest border-b border-gray-100/50">质量指标</th>
                                <th className="px-3 py-2 text-[10px] font-medium text-gray-400 uppercase tracking-widest border-b border-gray-100/50 text-right">价格</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                              {group.list.slice(0, 5).map((product, index) => {
                                const imageUrl = getImageUrl(product.image_urls, 'thumbnail');
                                const originalUrl = getImageUrl(product.image_urls, 'original');
                                return (
                                  <tr 
                                    key={`${groupIdx}-${index}`}
                                    onClick={() => onAction && onAction('viewProduct', product)}
                                    className="hover:bg-gray-50/30 transition-all cursor-pointer group"
                                  >
                                    <td className="px-3 py-3">
                                      <div className="flex items-center gap-3">
                                        {/* 缩略图 */}
                                        <div 
                                          className="w-[60px] h-[60px] rounded bg-gray-50 flex-shrink-0 overflow-hidden border border-gray-100/50 relative cursor-zoom-in"
                                          onClick={(e) => {
                                            if (originalUrl) {
                                              e.stopPropagation();
                                              setPreviewImageUrl(originalUrl);
                                              setPreviewImageTitle(product.name || '');
                                              setIsPreviewOpen(true);
                                            }
                                          }}
                                        >
                                          {imageUrl ? (
                                            <OptimizedImage 
                                              src={imageUrl} 
                                              alt={product.name || ''} 
                                              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                                              width={120}
                                            />
                                          ) : (
                                            <div className="absolute inset-0 flex items-center justify-center text-gray-200 font-medium text-[10px]">
                                              {product.name ? product.name.charAt(0) : '?'}
                                            </div>
                                          )}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                          <span className="text-[10px] font-mono font-bold text-gray-400 leading-none mb-1 uppercase tracking-tighter bg-gray-50 px-1 py-0.5 rounded">{product.code || '-'}</span>
                                          <span className="text-[13px] font-medium text-gray-900 truncate max-w-[120px]">{product.name || '-'}</span>
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex flex-col gap-1">
                                        {product.series ? (
                                          <div className="flex flex-wrap gap-1">
                                            {product.series.split(/[,，]/).filter((s: string) => s.trim()).map((s: string, idx: number) => (
                                              <span key={idx} className="text-[9px] text-blue-600 font-bold bg-blue-50/80 px-1.5 py-0.5 rounded leading-none uppercase tracking-wider">
                                                {s.trim()}
                                              </span>
                                            ))}
                                          </div>
                                        ) : null}
                                        <span className="text-[11px] text-gray-500 truncate max-w-[120px]">{product.fabric_structure_two || '-'}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex flex-col gap-0.5">
                                        <div className="text-[11px] text-gray-600 leading-tight">
                                          {(product.elem || '-').split(/[ 　,，]/).filter(Boolean).map((part: string, idx: number) => (
                                            <div key={idx} className="truncate max-w-[120px]">{part}</div>
                                          ))}
                                        </div>
                                        <span className="text-[10px] text-gray-400 mt-0.5 font-medium">{product.weight ? `${product.weight}g` : '-'}</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3">
                                      <div className="flex flex-col gap-1">
                                        <div className="text-[10px] text-gray-400 font-medium">
                                          {product.quality_level || '合格品'}
                                          {product.customizable_grade && (
                                            <span className="text-gray-900 ml-1">({product.customizable_grade})</span>
                                          )}
                                        </div>
                                      </div>
                                    </td>
                                    <td className="px-3 py-3 text-right">
                                      <div className="flex flex-col items-end gap-1">
                                        {/* 公斤价 */}
                                        {product.taxkgprice && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-medium">公斤价</span>
                                            <div className="flex items-baseline gap-0.5 text-gray-900 font-semibold">
                                              <span className="text-[10px] font-medium">¥</span>
                                              <span className="text-[15px] tracking-tight">{product.taxkgprice}</span>
                                            </div>
                                          </div>
                                        )}
                                        
                                        {/* 米价 */}
                                        {product.taxmprice && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-medium">米价</span>
                                            <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                                              <span className="text-[10px]">¥</span>
                                              <span className="text-[13px]">{product.taxmprice}</span>
                                            </div>
                                          </div>
                                        )}

                                        {/* 大货价 */}
                                        {product.price && (
                                          <div className="flex items-center gap-1.5">
                                            <span className="text-[10px] text-gray-400 font-medium">大货价</span>
                                            <div className="flex items-baseline gap-0.5 text-gray-600 font-medium">
                                              <span className="text-[10px]">¥</span>
                                              <span className="text-[13px]">{product.price}</span>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )
                    ) : (
                      <div className="px-5 py-8 text-center bg-white">
                        <p className="text-[13px] text-gray-400 font-light italic">该分组暂无相关商品</p>
                      </div>
                    )}
                  </div>

              </div>
            );
          })}

            {/* 查看全部按钮 */}
            {displayGroups.filter(g => g.title !== '无识别').reduce((acc, g) => acc + g.list.length, 0) > 0 && (
              <div className="px-5 py-4 bg-gray-50/50 border-t border-gray-100">
                <button 
                  onClick={() => onAction && onAction('viewAllProducts', { groups: displayGroups })}
                  className="w-full py-3 bg-white border border-gray-200 rounded-xl text-[14px] font-bold text-gray-900 hover:bg-gray-50 transition-all active:scale-[0.98] shadow-sm flex items-center justify-center gap-2"
                >
                  <span>查看全部</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </button>
              </div>
            )}
            
            {isStreaming && (
              <div className="px-4 py-3 flex items-center gap-4 animate-pulse">
                <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-100 rounded w-1/3" />
                  <div className="h-3 bg-gray-100 rounded w-full" />
                </div>
              </div>
            )}
          </div>
        </div>
      )}
      {/* 图片预览弹窗 */}
      {isPreviewOpen && previewImageUrl && (
        <ImagePreviewModal
          url={previewImageUrl}
          title={previewImageTitle}
          onClose={() => {
            setIsPreviewOpen(false);
            setPreviewImageUrl('');
            setPreviewImageTitle('');
          }}
        />
      )}
    </div>
  );
};

export default ProductListRenderer;
