import json
import re
import pymysql
import datetime
import logging
from dbutils.pooled_db import PooledDB
from decimal import Decimal
from fastmcp import FastMCP
from typing import Dict, Any, Optional, List, Tuple, Union

# --- 日志配置 ---
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("mcp_query.log", encoding='utf-8'),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

mcp = FastMCP("Fabric Search Tool Universal v5")

# --- 数据库配置 ---
DB_CONFIG = {
    'host': '47.107.151.172', 
    'port': 9030,
    'user': 'yihang', 
    'password': '@yihang888',
    'db': 'ai_db', 
    'cursorclass': pymysql.cursors.DictCursor,
    'charset': 'utf8mb4'
}

# 初始化连接池
pool = PooledDB(
    creator=pymysql,
    mincached=10,
    maxcached=50,
    maxconnections=100,
    blocking=True,
    **DB_CONFIG
)

def get_db_connection():
    return pool.connection()

# --- 字段定义 ---
# 默认返回字段
DEFAULT_RETURN_FIELDS = [
    'code', 'name', 'weight', 'width', 'taxkgprice', 'price', 'taxmprice', 'fewprice',
    'elem', 'inelem', 'fabric_structure_two', 'emptyqty', 'papertubeqty', 'type_notes',
    'image_urls', 'report_urls', 'code_start', 'customizable_grade',
    'series', 'stock_qty', 'release_date','sale_num_year', 'production_process', 'type_name'
]

# 字段名映射表 (中英文对照)
FIELD_MAPPING = {
    'code': '编号',
    'name': '名称',
    'ename': '英文名称',
    'elem': '成分',
    'inelem': '纱支规格',
    'yarncount': '对外纱支',
    'weight': '克重',
    'width': '幅宽(CM)',
    'twist': '捻度',
    'swzoomin': '销售版横缩缩率',
    'shzoomin': '销售版直缩缩率',
    'sph': '销售版ph值',
    'unitqty': '净重',
    'fewprice': '散料价',
    'unitid': '大货价单位',
    'unitrate': '基本单位换算率',
    'fewunitid': '散料价格数量单位',
    'fewunitrate': '散料价格单位换算率',
    'emptyqty': '空差',
    'papertubeqty': '纸筒',
    'makedate': '录入日期',
    'colorfastnotes': '不可做一等品说明',
    'unpilling': '抗起毛起球',
    'whitefiber': '白色色纤（个）',
    'wetrubfast': '湿擦牢度（级）',
    'ldensity': '纵密度',
    'hdensity': '横密度',
    'devproid': '开发款id',
    'category': '品类',
    'propinnum': '产品针数',
    'dnumber': '支数/D数',
    'spinntype': '纺纱工艺',
    'foreignname': '对外品名',
    'glosscommid': '光泽',
    'price': '大货价',
    'fiber_type': '纤维类型',
    'yarn_type': '纱线类型',
    'production_process': '生产工艺',
    'quality_level': '质量等级',
    'devtype': '染法',
    'notice': '温馨提示(中文)',
    'ennotice': '温馨提示(英文)',
    'introduce': '产品特性',
    'eintroduce': '产品特性(英文)',
    'dyeing_process': '染整工艺',
    'customizable_grade': '可定制等级',
    'season_new': '上新季节',
    'fabric_structure': '布种结构',
    'has_rib': '自备配套罗纹',
    'dyemethod': '染色方法',
    'className': '布种名称',
    'slogan': '宣传标语',
    'fun_level': '功能级别',
    'type_name': '运营分类',
    'stock_qty': '库存数量',
    'image_urls': '图片',
    'makedate_year': '录入年份',
    'makedate_month': '录入月份',
    'code_start': '产品编号开头',
    'fabric_structure_two': '布种',
    'report_urls': '报告url',
    'release_date': '录入日期',
    'mprice': '净布米价（不含税）',
    'yprice': '净布码价（不含税）',
    'kgprice': '净布公斤价（不含税）',
    'taxmprice': '净布米价（含税）',
    'taxyprice': '净布码价（含税）',
    'taxkgprice': '净布公斤价（含税）',
    'sale_num_year': '一年内的销售量',
    'spring_color_fastness': '搅浮色牢度',
    'dry_rubbing_fastness': '干摩擦牢度',
    'light_fastness': '耐光色牢度',
    'fabe': '销售话术',
    'color_name': '颜色',
    'series': '系列',
    'applicable_crowd': '产品线'
}

