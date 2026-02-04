import re
import pymysql
import datetime
import asyncio
import logging
import json
from dbutils.pooled_db import PooledDB
from decimal import Decimal

import os
from dotenv import load_dotenv

# 加载 .env 文件
load_dotenv()

# --- 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("query.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)
from typing import Dict, Any, Optional, List, Tuple, Union
from fastapi import FastAPI, HTTPException, Request, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.concurrency import run_in_threadpool
import uvicorn
from pydantic import BaseModel, Field, ConfigDict
from wechat.Wechat import WeChat

app = FastAPI(title="Fabric Search API", description="纺织面料产品搜索服务")

# --- 跨域配置 ---
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 允许所有域名，生产环境建议指定具体域名
    allow_credentials=True,
    allow_methods=["*"],  # 允许所有 HTTP 方法
    allow_headers=["*"],  # 允许所有请求头
)

# --- 数据库配置 ---
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '139.196.198.169'), 
    'port': int(os.getenv('DB_PORT', 7306)),
    'user': os.getenv('DB_USER', 'sale'), 
    'password': os.getenv('DB_PASSWORD', '123456'),
    'db': os.getenv('DB_NAME', 'sale'), 
    'cursorclass': pymysql.cursors.DictCursor,
    'charset': 'utf8mb4'
}

# 初始化连接池
pool = PooledDB(
    creator=pymysql,
    mincached=10,    # 初始化时，连接池中至少创建的空闲连接数
    maxcached=50,   # 连接池中最多闲置的连接数
    maxconnections=100, # 连接池允许的最大连接数
    blocking=True,  # 连接池中如果没有可用连接后，是否阻塞等待
    **DB_CONFIG
)

def get_db_connection():
    return pool.connection()

# --- 字段定义 ---
# 默认返回字段
DEFAULT_RETURN_FIELDS = [
    'code', 'name', 'weight', 'width', 'taxkgprice', 'price', 'taxmprice', 'fewprice',
    'elem', 'inelem', 'fabric_structure_two', 'fabric_erp', 'emptyqty', 'papertubeqty', 'type_notes',
    'image_urls', 'report_urls', 'code_start', 'customizable_grade',
    'series', 'release_date','sale_num_year', 'production_process'
]

# 字段名映射表 (中英文对照) - 仅供参考或特殊需求，目前主要返回英文键名
FIELD_MAPPING = {
    'code': 'code',
    'name': 'name',
    'ename': 'ename',
    'elem': 'elem',
    'inelem': 'inelem',
    'yarncount': 'yarncount',
    'weight': 'weight',
    'width': 'width',
    'twist': 'twist',
    'swzoomin': 'swzoomin',
    'shzoomin': 'shzoomin',
    'sph': 'sph',
    'unitqty': 'unitqty',
    'fewprice': 'fewprice',
    'unitid': 'unitid',
    'unitrate': 'unitrate',
    'fewunitid': 'fewunitid',
    'fewunitrate': 'fewunitrate',
    'emptyqty': 'emptyqty',
    'papertubeqty': 'papertubeqty',
    'makedate': 'makedate',
    'colorfastnotes': 'colorfastnotes',
    'unpilling': 'unpilling',
    'whitefiber': 'whitefiber',
    'wetrubfast': 'wetrubfast',
    'ldensity': 'ldensity',
    'hdensity': 'hdensity',
    'devproid': 'devproid',
    'category': 'category',
    'propinnum': 'propinnum',
    'dnumber': 'dnumber',
    'spinntype': 'spinntype',
    'foreignname': 'foreignname',
    'glosscommid': 'glosscommid',
    'price': 'price',
    'fiber_type': 'fiber_type',
    'yarn_type': 'yarn_type',
    'production_process': 'production_process',
    'quality_level': 'quality_level',
    'devtype': 'devtype',
    'notice': 'notice',
    'ennotice': 'ennotice',
    'introduce': 'introduce',
    'eintroduce': 'eintroduce',
    'dyeing_process': 'dyeing_process',
    'customizable_grade': 'customizable_grade',
    'season_new': 'season_new',
    'fabric_structure': 'fabric_structure',
    'has_rib': 'has_rib',
    'dyemethod': 'dyemethod',
    'className': 'className',
    'slogan': 'slogan',
    'fun_level': 'fun_level',
    'type_notes': 'type_notes',
    'stock_qty': 'stock_qty',
    'image_urls': 'image_urls',
    'makedate_year': 'makedate_year',
    'makedate_month': 'makedate_month',
    'code_start': 'code_start',
    'fabric_structure_two': 'fabric_structure_two',
    'fabric_erp': 'fabric_erp',
    'report_urls': 'report_urls',
    'release_date': 'release_date',
    'mprice': 'mprice',
    'yprice': 'yprice',
    'kgprice': 'kgprice',
    'taxmprice': 'taxmprice',
    'taxyprice': 'taxyprice', 
    'taxkgprice': 'taxkgprice',
    'sale_num_year': 'sale_num_year',
    'spring_color_fastness': 'spring_color_fastness',
    'dry_rubbing_fastness': 'dry_rubbing_fastness',
    'light_fastness': 'light_fastness',
    'fabe': 'fabe',
    'color_name': 'color_name',
    'series': 'series',
    'applicable_crowd': 'applicable_crowd'
}

