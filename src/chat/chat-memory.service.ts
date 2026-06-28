import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChatMemoryService {
  // This map will hold the chat history for each session. In production, we use Redis or another persistent store.
  private readonly sessions = new Map<
    string,
    OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  >();

  getHistory(
    sessionId: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.sessions.get(sessionId) || [];
  }

  saveHistory(
    sessionId: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): void {
    this.sessions.set(sessionId, messages);
  }
}