DETAIL_CATEGORIES = {
    "基础信息": [
        "code", "name", "ename", "series", "release_date", "makedate_year", 
        "makedate_month", "devproid", "image_urls", "report_urls", "code_start"
    ],
    "规格信息": [
        "elem", "inelem", "yarncount", "dnumber", "weight", "width", 
        "ldensity", "hdensity", "propinnum", "fiber_type", "yarn_type", 
        "spinntype", "glosscommid", "fabric_structure_two", "fabric_structure", 
        "className", "has_rib"
    ],
    "质量指标": [
        "twist", "swzoomin", "shzoomin", "sph", "unpilling", "whitefiber", 
        "wetrubfast", "dry_rubbing_fastness", "spring_color_fastness", 
        "light_fastness", "quality_level", "customizable_grade", "fun_level", 
        "colorfastnotes"
    ],
    "生产工艺": [
        "production_process", "devtype", "dyemethod", "dyeing_process", 
        "category", "foreignname"
    ],
    "价格": [
        "price", "unitid", "fewprice", "fewunitid", "fewunitrate", "mprice", 
        "yprice", "kgprice", "taxmprice", "taxyprice", "taxkgprice", 
        "unitqty", "emptyqty", "papertubeqty", "unitrate"
    ],
    "运营": [
        "type_name", "stock_qty", "sale_num_year", "season_new", "fabe", 
        "notice", "ennotice", "introduce", "eintroduce", "slogan"
    ]
}

NUMERIC_FIELDS = {
    'weight', 'width', 'price', 'taxkgprice', 'taxmprice', 'fewprice', 
    'emptyqty', 'papertubeqty', 'stock_qty', 'sale_num_year'
}

STRICT_TEXT_FIELDS = {
    'code', 'name', 'fabric_structure_two', 'inelem', 'code_start',
    'devproid', 'customizable_grade',
    'spring_color_fastness', 'light_fastness', 'dry_rubbing_fastness',
    'image_urls', 'report_urls', 'type_notes', 
    'release_date','sale_num_year', 'series',
    'unpilling', 'ldensity', 'hdensity', 'propinnum', 'dnumber',
    'color_name', 'applicable_crowd'
}

SOFT_FIELDS = {'fabe', 'introduce', 'production_process'}
SIMPLE_SQL_TEXT_FIELDS = ['code', 'name', 'code_start']

# --- 辅助函数 ---

def serialize_row(row: Dict) -> Dict:
    """清洗数据：Decimal -> float, Date -> str, 处理 URL 列表"""
    new_row = {}
    for k, v in row.items():
        if isinstance(v, Decimal):
            new_row[k] = float(v)
        elif isinstance(v, (datetime.date, datetime.datetime)):
            new_row[k] = str(v)
        elif k in ('image_urls', 'report_urls') and isinstance(v, str) and v:
            # 处理逗号分隔的 URL 列表
            items = [item.strip() for item in v.split(',') if item.strip()]
            if k == 'report_urls':
                new_row[k] = items
            else:
                new_row[k] = items if len(items) > 1 else items[0]
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
    matches = re.findall(r'(\d+(?:\.\d+)?)%\s*([\u4e00-\u9fa5a-zA-Z]+)', str(elem_str or ""))
    row_elems = {name: float(p) for p, name in matches}
    for group in str(logic_query).split('/'):
        group_pass = True
        for cond in group.split('+'):
            cond = cond.strip().replace('%', '')
            if not cond: continue
            op_match = re.search(r'(>=|<=|>|<|=)([\d\.]+)', cond)
            if op_match:
                op, target_val = op_match.group(1), float(op_match.group(2))
                name = cond.replace(op_match.group(0), '').strip()
                val = row_elems.get(name, 0)
                if op == '>': match = val > target_val
                elif op == '<': match = val < target_val
                elif op == '>=': match = val >= target_val
                elif op == '<=': match = val <= target_val
                else: match = val == target_val
            else:
                match = cond in row_elems
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
    elif code.startswith('3'): series_score = 3
    elif code.startswith('2'): series_score = 4
    else: series_score = 5
    
    return (match_score, soft_score, series_score, -sales)