DETAIL_CATEGORIES = {
    "basic": [
        "code", "name", "ename", "series", "release_date", "makedate_year", 
        "makedate_month", "devproid", "image_urls", "report_urls", "code_start"
    ],
    "specs": [
        "elem", "inelem", "yarncount", "dnumber", "weight", "width", 
        "ldensity", "hdensity", "propinnum", "fiber_type", "yarn_type", 
        "spinntype", "glosscommid", "fabric_structure_two", "fabric_erp", "fabric_structure", 
        "className", "has_rib"
    ],
    "quality": [
        "twist", "swzoomin", "shzoomin", "sph", "unpilling", "whitefiber", 
        "wetrubfast", "dry_rubbing_fastness", "spring_color_fastness", 
        "light_fastness", "quality_level", "customizable_grade", "fun_level", 
        "colorfastnotes"
    ],
    "process": [
        "production_process", "devtype", "dyemethod", "dyeing_process", 
        "category", "foreignname"
    ],
    "price": [
        "price", "unitid", "fewprice", "fewunitid", "fewunitrate", "mprice", 
        "yprice", "kgprice", "taxmprice", "taxyprice", "taxkgprice", 
        "unitqty", "emptyqty", "papertubeqty", "unitrate"
    ],
    "operation": [
        "type_notes", "stock_qty", "sale_num_year", "season_new", "fabe", 
        "notice", "ennotice", "introduce", "eintroduce", "slogan"
    ]
}

# 数值字段（允许范围查询）
NUMERIC_FIELDS = {
    'weight', 'width', 'price', 'taxkgprice', 'taxmprice', 'fewprice', 
    'emptyqty', 'papertubeqty', 'stock_qty', 'sale_num_year'
}

# 严格文本字段（不允许模糊匹配）
STRICT_TEXT_FIELDS = {
    'code', 'name', 'fabric_structure_two', 'fabric_erp', 'inelem', 'code_start',
    'devproid', 'customizable_grade',
    'spring_color_fastness', 'light_fastness', 'dry_rubbing_fastness',
    'image_urls', 'report_urls', 'type_notes', 
    'release_date','sale_num_year', 'series',
    'unpilling', 'ldensity', 'hdensity', 'propinnum', 'dnumber',
    'color_name', 'applicable_crowd'
}

SOFT_FIELDS = {'fabe', 'introduce', 'production_process'}
SIMPLE_SQL_TEXT_FIELDS = ['code', 'name', 'code_start']

# --- Pydantic 模型 ---
class ProductSearchRequest(BaseModel):
    limit: int = Field(1000, description="返回条数限制")
    sort_by: Optional[str] = Field(None, description="排序字段")
    fields: List[str] = Field(default_factory=lambda: DEFAULT_RETURN_FIELDS, description="需要返回的字段列表")
    
    model_config = ConfigDict(extra="allow") 

