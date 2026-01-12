
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role, Attachment, Assistant } from "../types";

export class GeminiService {
  private model = 'gemini-3-flash-preview';
  private reasoningModel = 'gemini-3-pro-preview';

  async *streamChat(
    history: Message[], 
    userInput: string, 
    assistant: Assistant,
    attachments?: Attachment[], 
    audioData?: { data: string, mimeType: string },
    config?: { isDeepThinking?: boolean }
  ) {
    if (assistant.type === 'n8n' && assistant.n8nUrl) {
      yield* this.streamN8N(userInput, assistant);
      return;
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const { isDeepThinking = false } = config || {};
    
    const currentParts: any[] = [];
    
    if (userInput) {
      currentParts.push({ text: userInput });
    }
    
    if (audioData) {
      currentParts.push({
        inlineData: {
          data: audioData.data,
          mimeType: audioData.mimeType
        }
      });
    }

    if (attachments) {
      attachments.forEach(att => {
        currentParts.push({
          inlineData: {
            data: att.data,
            mimeType: att.mimeType
          }
        });
      });
    }

    const chatHistory = history
      .filter(msg => msg.content.trim() !== '')
      .map(msg => ({
        role: msg.role === Role.USER ? 'user' : 'model',
        parts: [{ text: msg.content }]
      }));

    const deepThinkingPrompt = isDeepThinking ? `
[系统提示：已开启深度思考模式]
针对用户的最新提问，你必须：
1. 以 <thought> 标签开始你的回复。
2. 编写全面的内部独白，分析查询、约束条件及你的回复计划。
3. 以 </thought> 标签结束独白。
4. 在闭合标签后提供最终答案。
请勿重复或引用之前的思考块；为本次对话创建全新的思考过程。
`.trim() : '';

    const finalSystemInstruction = `
${assistant.instruction}
${deepThinkingPrompt}
`.trim();

    const selectedModel = isDeepThinking ? this.reasoningModel : this.model;

    const generationConfig: any = {
      systemInstruction: finalSystemInstruction,
    };

    if (isDeepThinking) {
      generationConfig.thinkingConfig = { 
        thinkingBudget: 16000 
      };
    }

    const chat = ai.chats.create({
      model: selectedModel,
      history: chatHistory,
      config: generationConfig,
    });

    const result = await chat.sendMessageStream({ 
      message: currentParts 
    });

    for await (const chunk of result) {
      const response = chunk as GenerateContentResponse;
      const text = response.text;
      if (text) {
        yield text;
      }
    }
  }

  private async *streamN8N(userInput: string, assistant: Assistant) {
    try {
      let params = {};
      try {
        params = assistant.n8nParams ? JSON.parse(assistant.n8nParams) : {};
      } catch (e) {
        console.error("Params parse error", e);
      }

      const body = {
        ...params,
        chatInput: userInput
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
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        let startIdx = 0;
        let braceCount = 0;
        let inString = false;

        for (let i = 0; i < buffer.length; i++) {
          const char = buffer[i];
          if (char === '"' && buffer[i-1] !== '\\') inString = !inString;
          if (!inString) {
            if (char === '{') braceCount++;
            if (char === '}') {
              braceCount--;
              if (braceCount === 0) {
                const jsonStr = buffer.substring(startIdx, i + 1);
                try {
                  const obj = JSON.parse(jsonStr);
                  if (obj.type === 'item' && obj.content) {
                    yield obj.content;
                  }
                } catch (e) {
                  // Ignore partial JSON
                }
                startIdx = i + 1;
              }
            }
          }
        }
        buffer = buffer.substring(startIdx);
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