def process_material_images(rows: List[Dict], codes: List[str]):
    """批量获取并合并素材图"""
    if not codes:
        return
    
    # 构造正则表达式，匹配包含任意一个款号的名称
    # 过滤掉空的款号，并对款号进行转义以防特殊字符干扰正则
    valid_codes = [re.escape(str(c)) for c in codes if str(c).strip()]
    if not valid_codes:
        return
        
    regexp_pattern = "|".join(valid_codes)
    img_sql = "SELECT name, pic_url FROM ai_source_app_v1 WHERE name REGEXP %s"
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(img_sql, [regexp_pattern])
            img_rows = cursor.fetchall()
        conn.close()
        
        # 将图片按款号归类
        code_to_imgs = {}
        for img_row in img_rows:
            name = img_row.get('name', '')
            pic_url = img_row.get('pic_url', '')
            if not pic_url:
                continue
                
            # 处理 URL 替换
            new_url = pic_url.replace('/aiModels/uploads/pic/', '/pic/')
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
            if material_imgs:
                current_images = row.get('image_urls', [])
                if isinstance(current_images, str):
                    current_images = [current_images] if current_images else []
                elif not isinstance(current_images, list):
                    current_images = []
                
                # 合并并去重
                all_images = list(dict.fromkeys(current_images + material_imgs))
                # 如果只有一张图，保持原始可能期望的字符串或列表格式（根据业务约定）
                # 这里我们统一处理为列表，如果是单张图且原逻辑期望字符串，可以在序列化时处理
                row['image_urls'] = all_images
                
    except Exception as e:
        logger.error(f"Error fetching material images: {e}")

def translate_dict_keys(d: Dict[str, Any]) -> Dict[str, Any] :
    """将字典的键名转换为中文映射"""
    if not isinstance(d, dict):
        return d
    return {FIELD_MAPPING.get(k, k): v for k, v in d.items()}

def organize_detail_by_categories(data: Dict[str, Any]) -> Dict[str, Any]:
    """将产品详情数据按类别整理，并转换键名为中文"""
    result = {}
    
    for category_name, field_keys in DETAIL_CATEGORIES.items():
        category_data = {}
        for key in field_keys:
            if key in data:
                # 获取中文名，如果没有映射则使用原名
                chinese_name = FIELD_MAPPING.get(key, key)
                category_data[chinese_name] = data[key]
        result[category_name] = category_data
    
    return result

# --- 主工具函数 ---