def serialize_row(row: Dict) -> Dict:
    """清洗数据：Decimal -> float, Date -> str, 处理 URL 列表"""
    new_row = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            new_row[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            new_row[k] = str(v)
        elif isinstance(v, bytes):
            new_row[k] = v.decode('utf-8', errors='ignore')
        elif k in ('image_urls', 'report_urls'):
            # 处理 URL 列表（支持字符串和列表格式）
            items = []
            if isinstance(v, str) and v:
                items = [item.strip().replace('`', '') for item in v.split(',') if item.strip()]
            elif isinstance(v, list):
                items = [str(item).strip().replace('`', '') for item in v]
            
            if k == 'image_urls':
                # 再次确保图片列表中只有图片类型，过滤掉 PDF 等
                IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')
                final_imgs = []
                for item in items:
                    path_part = item.split(':')[-1].split('?')[0].lower()
                    if any(path_part.endswith(ext) for ext in IMAGE_EXTS):
                        final_imgs.append(item)
                    elif path_part.endswith('.pdf'):
                        continue
                    else:
                        # 兜底：其他未知类型暂留
                        final_imgs.append(item)
                
                # 图片字段根据数量返回字符串或列表
                if not final_imgs:
                    new_row[k] = []
                else:
                    new_row[k] = final_imgs if len(final_imgs) > 1 else final_imgs[0]
            else:
                # 报告字段统一返回列表
                new_row[k] = items
        else:
            new_row[k] = v
    return new_row

def build_numeric_sql(column, query_str):
    if not query_str: return None
    clean_str = re.sub(r'[^\d\.\-<>=]', '', str(query_str))
    range_match = re.match(r'^(\d+(?:\.\d+)?)-(\d+(?:\.\d+)?)$', clean_str)
    if range_match: return f"{column} BETWEEN {range_match.group(1)} AND {range_match.group(2)}"
    compare_match = re.match(r'^(>=|<=|>|<|=)(\d+(?:\.\d+)?)$', clean_str)
    if compare_match: return f"{column} {compare_match.group(1)} {compare_match.group(2)}"
    return None

def build_elem_sql_filter(query_str):
    """
    针对 elem 字段生成 SQL 粗筛条件 (LIKE)
    逻辑：
    1. 提取所有中文/英文成分名 (忽略数字和符号)
    2. 如果含 '/' (OR关系)，SQL 用 OR 连接
    3. 否则 (AND关系)，SQL 用 AND 连接
    返回: (sql_clause, params)
    """
    if not query_str: return None, []
    
    # 提取关键词，例如 "棉>95%" -> ["棉"]
    keywords = re.findall(r'[\u4e00-\u9fa5a-zA-Z]+', str(query_str))
    if not keywords: return None, []
    
    conditions = []
    params = []
    for kw in keywords:
        conditions.append("elem LIKE %s")
        params.append(f"%{kw}%")
    
    if '/' in query_str:
        # 或关系：(elem LIKE %s OR elem LIKE %s)
        return f"({' OR '.join(conditions)})", params
    else:
        # 且关系：elem LIKE %s AND elem LIKE %s
        return " AND ".join(conditions), params

def build_text_sql_filter(column, query_val):
    """
    针对文本字段生成 SQL 过滤条件
    支持: 
    1. 字符串 (含 / 和 +)
    2. 列表 (转为 IN 或 OR 处理)
    返回: (sql_clause, params)
    """
    if not query_val: return None, []
    
    # 特殊处理列表格式
    if isinstance(query_val, list):
        if not query_val: return None, []
        # 对于 code_start 或精确匹配字段，使用 IN 提高性能
        if column == 'code_start':
            placeholders = ", ".join(["%s"] * len(query_val))
            return f"{column} IN ({placeholders})", [str(i) for i in query_val]
        # 其他字段转为 OR 逻辑
        query_val = "/".join(str(i) for i in query_val)
    
    val = str(query_val).strip()
    if not val: return None, []

    # 简单的单个词 (无 /、+ 和 ,)
    if '/' not in val and '+' not in val and ',' not in val:
        if column == 'code':
            # 款号改回模糊匹配，以支持如 6228 和 6228A 等关联查询
            param = val if '%' in val else f"%{val}%"
            return f"{column} LIKE %s", [param]
        elif column == 'code_start':
            # code_start 依然保持精确匹配以保证性能
            return f"{column} = %s", [val]
        
        param = val if '%' in val else f"%{val}%"
        return f"{column} LIKE %s", [param]
    
    # 处理 OR 逻辑 (/)
    if '/' in val and '+' not in val:
        parts = [p.strip() for p in val.split('/') if p.strip()]
        if not parts: return None, []
        
        if column == 'code_start':
            # code_start 在 OR 逻辑下也应保持精确匹配
            placeholders = ", ".join(["%s"] * len(parts))
            return f"{column} IN ({placeholders})", parts
            
        clauses = [f"{column} LIKE %s" for _ in parts]
        params = [p if '%' in p else f"%{p}%" for p in parts]
        return f"({' OR '.join(clauses)})", params

    # 处理 AND 逻辑 (+ 或 ,)
    if ('+' in val or ',' in val) and '/' not in val:
        parts = [p.strip() for p in re.split(r'[+,]', val) if p.strip()]
        if not parts: return None, []
        clauses = [f"{column} LIKE %s" for _ in parts]
        params = [p if '%' in p else f"%{p}%" for p in parts]
        return " AND ".join(clauses), params

    # 复杂逻辑 (既有 / 又有 +) 暂时只在 SQL 层做部分过滤或跳过
    return None, []

def check_text_logic(target_text, query_str):
    if not query_str: return True
    # 处理列表格式，默认转为 OR 逻辑
    if isinstance(query_str, list):
        query_str = "/".join(str(i) for i in query_str)
        
    target_text = str(target_text or "").lower()
    query_str = str(query_str).lower()
    for group in query_str.split('/'):
        # 同时支持 + 、 , 和 中文逗号 、 作为 AND 逻辑
        if all(cond.strip() in target_text for cond in re.split(r'[+,，、]', group) if cond.strip()):
            return True
    return False

def check_composition_logic(elem_str, logic_query):
    if not logic_query: return True
    elem_str_lower = str(elem_str or "").lower()
    # 提取成分和比例，支持 "95%棉" 或 "棉95%" 格式
    matches = re.findall(r'(\d+(?:\.\d+)?)%\s*([\u4e00-\u9fa5a-zA-Z]+)|([\u4e00-\u9fa5a-zA-Z]+)(\d+(?:\.\d+)?)%', elem_str_lower)
    row_elems = {}
    for m in matches:
        if m[0] and m[1]: # 95%棉
            row_elems[m[1]] = float(m[0])
        elif m[2] and m[3]: # 棉95%
            row_elems[m[2]] = float(m[3])

    for group in str(logic_query).split('/'):
        group_pass = True
        for cond in group.split('+'):
            cond = cond.strip().replace('%', '')
            if not cond: continue
            op_match = re.search(r'(>=|<=|>|<|=)([\d\.]+)', cond)
            if op_match:
                op, target_val = op_match.group(1), float(op_match.group(2))
                name = cond.replace(op_match.group(0), '').strip().lower()
                val = row_elems.get(name, 0)
                if op == '>': match = val > target_val
                elif op == '<': match = val < target_val
                elif op == '>=': match = val >= target_val
                elif op == '<=': match = val <= target_val
                else: match = val == target_val
            else:
                # 如果没有操作符（如仅搜索 "棉"），只要关键词在解析出的成分中，或者直接在原始字符串中即可
                cond_lower = cond.lower()
                match = (cond_lower in row_elems) or (cond_lower in elem_str_lower)
            if not match: group_pass = False; break
        if group_pass: return True
    return False

def get_sort_score(row: Dict, search_code: str, soft_criteria: Dict[str, Any]) -> Tuple:
    code = str(row.get('code', ''))
    sales = float(row.get('sale_num_year') or 0)
    
    match_score = 10
    if search_code:
        clean_search = search_code.strip().replace('%', '')
        if code == clean_search: match_score = 0
        elif code.startswith(clean_search): match_score = 1
        elif clean_search in code: match_score = 2

    # 软指标评分：匹配到的关键词越多，分数越低（越靠前）
    soft_match_count = 0
    for key, query_val in soft_criteria.items():
        if not query_val: continue
        target_text = str(row.get(key, '') or "").lower()
        
        # 提取关键词列表
        if isinstance(query_val, list):
            keywords = [str(i) for i in query_val]
        else:
            keywords = re.split(r'[/,，、+]', str(query_val))
            
        for kw in keywords:
            kw = kw.strip().lower()
            if kw and kw in target_text:
                soft_match_count += 1
                
    soft_score = 100 - soft_match_count

    if code.startswith('6'): series_score = 1
    elif code.startswith('9'): series_score = 2
    elif code.startswith('9'): series_score = 3
    elif code.startswith('3'): series_score = 4
    elif code.startswith('2'): series_score = 5
    else: series_score = 6
    
    return (match_score, soft_score, series_score, -sales)

# --- 辅助函数 ---

def process_material_images(rows: List[Dict], codes: List[str]):
    """批量获取并合并素材图"""
    if not codes:
        return
    
    # 构造正则表达式，匹配包含任意一个款号的名称
    # 过滤掉空的款号，并对款号进行转义以防特殊字符干扰正则
    valid_codes = [re.escape(str(c)) for c in codes if str(c).strip()]
    if not valid_codes:
        return
        
    # 将 REGEXP 改为多个 LIKE 条件，以兼容不支持正则的 MySQL 环境
    clauses = ["name LIKE %s" for _ in valid_codes]
    params = [f"%{c}%" for c in valid_codes]
    img_sql = f"SELECT name, pic_url FROM ai_source_app_v1 WHERE ({' OR '.join(clauses)}) AND file_type = 'image'"
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(img_sql, params)
            img_rows = cursor.fetchall()
        conn.close()
        
        # 将图片按款号归类
        code_to_imgs = {}
        for img_row in img_rows:
            name = img_row.get('name', '')
            pic_url = img_row.get('pic_url', '')
            if not pic_url:
                continue
                
            # 直接使用原始路径，前端会负责拼接域名
            new_url = pic_url
            formatted_img = f"素材:{new_url}"
            
            # 检查这个图片属于哪个款号 (一个图片名可能匹配多个款号，虽然概率低)
            for code in codes:
                if str(code) in name:
                    if code not in code_to_imgs:
                        code_to_imgs[code] = []
                    code_to_imgs[code].append(formatted_img)
        
        # 合并到原始行中
        for row in rows:
            code = str(row.get('code', ''))
            material_imgs = code_to_imgs.get(code, [])
            
            # 1. 获取并规范化已有的图片和报告列表
            current_images = row.get('image_urls', [])
            if isinstance(current_images, str):
                current_images = [item.strip() for item in current_images.split(',') if item.strip()]
            elif not isinstance(current_images, list):
                current_images = []
            
            current_reports = row.get('report_urls', [])
            if isinstance(current_reports, str):
                current_reports = [item.strip() for item in current_reports.split(',') if item.strip()]
            elif not isinstance(current_reports, list):
                current_reports = []
            
            # 2. 重新分类：确保图片字段只有图片，PDF 移至报告
            final_images = []
            final_reports = list(current_reports)
            IMAGE_EXTS = ('.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp')
            
            for item in current_images:
                clean_item = item.strip().replace('`', '')
                # 获取纯路径部分进行后缀判断
                path_part = clean_item.split(':')[-1].split('?')[0].lower()
                
                if any(path_part.endswith(ext) for ext in IMAGE_EXTS):
                    final_images.append(item)
                elif path_part.endswith('.pdf'):
                    final_reports.append(item)
                else:
                    # 兜底：未知类型暂留图片字段
                    final_images.append(item)
            
            # 3. 合并素材图 (素材图在 SQL 阶段已过滤 file_type='image')
            if material_imgs:
                final_images.extend(material_imgs)
            
            # 4. 写回 row (统一去重)
            row['image_urls'] = list(dict.fromkeys(final_images))
            row['report_urls'] = list(dict.fromkeys(final_reports))
                
    except Exception as e:
        logger.error(f"Error fetching material images: {e}")

def translate_dict_keys(d: Dict[str, Any]) -> Dict[str, Any] :
    """将字典的键名转换为英文映射 (直接返回原始键)"""
    if not isinstance(d, dict):
        return d
    return {k: v for k, v in d.items()}

def organize_detail_by_categories(data: Dict[str, Any]) -> Dict[str, Any]:
    """将产品详情数据按类别整理，直接使用英文键名"""
    result = {}
    
    for category_name, field_keys in DETAIL_CATEGORIES.items():
        category_data = {}
        for key in field_keys:
            if key in data:
                # 直接使用英文键名
                category_data[key] = data[key]
        result[category_name] = category_data
    
    return result

# --- API 接口 ---

def perform_single_search(query: Dict[str, Any]) -> Dict[str, Any]:
    """执行单条搜索逻辑"""
    # 1. 解析参数
    # 不再使用 pop，避免修改原始字典
    title = query.get('title')
    limit_val = query.get('limit', 100)
    limit = int(limit_val) if limit_val and str(limit_val).isdigit() else 100
    # 强制限制最大返回条数为 5000
    if limit > 100:
        limit = 100
    
    # 兼容 sort 和 sort_by
    user_sort = query.get('sort', query.get('sort_by'))
    if not user_sort: user_sort = None
    
    requested_fields = query.get('fields', DEFAULT_RETURN_FIELDS)
    if not requested_fields:
        requested_fields = DEFAULT_RETURN_FIELDS
    elif isinstance(requested_fields, str):
        # 支持 "field1 / field2" 或 "field1,field2" 格式
        requested_fields = [f.strip() for f in re.split(r'[/,|+]', requested_fields) if f.strip()]
    
    # 2. 分离软硬指标
    strict_query = {}
    soft_query = {}
    # 定义需要排除的元数据字段，避免它们进入 strict_query 干扰（虽然逻辑上会自动跳过，但排除更清晰）
    metadata_fields = {'title', 'limit', 'sort', 'sort_by', 'fields', 'mode'}
    
    for k, v in query.items():
        if v is None or k in metadata_fields: continue
        if k in SOFT_FIELDS: soft_query[k] = v
        else: strict_query[k] = v
            
    search_code_val = strict_query.get('code', '')
    mode = query.get('mode', 1)
    if mode is None:
        mode = 1

    # 3. SQL 构造
    # 只选择必要的字段：过滤字段 + 返回字段 + 排序/逻辑字段
    required_fields = set(requested_fields) | {'code', 'sale_num_year', 'elem', 'weight'}
    # 添加查询中涉及的字段
    for k in query.keys():
        if k in NUMERIC_FIELDS or k in STRICT_TEXT_FIELDS or k in SOFT_FIELDS:
            required_fields.add(k)
    
    fields_sql = ", ".join(required_fields)
    sql_template = f"SELECT {fields_sql} FROM ai_product_app_v1 WHERE 1=1"
    
    # A. 模式过滤 (mode=1 时仅筛选 6/9/3 开头的款号，且运营分类为 现货/订单/订单主推)
    if str(mode) == '1':
        sql_template += " AND (code_start in ('6', '9', '3')) AND (type_notes in ('现货', '订单', '订单主推'))"
    elif str(mode) == '2':
        # 如果有 mode=2 的逻辑，可以在此添加
        pass
    
    params = []

    # A. 数值字段 SQL
    for key, val in strict_query.items():
        if key in NUMERIC_FIELDS:
            clause = build_numeric_sql(key, val)
            if clause: sql_template += f" AND {clause}"
    
    # B. 文本字段 SQL (包含 code, name, fabric_structure_two 等)
    sql_filtered_fields = set()
    for key in STRICT_TEXT_FIELDS:
        if key == 'elem': continue
        val = strict_query.get(key)
        if not val: continue
        
        clause, c_params = build_text_sql_filter(key, val)
        if clause:
            sql_template += f" AND {clause}"
            params.extend(c_params)
            sql_filtered_fields.add(key)
    
    # C. 成分字段 SQL 粗筛
    if 'elem' in strict_query and strict_query['elem']:
        elem_clause, elem_params = build_elem_sql_filter(strict_query['elem'])
        if elem_clause:
            sql_template += f" AND {elem_clause}"
            params.extend(elem_params)

    sql_template += " LIMIT 5000"

    # 4. 执行查询
    try:
        logger.info(f"Executing SQL: {sql_template} with params: {params}")
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql_template, params)
            rows = cursor.fetchall()
        conn.close()
        logger.info(f"SQL returned {len(rows)} rows")
    except Exception as e:
        result = {
            "total": 0, 
            "list": [], 
            "error": f"Database Error: {str(e)}"
        }
        return result

    # 5. Python 筛选 (精细逻辑)
    filtered_rows = []
    for row in rows:
        # 筛选时，克重为空的需要过滤 (如果是在 mode=1 模式下)
        if str(mode) == '1':
            weight_val = row.get('weight')
            if weight_val is None or str(weight_val).strip() == '' or float(weight_val or 0) <= 0:
                continue

        match = True
        for key, val in strict_query.items():
            if key in NUMERIC_FIELDS: continue
            if key in sql_filtered_fields: continue # SQL 已完全过滤
            
            # 成分精细筛选 (>95% 等逻辑在此处理)
            if key == 'elem':
                if not check_composition_logic(row.get('elem'), val): match = False; break
            elif key in STRICT_TEXT_FIELDS:
                # 兼容列表格式
                if isinstance(val, list):
                    val = "/".join(str(i) for i in val)
                if not check_text_logic(row.get(key), val): match = False; break
        
        if match:
            filtered_rows.append(row)

    # 6. 计算总数
    total_count = len(filtered_rows)

    # 7. 排序与截断
    if user_sort:
        # 处理类似 "price ASC" 的情况
        sort_parts = str(user_sort).strip().split()
        sort_field = sort_parts[0]
        reverse_order = True
        if len(sort_parts) > 1 and sort_parts[1].upper() == 'ASC':
            reverse_order = False
            
        # 如果是价格相关字段排序，过滤掉价格为空或为 0 的记录
        price_related_fields = {
            'price', 'taxkgprice', 'taxmprice', 'fewprice', 
            'mprice', 'yprice', 'kgprice', 'taxyprice', 
            'gkgprice', 'gtaxkgprice'
        }
        if sort_field in price_related_fields:
            filtered_rows = [
                r for r in filtered_rows 
                if r.get(sort_field) and float(r.get(sort_field)) > 0
            ]
            
        try:
            filtered_rows.sort(key=lambda r: float(r.get(sort_field) or 0), reverse=reverse_order)
        except:
            filtered_rows.sort(key=lambda r: str(r.get(sort_field) or ''), reverse=reverse_order)
    else:
        filtered_rows.sort(key=lambda r: get_sort_score(r, str(search_code_val), soft_query))

    # 8. 分页
    final_rows = filtered_rows[:limit]
    
    # 9. 批量获取素材图 (如果请求了 image_urls)
    if 'image_urls' in requested_fields:
        final_codes = [str(r.get('code', '')) for r in final_rows if r.get('code')]
        process_material_images(final_rows, final_codes)

    # 10. 构建结果
    cleaned_rows = []
    for row in final_rows:
        serialized = serialize_row(row)
        # 仅保留请求的字段，保持英文键名
        filtered_row = {k: v for k, v in serialized.items() if k in requested_fields}
        
        # 限制列表中的图片和报告数量，防止 JSON 过大导致 LLM 输出截断
        if 'image_urls' in filtered_row and isinstance(filtered_row['image_urls'], list):
            filtered_row['image_urls'] = filtered_row['image_urls'][:3]
        if 'report_urls' in filtered_row and isinstance(filtered_row['report_urls'], list):
            filtered_row['report_urls'] = filtered_row['report_urls'][:3]
            
        cleaned_rows.append(filtered_row)

    result = {
        "total": min(total_count, limit),
        "list": cleaned_rows
    }
    return result

