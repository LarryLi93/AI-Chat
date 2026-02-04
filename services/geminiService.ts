
import { Message, Role, Attachment, Assistant } from "../types";

export class GeminiService {
  async *streamChat(
    history: Message[], 
    userInput: string, 
    assistant: Assistant,
    attachments?: Attachment[], 
    audioData?: { data: string, mimeType: string }
  ) {
    if (assistant.n8nUrl) {
      yield* this.streamN8N(userInput, assistant, attachments);
      return;
    } else {
      yield "请先配置 N8N Webhook URL。";
    }
  }

  private async *streamN8N(userInput: string, assistant: Assistant, attachments: Attachment[] = []) {
    try {
      let params = {};
      try {
        params = assistant.n8nParams ? JSON.parse(assistant.n8nParams) : {};
      } catch (e) {
        console.error("Params parse error", e);
      }

      const imageUrls: string[] = [];
      const fileUrls: string[] = [];

      if (attachments && attachments.length > 0) {
        for (const att of attachments) {
          if (att.url) {
            if (att.mimeType.startsWith('image/')) {
              imageUrls.push(att.url);
            } else {
              fileUrls.push(att.url);
            }
          }
        }
      }

      const body = {
        ...params,
        chatInput: userInput,
        imageUrls,
        fileUrls
      };

      // Ensure URL is trimmed
      const url = assistant.n8nUrl!.trim();

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        mode: 'cors'
      });

      if (!response.ok) {
        throw new Error(`HTTP 错误: ${response.status} ${response.statusText}`);
      }

      if (!response.body) throw new Error("服务器未返回数据流。");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        
        if (value) {
          buffer += decoder.decode(value, { stream: true });
        }
        
        let startIdx = 0;
        let braceCount = 0;
        let bracketCount = 0;
        let inString = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          // 简单的转义处理
          if (char === '"' && (i === 0 || buffer[i-1] !== '\\')) inString = !inString;
          
          if (!inString) {
            if (char === '{') braceCount++;
            else if (char === '}') braceCount--;
            else if (char === '[') bracketCount++;
            else if (char === ']') bracketCount--;

            // 当括号全部闭合且不处于初始状态时，尝试解析
            if (braceCount === 0 && bracketCount === 0 && (char === '}' || char === ']')) {
              const jsonStr = buffer.substring(startIdx, i + 1);
              try {
                let cleanJsonStr = jsonStr.trim();
                // 处理可能的前缀 (如 SSE 的 'data: ')
                if (cleanJsonStr.startsWith('data: ')) {
                  cleanJsonStr = cleanJsonStr.slice(6).trim();
                }
                
                const obj = JSON.parse(cleanJsonStr);
                
                // 1. 处理标准 API 格式 (直接返回数组或不带 output/content 的对象)
                if (Array.isArray(obj) || (typeof obj === 'object' && obj !== null && !('output' in obj) && !('content' in obj) && !('type' in obj))) {
                  yield `__N8N_OVERRIDE__${JSON.stringify(obj)}`;
                }
                // 2. 处理包装格式
                else if (obj.output !== undefined && obj.output !== null) {
                  const outputStr = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
                  yield `__N8N_OVERRIDE__${outputStr}`;
                } else if (obj.type === 'item' && obj.content) {
                  const content = obj.content;
                  if (typeof content === 'string' && content.trim().startsWith('{"output":')) {
                    try {
                      const inner = JSON.parse(content);
                      if (inner.output !== undefined && inner.output !== null) {
                        const innerOutputStr = typeof inner.output === 'string' ? inner.output : JSON.stringify(inner.output);
                        yield `__N8N_OVERRIDE__${innerOutputStr}`;
                      }
                    } catch (e) {
                      yield content;
                    }
                  } else {
                    yield content;
                  }
                } else if (obj.content) {
                  yield obj.content;
                }
              } catch (e) {
                // 解析失败则跳过，继续累积 buffer
              }
              startIdx = i + 1;
            }
          }
        }
        
        buffer = buffer.substring(startIdx);
        if (done) break;
      }

      // 兜底：如果 done 了 buffer 还有内容且没被解析（比如不是以 } 或 ] 结尾）
      if (buffer.trim()) {
        try {
          const obj = JSON.parse(buffer.trim());
          yield `__N8N_OVERRIDE__${JSON.stringify(obj)}`;
        } catch (e) {}
      }
    } catch (error: any) {
      if (error.name === 'TypeError' || error.message.includes('fetch')) {
        yield `[N8N 接入失败] Postman 能通但浏览器报错通常是跨域安全问题：\n\n1. **开启 CORS**：在 N8N 环境变量中设置 \`N8N_CORS_ALLOWED_ORIGINS=*\` 并重启。\n2. **混合内容**：本站是 HTTPS，若 N8N 是 HTTP 协议，浏览器会直接拦截。请使用 HTTPS 地址。\n3. **Webhook 类型**：确保使用 Production Webhook URL 而非测试版。`;
      } else {
        yield `[N8N 错误]: ${error.message}`;
      }
    }
  }
}

export const geminiService = new GeminiService();
