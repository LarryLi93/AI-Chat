import React, { useState } from 'react';
import { 
  FileText, 
  Play, 
  Image as ImageIcon, 
  X, 
  Download,
  FileSpreadsheet,
  File as FileIcon,
  Maximize2,
  ZoomIn,
  ZoomOut
} from 'lucide-react';
import { MaterialListData, Material } from '../types';

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

const getFullUrl = (path: string | null) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  return `${BASE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
};

const getFileType = (material: Material) => {
  if (material.video_path) return 'video';
  const url = material.pic_url || '';
  if (url.match(/\.(jpg|jpeg|png|gif|webp|svg|bmp)$/i)) return 'image';
  if (url.match(/\.(pdf)$/i)) return 'pdf';
  if (url.match(/\.(xlsx|xls|csv)$/i)) return 'excel';
  if (url.match(/\.(doc|docx)$/i)) return 'word';
  if (url.match(/\.(ppt|pptx)$/i)) return 'ppt';
  return 'file';
};

const MaterialItem: React.FC<{ material: Material; onClick: () => void }> = ({ material, onClick }) => {
  const type = getFileType(material);
  const url = type === 'image' 
    ? (formatImageUrl(material.pic_url, 'thumbnail') || '')
    : getFullUrl(material.pic_url || material.video_path);
  const fileName = (material.pic_url || material.video_path || '').split('/').pop() || '未知素材';
  
  return (
    <div 
      onClick={onClick}
      className="group relative aspect-square rounded-xl overflow-hidden bg-gray-50 border border-gray-100 hover:border-blue-300 transition-all cursor-pointer shadow-sm hover:shadow-md active:scale-[0.98]"
    >
      {type === 'image' ? (
        <img src={url} alt="material" className="w-full h-full object-cover transition-transform group-hover:scale-110" />
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
          <div className="p-3 rounded-2xl bg-white shadow-sm group-hover:shadow transition-all group-hover:-translate-y-1">
            {type === 'video' && <Play size={28} className="text-blue-500 fill-blue-500/10" />}
            {type === 'pdf' && <FileText size={28} className="text-red-500" />}
            {type === 'excel' && <FileSpreadsheet size={28} className="text-green-600" />}
            {type === 'word' && <FileIcon size={28} className="text-blue-600" />}
            {type === 'ppt' && <FileIcon size={28} className="text-orange-500" />}
            {type === 'file' && <FileIcon size={28} className="text-gray-400" />}
          </div>
          <span className="text-[11px] font-bold text-gray-500 uppercase tracking-tight text-center line-clamp-2 px-2 leading-tight">
            {fileName}
          </span>
        </div>
      )}
      
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
      
      {/* Type Badge */}
      <div className="absolute top-2 right-2 px-1.5 py-1 bg-white/90 backdrop-blur-sm rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-all translate-y-1 group-hover:translate-y-0">
        <Maximize2 size={14} className="text-gray-600" />
      </div>

      {/* Video Indicator */}
      {type === 'video' && (
        <div className="absolute bottom-2 right-2 w-6 h-6 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
          <Play size={10} fill="currentColor" />
        </div>
      )}
    </div>
  );
};

const PreviewModal: React.FC<{ material: Material; onClose: () => void }> = ({ material, onClose }) => {
  const type = getFileType(material);
  const url = type === 'image' 
    ? (formatImageUrl(material.pic_url, 'thumbnail') || '')
    : getFullUrl(material.pic_url || material.video_path);
  const fileName = (material.pic_url || material.video_path || '').split('/').pop() || '未知素材';
  
  const [scale, setScale] = useState(1);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
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
    if (type !== 'image') return;
    setIsDragging(true);
    setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y });
  };

  const onMouseMove = (e: React.MouseEvent) => {
    if (isDragging && type === 'image') {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const onMouseUp = () => setIsDragging(false);

  // 触控处理
  const onTouchStart = (e: React.TouchEvent) => {
    if (type !== 'image') return;
    const touch = e.touches[0];
    setIsDragging(true);
    setDragStart({ x: touch.clientX - position.x, y: touch.clientY - position.y });
  };

  const onTouchMove = (e: React.TouchEvent) => {
    if (isDragging && type === 'image') {
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
    if (type !== 'image') return;
    if (e.deltaY < 0) handleZoomIn();
    else handleZoomOut();
  };

  return (
    <div 
      className="fixed inset-0 z-[100] flex flex-col bg-black/95 animate-in fade-in duration-300"
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
      onTouchEnd={onTouchEnd}
    >
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/50 backdrop-blur-md border-b border-white/10 shrink-0 z-20">
        <div className="flex flex-col min-w-0">
          <h3 className="text-white text-[14px] font-medium truncate pr-4">{fileName}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-white/40 text-[10px] uppercase tracking-widest font-bold">{type}</span>
            <div className="w-1 h-1 rounded-full bg-white/20" />
            <span className="text-white/40 text-[10px]">PREVIEW MODE</span>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {type === 'image' && (
            <div className="flex items-center bg-white/10 backdrop-blur rounded-full px-1">
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
          )}
          <a 
            href={url} 
            download={fileName}
            target="_blank"
            rel="noopener noreferrer"
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white/80 hover:text-white"
            title="下载"
          >
            <Download size={20} />
          </a>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/10 rounded-full transition-colors text-white"
          >
            <X size={24} />
          </button>
        </div>
      </div>
      
      {/* Content Area */}
      <div 
        className="flex-1 w-full h-full relative overflow-hidden flex items-center justify-center p-4 bg-black/20 touch-none"
        onWheel={handleWheel}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
      >
        {type === 'image' && (
          <div className="relative w-full h-full flex items-center justify-center">
            <img 
              ref={imgRef}
              src={url} 
              alt="Preview" 
              className={`max-w-full max-h-full transition-transform duration-100 select-none shadow-2xl ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`} 
              style={{
                transform: `translate(${position.x}px, ${position.y}px) scale(${scale})`,
              }}
              draggable={false}
              onDoubleClick={handleReset}
            />
          </div>
        )}
        {type === 'video' && (
          <div className="w-full max-w-4xl aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-white/5">
            <video 
              src={url} 
              controls 
              autoPlay 
              className="w-full h-full"
            />
          </div>
        )}
        {type === 'pdf' && (
          <div className="w-full h-full max-w-5xl bg-white rounded-xl overflow-hidden shadow-2xl animate-in zoom-in-95 duration-500">
            <iframe 
              src={`${url}#toolbar=0&view=FitH`} 
              className="w-full h-full border-none" 
              title="PDF Preview" 
            />
          </div>
        )}
        {(type === 'excel' || type === 'word' || type === 'ppt' || type === 'file') && (
          <div className="flex flex-col items-center gap-8 text-center animate-in zoom-in-95 duration-500 max-w-md">
            <div className="w-32 h-32 rounded-[40px] bg-white/5 flex items-center justify-center border border-white/10 shadow-2xl relative group">
               <div className="absolute inset-0 bg-white/5 rounded-[40px] blur-xl opacity-0 group-hover:opacity-100 transition-opacity" />
               {type === 'excel' && <FileSpreadsheet size={64} className="text-green-500 relative" />}
               {type === 'word' && <FileIcon size={64} className="text-blue-500 relative" />}
               {type === 'ppt' && <FileIcon size={64} className="text-orange-500 relative" />}
               {type === 'file' && <FileIcon size={64} className="text-gray-400 relative" />}
            </div>
            <div className="space-y-3">
              <p className="text-white text-xl font-bold px-10 tracking-tight">{fileName}</p>
              <p className="text-white/40 text-[14px] leading-relaxed">
                当前文件类型不支持在线预览<br/>
                建议下载后使用本地软件查看
              </p>
            </div>
            <a 
              href={url} 
              download={fileName}
              target="_blank"
              rel="noopener noreferrer"
              className="group flex items-center gap-3 px-10 py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl font-bold transition-all active:scale-95 shadow-xl shadow-blue-900/20"
            >
              <Download size={20} className="transition-transform group-hover:-translate-y-1" />
              立即下载文件
            </a>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      {type === 'image' && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 px-4 py-2 bg-black/40 backdrop-blur rounded-full text-white/60 text-[11px] pointer-events-none z-20">
          双击重置 · 滚轮缩放 · 拖拽移动
        </div>
      )}
    </div>
  );
};