def perform_single_search(query: Dict[str, Any]) -> Dict[str, Any]:
    """执行单条搜索逻辑"""
    # 1. 解析参数
    title = query.get('title')
    limit_val = query.get('limit', 20)
    limit = int(limit_val) if limit_val and str(limit_val).isdigit() else 20
    if limit > 20:
        limit = 20
    
    # 兼容 sort 和 sort_by
    user_sort = query.get('sort', query.get('sort_by'))
    if not user_sort: user_sort = None
    
    requested_fields = query.get('fields', DEFAULT_RETURN_FIELDS)
    if not requested_fields:
        requested_fields = DEFAULT_RETURN_FIELDS
    elif isinstance(requested_fields, str):
        requested_fields = [f.strip() for f in re.split(r'[/,|+]', requested_fields) if f.strip()]
    
    # 2. 分离软硬指标
    strict_query = {}
    soft_query = {}
    metadata_fields = {'title', 'limit', 'sort', 'sort_by', 'fields', 'mode'}
    
    for k, v in query.items():
        if v is None or k in metadata_fields: continue
        if k in SOFT_FIELDS: soft_query[k] = v
        else: strict_query[k] = v
            
    search_code_val = strict_query.get('code', '')
    mode = query.get('mode')

    # 3. SQL 构造
    required_fields = set(requested_fields) | {'code', 'sale_num_year', 'elem', 'weight'}
    for k in query.keys():
        if k in NUMERIC_FIELDS or k in STRICT_TEXT_FIELDS or k in SOFT_FIELDS:
            required_fields.add(k)
    
    fields_sql = ", ".join(required_fields)
    sql_template = f"SELECT {fields_sql} FROM ai_product_app_v1 WHERE 1=1"
    
    # A. 模式过滤 (mode=1 时仅筛选 6/9/3 开头的款号)
    if str(mode) == '1':
        sql_template += " AND (code LIKE '6%' OR code LIKE '9%' OR code LIKE '3%')"
    
    params = []

    # A. 数值字段 SQL
    for key, val in strict_query.items():
        if key in NUMERIC_FIELDS:
            clause = build_numeric_sql(key, val)
            if clause: sql_template += f" AND {clause}"
    
    # B. 文本字段 SQL
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
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql_template, params)
            rows = cursor.fetchall()
        conn.close()
    except Exception as e:
        logger.error(f"Database error in perform_single_search: {e}")
        return {
            "total": 0, 
            "list": [], 
            "error": f"Database Error: {str(e)}"
        }

    # 5. Python 筛选
    filtered_rows = []
    for row in rows:
        weight_val = row.get('weight')
        if weight_val is None or str(weight_val).strip() == '' or float(weight_val or 0) <= 0:
            continue

        match = True
        for key, val in strict_query.items():
            if key in NUMERIC_FIELDS: continue
            if key in sql_filtered_fields: continue
            
            if key == 'elem':
                if not check_composition_logic(row.get('elem'), val): match = False; break
            elif key in STRICT_TEXT_FIELDS:
                if isinstance(val, list):
                    val = "/".join(str(i) for i in val)
                if not check_text_logic(row.get(key), val): match = False; break
        
        if match:
            filtered_rows.append(row)

    # 6. 计算总数
    total_count = len(filtered_rows)

    # 7. 排序
    if user_sort:
        sort_parts = str(user_sort).strip().split()
        sort_field = sort_parts[0]
        reverse_order = True
        if len(sort_parts) > 1 and sort_parts[1].upper() == 'ASC':
            reverse_order = False
            
        price_related_fields = {
            'price', 'taxkgprice', 'taxmprice', 'fewprice', 
            'mprice', 'yprice', 'kgprice', 'taxyprice',
            'gkgprice', 'gtaxkgprice'
        }
        if sort_field in price_related_fields:
            filtered_rows = [r for r in filtered_rows if r.get(sort_field) and float(r.get(sort_field)) > 0]
            
        try:
            filtered_rows.sort(key=lambda r: float(r.get(sort_field) or 0), reverse=reverse_order)
        except:
            filtered_rows.sort(key=lambda r: str(r.get(sort_field) or ''), reverse=reverse_order)
    else:
        filtered_rows.sort(key=lambda r: get_sort_score(r, str(search_code_val), soft_query))

    # 8. 分页
    final_rows = filtered_rows[:limit]
    
    # 9. 批量获取素材图
    if 'image_urls' in requested_fields:
        final_codes = [str(r.get('code', '')) for r in final_rows if r.get('code')]
        process_material_images(final_rows, final_codes)

    # 10. 构建结果
    cleaned_rows = []
    for row in final_rows:
        serialized = serialize_row(row)
        filtered_row = {k: v for k, v in serialized.items() if k in requested_fields}
        cleaned_rows.append(filtered_row)

    return {
        "total": total_count,
        "list": cleaned_rows
    }

@mcp.tool()
def product_search(query_json: str) -> str:
    """
    面料产品通用搜索工具。
    支持数值范围 (如 "100-200", ">50")、成分逻辑 (如 "棉>30% + 氨纶")、文本模糊匹配 (如 "卫衣布 / 毛圈")。
    
    Args:
        query_json (str): 包含筛选条件的 JSON 字符串。
        示例: '{"weight": ">300", "fabric_structure_two": "卫衣布", "limit": 10}'
    """
    try:
        data = json.loads(query_json)
        # 兼容 tool_call 包装格式
        if isinstance(data, list) and len(data) > 0 and 'tool_call' in data[0]:
            query = data[0]['tool_call'].copy() if isinstance(data[0]['tool_call'], dict) else {}
            if 'title' in data[0] and 'title' not in query:
                query['title'] = data[0]['title']
            if 'mode' in data[0] and 'mode' not in query:
                query['mode'] = data[0]['mode']
        elif isinstance(data, dict) and 'tool_call' in data:
            query = data['tool_call'].copy() if isinstance(data['tool_call'], dict) else {}
            if 'title' in data and 'title' not in query:
                query['title'] = data['title']
            if 'mode' in data and 'mode' not in query:
                query['mode'] = data['mode']
        else:
            query = data
            
        if not isinstance(query, dict):
            return json.dumps({"error": "Invalid query format", "total": 0, "list": []})
            
        res = perform_single_search(query)
        
        # 构建统一的返回结构，包含标题和翻译后的查询条件
        final_res = {
            "title": query.get("title", ""),
            "query": translate_dict_keys(query),
            "total": res.get("total", 0),
            "list": res.get("list", [])
        }
        return json.dumps(final_res, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e), "total": 0, "list": []})