@app.post("/api/product_search")
async def product_search(request_data: Any = Body(...)):
    # 1. 参数归一化：统一转为列表处理
    logger.info(f"\n Received request_data: {json.dumps(request_data, ensure_ascii=False)} \n")
    queries = []
    is_list_input = isinstance(request_data, list)
    
    if is_list_input:
        for item in request_data:
            if isinstance(item, dict):
                if 'tool_call' in item:
                    tool_calls = item['tool_call']
                    if isinstance(tool_calls, list):
                        for tc in tool_calls:
                            if isinstance(tc, dict):
                                q = tc.copy()
                                if 'title' in item and 'title' not in q: q['title'] = item['title']
                                if 'mode' in item and 'mode' not in q: q['mode'] = item['mode']
                                queries.append(q)
                    elif isinstance(tool_calls, dict):
                        q = tool_calls.copy()
                        if 'title' in item and 'title' not in q: q['title'] = item['title']
                        if 'mode' in item and 'mode' not in q: q['mode'] = item['mode']
                        queries.append(q)
                else:
                    queries.append(item)
    elif isinstance(request_data, dict):
        if 'tool_call' in request_data:
            tool_calls = request_data['tool_call']
            if isinstance(tool_calls, list):
                for tc in tool_calls:
                    if isinstance(tc, dict):
                        q = tc.copy()
                        if 'title' in request_data and 'title' not in q: q['title'] = request_data['title']
                        if 'mode' in request_data and 'mode' not in q: q['mode'] = request_data['mode']
                        queries.append(q)
            elif isinstance(tool_calls, dict):
                q = tool_calls.copy()
                if 'title' in request_data and 'title' not in q: q['title'] = request_data['title']
                if 'mode' in request_data and 'mode' not in q: q['mode'] = request_data['mode']
                queries.append(q)
        else:
            queries.append(request_data)
    else:
        return {"error": "Invalid request format", "title": "", "query": {}, "total": 0, "list": []}

    # 2. 逐条执行查询并合并结果 (并行执行)
    async def process_query(q):
        # 即使 q 不是字典，也返回一个基础结构以保持数组长度一致
        if not isinstance(q, dict):
            return {
                "title": "",
                "query": {},
                "total": 0,
                "list": []
            }
        
        # 使用 run_in_threadpool 执行同步的数据库查询逻辑，避免阻塞事件循环
        search_res = await run_in_threadpool(perform_single_search, q)
        
        # 始终返回结果结构，即使 total 为 0
        return {
            "title": q.get("title", ""),
            "query": translate_dict_keys(q),
            "total": search_res.get("total", 0),
            "list": search_res.get("list", [])
        }

    # 并行处理所有查询
    tasks = [process_query(q) for q in queries]
    results = await asyncio.gather(*tasks)
    
    # 3. 兼容返回格式
    if not is_list_input:
        if results:
            return results[0]
        # 如果 queries 为空（极少发生），返回默认空对象
        return {
            "title": "",
            "query": {},
            "total": 0,
            "list": []
        }
    else:
        # 如果是列表输入，直接返回所有处理后的结果（包含空结果）
        return results

