import requests
import json
import time

# 配置测试地址
BASE_URL = "http://localhost:8012/api/product_search"

def run_test(case_id, title, payload):
    print(f"\n{'='*60}")
    print(f"CASE {case_id}: {title}")
    print(f"Payload: {json.dumps(payload, ensure_ascii=False)}")
    
    try:
        start_time = time.time()
        response = requests.post(BASE_URL, json=payload)
        duration = time.time() - start_time
        
        if response.status_code == 200:
            data = response.json()
            total = data.get("total", 0)
            items = data.get("list", [])
            advice = data.get("advice", "")
            
            print(f"Result: Success | Total Found: {total} | Time: {duration:.2f}s")
            if advice:
                print(f"Advice Return: {advice}")
            
            if items:
                print("First Item Sample:")
                # 打印前 3 个字段展示
                sample = items[0]
                for k, v in list(sample.items())[:5]:
                    print(f"  - {k}: {v}")
            else:
                print("Result: No data found (Check if criteria matches DB)")
        else:
            print(f"Result: Error {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"Exception occurred: {str(e)}")

# 20 个常问案例定义
test_cases = [
    ("01", "查具体款号", {"code": "6228"}),
    ("02", "查以6开头的款 (前缀匹配)", {"code": "6%"}),
    ("03", "找200-300克重的面料 (范围筛选)", {"weight": "200-300"}),
    ("04", "价格低于50元的面料 (比较筛选)", {"price": "<50"}),
    ("05", "纯棉面料 (成分精确逻辑)", {"elem": "棉=100%"}),
    ("06", "含棉超过50%的面料 (成分大于逻辑)", {"elem": "棉>50%"}),
    ("07", "棉和氨纶混纺 (成分且逻辑)", {"elem": "棉 + 氨纶"}),
    ("08", "棉或者天丝面料 (成分或逻辑)", {"elem": "棉 / 天丝"}),
    ("09", "高克重抓毛工艺 (多字段组合)", {"weight": ">300", "production_process": "抓毛"}),
    ("10", "现货凉感面料 (软硬指标结合)", {"code_start": "6", "introduce": "凉感"}),
    ("11", "订单款羊毛系列 (软硬指标结合)", {"code_start": "3", "series": "羊毛"}),
    ("12", "指定返回字段 (字段控制)", {"code": "6228", "fields": ["code", "name", "weight", "price"]}),
    ("13", "综合筛选: 成分+克重+工艺", {"elem": "聚酯纤维>80%", "weight": "180-250", "production_process": "染定"}),
    ("14", "软指标加权测试 (多特性列表)", {"introduce": ["抗静电", "耐磨", "凉感"]}),
    ("15", "价格降序排列 (自定义排序)", {"weight": ">200", "sort_by": "price"}),
    ("16", "销量最高的前10个 (排序+分页)", {"limit": 10, "sort_by": "sale_num_year"}),
    ("17", "code_start 列表多值筛选", {"code_start": [6, 9]}),
    ("18", "复杂成分逻辑 (多条件组合)", {"elem": "棉>30% + 聚酯纤维<60% + 氨纶"}),
    ("19", "品名模糊搜索 (通配符)", {"name": "%卫衣%"}),
    ("20", "完整请求: 包含标题、建议、多个筛选", {
        "title": "换季面料推荐", 
        "advice": "为您挑选了符合秋季趋势的棉质面料", 
        "elem": "棉",
        "weight": ">200",
        "code_start": "6"
    }),
    ("21", "棉95% + 氨纶5% (精确成分组合)", {"elem": "棉=95% + 氨纶=5%"})
]

if __name__ == "__main__":
    print("Starting 20 Test Cases for Product Search API...")
    for cid, title, payload in test_cases:
        run_test(cid, title, payload)
    print(f"\n{'='*60}")
    print("All tests completed.")