@mcp.tool()
def get_product_detail(code: str) -> str:
    """
    通过款号获取产品详细信息。
    
    Args:
        code (str): 产品款号，如 "6228"。
    """
    allowed_fields = list(FIELD_MAPPING.keys())
    fields_sql = ", ".join([f"`{f}`" for f in allowed_fields])
    sql = f"SELECT {fields_sql} FROM ai_product_app_v1 WHERE code = %s"
    
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql, [code])
            row = cursor.fetchone()
        conn.close()
        
        if not row:
            return json.dumps({
                "success": False, 
                "message": f"Product with code '{code}' not found",
                "data": None
            }, ensure_ascii=False, indent=2)
            
        process_material_images([row], [code])
        serialized_row = serialize_row(row)
        categorized_row = organize_detail_by_categories(serialized_row)
        
        return json.dumps({"success": True, "data": categorized_row}, ensure_ascii=False, indent=2)
    except Exception as e:
        logger.error(f"Database error in search_source for keywords {kw_list}, type {type}: {e}")
        return json.dumps({"success": False, "message": str(e)})

@mcp.tool()
def search_source(keywords: Union[str, List[str]], type: str = "all") -> str:
    """
    素材查询工具，支持按名称或标签搜索素材图/视频。
    
    Args:
        keywords (Union[str, List[str]]): 关键词，支持字符串或列表。
        type (str): 素材类型，如 "pic", "video", "all"。
    """
    if isinstance(keywords, str):
        kw_list = [k.strip() for k in re.split(r'[/,，、\s+]', keywords) if k.strip()]
    elif isinstance(keywords, list):
        kw_list = [str(k).strip() for k in keywords if str(k).strip()]
    else:
        kw_list = []
        
    clauses = []
    params = []
    for kw in kw_list:
        clauses.append("(name LIKE %s OR tags LIKE %s)")
        params.extend([f"%{kw}%", f"%{kw}%"])
    
    where_parts = []
    if clauses:
        where_parts.append(f"({' OR '.join(clauses)})")
    
    if type and type != 'all':
        where_parts.append("file_type = %s")
        params.append(type)
    
    where_clause = " AND ".join(where_parts) if where_parts else "1=1"
    
    sql = f"""
        SELECT file_type, pic_url, video_path 
        FROM ai_source_app_v1 
        WHERE {where_clause} AND is_delete = 0
        ORDER BY id DESC
        LIMIT 20
    """
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql, params)
            rows = cursor.fetchall()
        conn.close()
        
        cleaned_rows = [serialize_row(row) for row in rows]
        return json.dumps({"success": True, "total": len(cleaned_rows), "list": cleaned_rows}, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"success": False, "message": str(e)})

@mcp.tool()
def get_user_info(user_id: str) -> str:
    """
    获取用户信息。
    
    Args:
        user_id (str): 用户 ID。
    """
    sql = "SELECT * FROM ai_user WHERE id = %s AND product = 'sale'"
    try:
        conn = get_db_connection()
        with conn.cursor() as cursor:
            cursor.execute(sql, [user_id])
            row = cursor.fetchone()
        conn.close()
        
        if not row:
            return json.dumps({
                "success": False, 
                "message": f"User with id '{user_id}' and product 'sale' not found",
                "data": None
            }, ensure_ascii=False, indent=2)
            
        serialized_row = serialize_row(row)
        return json.dumps({"success": True, "data": serialized_row}, ensure_ascii=False, indent=2)
    except Exception as e:
        return json.dumps({"success": False, "message": str(e)})


if __name__ == "__main__":
    mcp.run(transport="sse", host="0.0.0.0", port=8011)