@app.get("/api/get_product_detail")
async def get_product_detail(code: str):
    """通过款号获取产品详情"""
    if not code:
        raise HTTPException(status_code=400, detail="Code parameter is required")
    
    def fetch_detail(p_code):
        # 仅查询 FIELD_MAPPING 中定义的字段
        allowed_fields = list(FIELD_MAPPING.keys())
        fields_sql = ", ".join([f"`{f}`" for f in allowed_fields])
        sql = f"SELECT {fields_sql} FROM ai_product_app_v1 WHERE code = %s"
        
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                # 获取产品详情
                cursor.execute(sql, [p_code])
                row = cursor.fetchone()
            conn.close()
            return row
        except Exception as e:
            logger.error(f"Database error in get_product_detail for code {p_code}: {e}")
            return None

    row = await run_in_threadpool(fetch_detail, code)

    if not row:
        return {
            "success": False,
            "message": f"Product with code '{code}' not found",
            "data": None
        }

    # 批量获取素材图逻辑 (这里只有一行)
    process_material_images([row], [code])

    # 返回清洗后的详情数据，并按分类整理（自动转换键名为中文）
    serialized_row = serialize_row(row)

    categorized_row = organize_detail_by_categories(serialized_row)
    
    return {
        "success": True,
        "data": categorized_row
    }

