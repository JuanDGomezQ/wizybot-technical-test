import { Injectable } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class ChatMemoryService {
  // Session storage (use Redis/persistent store in production)
  private readonly sessions = new Map<
    string,
    OpenAI.Chat.Completions.ChatCompletionMessageParam[]
  >();

  /**
   * Retrieve the conversation history for a session.
   *
   * @param sessionId - Unique identifier for the conversation session
   * @returns Ordered array of ChatCompletionMessageParam objects or empty array if session missing.
   */
  getHistory(
    sessionId: string,
  ): OpenAI.Chat.Completions.ChatCompletionMessageParam[] {
    return this.sessions.get(sessionId) || [];
  }

  /**
   * Persist the current conversation state for a session.
   *
   * @param sessionId - Unique identifier for the conversation session
   * @param messages - Complete ordered array of ChatCompletionMessageParam objects
   */
  saveHistory(
    sessionId: string,
    messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
  ): void {
    this.sessions.set(sessionId, messages);
  }
}
