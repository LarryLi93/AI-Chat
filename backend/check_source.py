import pymysql

DB_CONFIG = {
    'host': '47.107.151.172', 
    'port': 9030,
    'user': 'yihang', 
    'password': '@yihang888',
    'db': 'ai_db', 
    'cursorclass': pymysql.cursors.DictCursor
}

def check_source_table():
    try:
        conn = pymysql.connect(**DB_CONFIG)
        with conn.cursor() as cursor:
            # 检查表是否存在并获取一条数据
            cursor.execute("SELECT file_type, pic_url, video_path FROM ai_source_app_v1 LIMIT 1")
            row = cursor.fetchone()
            print(f"Table exists. Sample row: {row}")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_source_table()