@app.get("/api/get_user_info")
async def get_user_info(user_id: str):
    """获取用户信息接口"""
    if not user_id:
        raise HTTPException(status_code=400, detail="user_id parameter is required")
    
    def fetch_user(uid):
        sql = "SELECT * FROM ai_user WHERE id = %s AND product = 'sale'"
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, [uid])
                row = cursor.fetchone()
            conn.close()
            return row
        except Exception as e:
            logger.error(f"Database error in get_user_info for user_id {uid}: {e}")
            return None

    row = await run_in_threadpool(fetch_user, user_id)
    
    if not row:
        return {
            "success": False,
            "message": f"User with id '{user_id}' and product 'sale' not found",
            "data": None
        }
    
    # 清洗数据
    serialized_row = serialize_row(row)
    
    return {
        "success": True,
        "data": serialized_row
    }

@app.post("/api/search_source")
async def search_source(request_data: Any = Body(...)):
    """素材查询接口，兼容多关键词"""
    logger.info(f"Received search_source request: {request_data}")
    
    # 兼容多种入参格式
    search_type = "all"
    if isinstance(request_data, dict):
        keywords = request_data.get('keywords', "")
        search_type = request_data.get('type', "")

        
        # 兼容 "type" 字段作为搜索类型的情况，但如果 keywords 为空且 type 有值，
        # 某些调用方可能把搜索词放在了 type 字段中
        if not keywords and search_type and search_type not in ['all', 'image', 'video']:
            keywords = search_type
            search_type = ""
    else:
        # 如果直接发送的是列表或字符串
        keywords = request_data

    # 归一化为列表
    if not keywords:
        kw_list = []
    elif isinstance(keywords, str):
        # 如果是字符串，尝试按常见分隔符拆分
        kw_list = [k.strip() for k in re.split(r'[/,，、\s+]', keywords) if k.strip()]
    elif isinstance(keywords, list):
        kw_list = [str(k).strip() for k in keywords if str(k).strip()]
    else:
        kw_list = []
    
    logger.info(f"Normalized kw_list: {kw_list}, search_type: {search_type}")

    def fetch_sources(kws, s_type):
        # 构造多关键词模糊查询 SQL
        # 逻辑：(name LIKE %kw1% OR tags LIKE %kw1%) OR (name LIKE %kw2% OR tags LIKE %kw2%) ...
        clauses = []
        params = []
        for kw in kws:
            clauses.append("(name LIKE %s OR tags LIKE %s)")
            params.extend([f"%{kw}%", f"%{kw}%"])
        
        where_parts = []
        if clauses:
            where_parts.append(f"({' OR '.join(clauses)})")
        
        if s_type and s_type != 'all':
            where_parts.append("file_type = %s")
            params.append(s_type)
        
        where_clause = " AND ".join(where_parts) if where_parts else "1=1"
        
        # 获取总数
        count_sql = f"SELECT COUNT(*) as total FROM ai_source_app_v1 WHERE {where_clause} AND is_delete = 0"
        
        sql = f"""
            SELECT name, file_type, pic_url, video_path 
            FROM ai_source_app_v1 
            WHERE {where_clause} AND is_delete = 0
            ORDER BY id DESC
            LIMIT 100
        """
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                # 先查总数
                cursor.execute(count_sql, params)
                res = cursor.fetchone()
                total_count = res.get('total', 0) if res else 0
                
                # 再查分页数据
                cursor.execute(sql, params)
                rows = cursor.fetchall()
            conn.close()
            return rows, total_count
        except Exception as e:
            logger.error(f"Database error in search_source for keywords {kws}, type {s_type}: {e}")
            return [], 0

    rows, total = await run_in_threadpool(fetch_sources, kw_list, search_type)
    
    # 增加调试日志
    logger.info(f"Search result: found {total} items for keywords {kw_list}")
    
    # 清洗数据并处理 pic_url 和 video_path 域名
    cleaned_rows = []
    for row in rows:
        serialized = serialize_row(row)
        # 处理图片域名
        if serialized.get('pic_url') and serialized['pic_url'].startswith('/'):
            serialized['pic_url'] = f"https://lobe.wyoooni.net{serialized['pic_url']}"
        # 处理视频域名
        if serialized.get('video_path') and serialized['video_path'].startswith('/'):
            serialized['video_path'] = f"https://lobe.wyoooni.net{serialized['video_path']}"
        cleaned_rows.append(serialized)
    
    return {
        "success": True,
        "total": total,
        "list": cleaned_rows
    }

