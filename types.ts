
export enum Role {
  USER = 'user',
  MODEL = 'model'
}

export interface Attachment {
  id: string;
  data?: string; // Base64 string (optional while loading)
  url?: string;  // Remote URL after upload
  mimeType: string;
  name: string;
  isLoading?: boolean;
}

export interface Message {
  id: string;
  role: Role;
  content: string;
  timestamp: number;
  attachments?: Attachment[];
  intent?: string;
  advice?: string[];
}

export interface Product {
  // 核心标识
  code: string;
  name: string;
  
  // 价格相关
  price: number | string;           // 销售价
  taxkgprice?: number | string;    // 含税公斤价
  taxmprice?: number | string;     // 含税米价
  fewprice?: number | string;      // 少量价
  
  // 规格属性
  elem: string;                     // 成分
  weight: number | string;          // 克重
  width?: string | number;          // 幅宽
  series?: string;                  // 系列
  fabric_structure_two?: string;      // 布种 (ERP)
  
  // 库存与状态
  stock_qty: string | number;       // 库存数量
  type_notes?: string;              // 类型备注 (如: 保留款)
  quality_level?: string;           // 质量等级 (如: 合格品)
  customizable_grade?: string;      // 可订等级 (如: 一等品)
  release_date?: string;            // 发布日期
  
  // 包装相关
  emptyqty?: string | number;       // 空管重量
  papertubeqty?: string | number;   // 纸管重量
  production_process?: string;      // 生产工艺
  
  // 媒体与报告
  image_urls?: string;              // 图片链接
  report_urls?: string;             // 报告链接 (pdf等)
  
  // 其他
  sale_num_year?: number | string;
  code_start?: string;
}

export interface Assistant {
  id: string;
  name: string;
  description: string;
  avatar: string;
  color: string;
  n8nUrl: string;
  n8nParams: string; // JSON string
  detailUrl?: string; // Product detail API URL
  detailField?: string; // Field to append to URL (e.g., "code")
  suggestionUrl?: string; // Suggestion/Follow-up API URL
  suggestionParams?: string; // Suggestion/Follow-up params (JSON string)
}

export interface Material {
  file_type: string;
  pic_url: string | null;
  video_path: string | null;
}

export interface MaterialListGroup {
  success: boolean;
  total: number;
  list: Material[];
}

export interface MaterialListData {
  element: '素材列表';
  query?: string;
  intent?: string;
  list: MaterialListGroup[];
}

export interface QuestionListData {
  element: '问题清单';
  list: string[];
}

export interface ChatState {
  messages: Message[];
  isStreaming: boolean;
  error: string | null;
}
