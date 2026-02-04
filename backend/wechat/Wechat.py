# WeChat.py
import requests
import urllib.parse
import os
from dotenv import load_dotenv
from logs import log

class WeChat:
    def __init__(self,type):
        load_dotenv()
        log('WeChat-info',f"type: {type}")
        if(type == 'rs'):
            self.corp_id = os.getenv("CORP_ID", "ww1923a7aa7cf707e5")
            self.agent_id = os.getenv("AGENT_ID", "1000025")
            self.corp_secret = os.getenv("CORP_SECRET", "EO-N9BRIPxpzQoand4LOE0ZPxrhObnvIA6E2B9q_rO8")
            self.redirect_uri = os.getenv("REDIRECT_URI", "https://ai.wyoooni.net")
        elif(type == 'rc'):
            self.corp_id = os.getenv("CORP_ID_RC", "wwadc402ce6c210978")
            self.agent_id = os.getenv("AGENT_ID_RC", "1000011")
            self.corp_secret = os.getenv("CORP_SECRET_RC", "ZTeSpJTC7BiTdVXRwyq3JkDWBsntJdybvjfmKA6gcbo")
            self.redirect_uri = os.getenv("REDIRECT_URI_RC", "https://ai.wyoooni.net")
    
    def get_auth_url(self):
        """获取企业微信授权URL"""
        base_url = "https://open.weixin.qq.com/connect/oauth2/authorize"
        redirect_uri_encoded = urllib.parse.quote_plus(f"{self.redirect_uri}/api/auth/callback")
        return (
            f"{base_url}?appid={self.corp_id}"
            f"&redirect_uri={redirect_uri_encoded}"
            f"&response_type=code"
            f"&scope=snsapi_userinfo"
            f"&agentid={self.agent_id}"
            "#wechat_redirect"
        )
    
    async def get_access_token(self):
        """获取企业微信access_token"""
        url = f"https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid={self.corp_id}&corpsecret={self.corp_secret}"
        response = requests.get(url)
        data = response.json()
        return data.get("access_token") if data.get("errcode") == 0 else None
    
    async def get_user_info(self, access_token: str, code: str):
        """使用access_token和code获取用户信息"""
        # 第一步：通过code获取用户UserID
        userid_url = f"https://qyapi.weixin.qq.com/cgi-bin/user/getuserinfo?access_token={access_token}&code={code}"
        userid_response = requests.get(userid_url)
        userid_data = userid_response.json()
        
        if userid_data.get("errcode") != 0:
            return None
        
        userid = userid_data.get("UserId")
        if not userid:
            return None
        
        # 第二步：通过UserID获取用户详细信息
        detail_url = f"https://qyapi.weixin.qq.com/cgi-bin/user/get?access_token={access_token}&userid={userid}"
        detail_response = requests.get(detail_url)
        detail_data = detail_response.json()
        
        if detail_data.get("errcode") == 0:
            return detail_data
        return None