@app.get("/api/wechat_login")
async def wechat_login(code: str, type: str = "rs"):
    """微信登录接口"""
    if not code:
        raise HTTPException(status_code=400, detail="code parameter is required")
    
    wechat = WeChat(type)
    access_token = await wechat.get_access_token()
    if not access_token:
        return {"success": False, "message": "Failed to get access token"}
    
    user_info = await wechat.get_user_info(access_token, code)
    if not user_info:
        return {"success": False, "message": "Failed to get user info from WeChat"}
    
    # 获取 UserId (企业微信返回字段通常是 UserId 或 userid)
    userid = user_info.get("userid") or user_info.get("UserId")
    
    # 检查数据库中是否存在该用户
    def fetch_user(uid):
        sql = "SELECT * FROM ai_user WHERE id = %s"
        try:
            conn = get_db_connection()
            with conn.cursor() as cursor:
                cursor.execute(sql, [uid])
                row = cursor.fetchone()
            conn.close()
            return row
        except Exception as e:
            logger.error(f"Database error in wechat_login for userid {uid}: {e}")
            return None

    user_row = await run_in_threadpool(fetch_user, userid)
    
    if not user_row:
        return {
            "success": True,
            "is_new_user": True,
            "wechat_user_info": user_info,
            "message": "User not found in database"
        }
    
    # 如果用户存在，返回用户信息
    serialized_user = serialize_row(user_row)
    return {
        "success": True,
        "is_new_user": False,
        "data": serialized_user,
        "wechat_user_info": user_info
    }

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8012)