const MaterialListRenderer: React.FC<MaterialListData & { onAction?: (action: string, data: any) => void }> = (props) => {
  const [previewMaterial, setPreviewMaterial] = useState<Material | null>(null);
  
  // Flatten the materials from all groups
  const materials = props.list.flatMap(group => group.list);

  if (materials.length === 0) {
    return (
      <div className="p-8 text-center text-gray-400 bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
        <p className="text-sm">未找到相关素材</p>
      </div>
    );
  }

  return (
    <div className="w-full bg-white rounded-[26px] overflow-hidden border border-gray-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between bg-gradient-to-r from-blue-50/30 to-transparent">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-blue-500 flex items-center justify-center text-white shadow-sm shadow-blue-200">
            <ImageIcon size={16} />
          </div>
          <div>
            <h3 className="text-[15px] font-bold text-gray-900 tracking-tight">素材列表</h3>
            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-widest mt-0.5">
              Found {materials.length} Items
            </p>
          </div>
        </div>
        {props.query && (
          <div className="px-3 py-1 bg-gray-50 rounded-full border border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {props.query}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="p-5">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {materials.map((item, idx) => (
            <MaterialItem 
              key={idx} 
              material={item} 
              onClick={() => setPreviewMaterial(item)} 
            />
          ))}
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-3 bg-gray-50/50 border-t border-gray-50 flex items-center justify-center">
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-[0.2em]">
          End of List
        </span>
      </div>

      {/* Preview Modal */}
      {previewMaterial && (
        <PreviewModal 
          material={previewMaterial} 
          onClose={() => setPreviewMaterial(null)} 
        />
      )}
    </div>
  );
};

export default MaterialListRenderer;
