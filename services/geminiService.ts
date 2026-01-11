
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";
import { Message, Role, Attachment } from "../types";

export class GeminiService {
  private model = 'gemini-3-flash-preview';
  private reasoningModel = 'gemini-3-pro-preview';

  async *streamChat(
    history: Message[], 
    userInput: string, 
    assistantInstruction: string,
    attachments?: Attachment[], 
    audioData?: { data: string, mimeType: string },
    config?: { isDeepThinking?: boolean, isChartMode?: boolean, isReportMode?: boolean }
  ) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
    const { isDeepThinking = false, isChartMode = false, isReportMode = false } = config || {};
    
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

    // Data visualization instructions
    const chartInstruction = isChartMode ? `
[SYSTEM: DATA VISUALIZATION MODE ACTIVE]
Whenever you present numerical data, statistics, or comparisons, you MUST use the specialized \`\`\`chart\`\`\` code block defined below to visualize it for the user:
\`\`\`chart
{
  "type": "bar" | "line" | "pie" | "scatter" | "horizontalBar" | "metric",
  "title": "Chart Title",
  "data": [
    {"name": "Label", "value": 10},
    {"name": "Label 2", "value": 20}
  ],
  "xAxis": "Optional Label",
  "yAxis": "Optional Label"
}
\`\`\`
For "metric" type, data: [{"label": "Name", "value": "Val", "trend": "+X%"}].
For scatter: [{"x": N, "y": N}].
`.trim() : '';

    // Structured Report instructions - Enhanced for 10+ chapters and massive length
    const reportInstruction = isReportMode ? `
[SYSTEM: MEGA-REPORT MODE ACTIVE]
The user requires a MONUMENTAL, academic-grade report. 
TARGET LENGTH: 10,000+ words.
MINIMUM REQUIREMENT: AT LEAST 10 DISTINCT CHAPTERS.

Your response MUST be an exhaustive, deep-dive analysis. 
You must be EXTREMELY VERBOSE. Do not summarize or gloss over details. 
Expand every thought into multiple long, descriptive paragraphs.

REQUIRED CHAPTER STRUCTURE (Must include at least these 10):
1. **Title Page & Introduction**: Deep background and problem statement (min 800 words).
2. **Historical Evolution**: Comprehensive timeline and development stages.
3. **Current Market/State Analysis**: Exhaustive look at the status quo.
4. **Technical/Theoretical Framework**: Deep dive into underlying mechanics or theories.
5. **Global Impact & Socio-Economic Influence**: Broad perspective analysis.
6. **Detailed Case Studies (10+)**: Provide numerous specific, detailed real-world examples.
7. **Risk Assessment & Mitigation**: Exhaustive analysis of challenges and solutions.
8. **Technological Synergy & Alternatives**: Comparison with other domains/technologies.
9. **Future Projections (Next 20 Years)**: Detailed multi-scenario forecasts.
10. **Strategic Recommendations & Implementation Roadmap**: Actionable, multi-phase plan.
11. **Conclusion & Visionary Outlook**: Final synthesis.

IMPORTANT: Use high-level vocabulary. Avoid repetition but maximize detail. Quality and extreme quantity are the primary objectives.
`.trim() : '';

    // Turn-specific reinforced instruction
    const deepThinkingPrompt = isDeepThinking ? `
[SYSTEM: DEEP THINKING ENABLED]
For the user's latest query, you MUST:
1. Begin your response with exactly: <thought>
2. Write a comprehensive internal monologue analyzing the query, constraints, and your plan.
3. End the monologue with exactly: </thought>
4. Provide the final answer after the closing tag.
DO NOT reuse or refer to previous thought blocks; create a NEW one for this specific turn.
`.trim() : '';

    const finalSystemInstruction = `
${assistantInstruction}
${reportInstruction}
${chartInstruction}
${deepThinkingPrompt}
`.trim();

    const selectedModel = isDeepThinking ? this.reasoningModel : this.model;

    // Use a very high maxOutputTokens for Report Mode to allow the "10k word" ambition
    const generationConfig: any = {
      systemInstruction: finalSystemInstruction,
    };

    // Fix: Guideline requires setting both maxOutputTokens and thinkingBudget when tokens are constrained.
    if (isReportMode) {
      generationConfig.maxOutputTokens = 120000;
      generationConfig.thinkingConfig = { 
        thinkingBudget: isDeepThinking ? 32000 : 0 // Use a high budget if thinking, or 0 to disable but satisfy "must set" rule
      };
    } else if (isDeepThinking) {
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
}

export const geminiService = new GeminiService();
