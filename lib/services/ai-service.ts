import { Role } from '@prisma/client'

export interface AIProvider {
  name: string
  generateContent(prompt: string, context?: any): Promise<string>
  improveContent(content: string, instructions: string): Promise<string>
  summarizeContent(content: string): Promise<string>
}

export class OpenAIProvider implements AIProvider {
  name = 'OpenAI'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured')
    }
  }

  async generateContent(prompt: string, context?: any): Promise<string> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful AI assistant for creating documentation. Generate clear, well-structured content.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 2000,
          temperature: 0.7,
        }),
      })

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.choices[0]?.message?.content || 'No content generated'
    } catch (error) {
      console.error('OpenAI generation error:', error)
      throw new Error('Failed to generate content with OpenAI')
    }
  }

  async improveContent(content: string, instructions: string): Promise<string> {
    const prompt = `Please improve the following content based on these instructions: ${instructions}\n\nContent to improve:\n${content}`
    return this.generateContent(prompt)
  }

  async summarizeContent(content: string): Promise<string> {
    const prompt = `Please create a concise summary of the following content:\n\n${content}`
    return this.generateContent(prompt)
  }
}

export class ClaudeProvider implements AIProvider {
  name = 'Claude'
  private apiKey: string

  constructor() {
    this.apiKey = process.env.ANTHROPIC_API_KEY || ''
    if (!this.apiKey) {
      throw new Error('Anthropic API key not configured')
    }
  }

  async generateContent(prompt: string, context?: any): Promise<string> {
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: 'claude-3-sonnet-20240229',
          max_tokens: 2000,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
        }),
      })

      if (!response.ok) {
        throw new Error(`Claude API error: ${response.statusText}`)
      }

      const data = await response.json()
      return data.content[0]?.text || 'No content generated'
    } catch (error) {
      console.error('Claude generation error:', error)
      throw new Error('Failed to generate content with Claude')
    }
  }

  async improveContent(content: string, instructions: string): Promise<string> {
    const prompt = `Please improve the following content based on these instructions: ${instructions}\n\nContent to improve:\n${content}`
    return this.generateContent(prompt)
  }

  async summarizeContent(content: string): Promise<string> {
    const prompt = `Please create a concise summary of the following content:\n\n${content}`
    return this.generateContent(prompt)
  }
}

export class AIService {
  private provider: AIProvider
  private usageTracker: AIUsageTracker

  constructor(providerType: 'openai' | 'claude' = 'openai') {
    this.provider = this.createProvider(providerType)
    this.usageTracker = new AIUsageTracker()
  }

  private createProvider(type: string): AIProvider {
    switch (type) {
      case 'openai':
        return new OpenAIProvider()
      case 'claude':
        return new ClaudeProvider()
      default:
        throw new Error(`Unknown AI provider: ${type}`)
    }
  }

  async generateContent(
    prompt: string,
    userId: string,
    organizationId: string,
    context?: any
  ): Promise<{ content: string; usage: number }> {
    // Check usage limits
    await this.usageTracker.checkUsageLimit(organizationId)

    const content = await this.provider.generateContent(prompt, context)
    const usage = this.calculateUsage(content)

    // Track usage
    await this.usageTracker.recordUsage(organizationId, userId, usage, 'generate')

    return { content, usage }
  }

  async improveContent(
    content: string,
    instructions: string,
    userId: string,
    organizationId: string
  ): Promise<{ content: string; usage: number }> {
    await this.usageTracker.checkUsageLimit(organizationId)

    const improvedContent = await this.provider.improveContent(content, instructions)
    const usage = this.calculateUsage(improvedContent)

    await this.usageTracker.recordUsage(organizationId, userId, usage, 'improve')

    return { content: improvedContent, usage }
  }

  async summarizeContent(
    content: string,
    userId: string,
    organizationId: string
  ): Promise<{ content: string; usage: number }> {
    await this.usageTracker.checkUsageLimit(organizationId)

    const summary = await this.provider.summarizeContent(content)
    const usage = this.calculateUsage(summary)

    await this.usageTracker.recordUsage(organizationId, userId, usage, 'summarize')

    return { content: summary, usage }
  }

  private calculateUsage(content: string): number {
    // Simple usage calculation based on content length
    // In production, you'd use actual token counting
    return Math.ceil(content.length / 100)
  }
}

class AIUsageTracker {
  async checkUsageLimit(organizationId: string): Promise<void> {
    // Implementation would check against subscription limits
    // For now, we'll use a simple monthly limit
    const currentUsage = await this.getCurrentMonthlyUsage(organizationId)
    const limit = await this.getUsageLimit(organizationId)

    if (currentUsage >= limit) {
      throw new Error('Monthly AI usage limit exceeded')
    }
  }

  async recordUsage(
    organizationId: string,
    userId: string,
    usage: number,
    type: string
  ): Promise<void> {
    // In a real implementation, this would store usage in database
    console.log(`AI Usage: ${organizationId} - ${userId} - ${usage} credits - ${type}`)
  }

  private async getCurrentMonthlyUsage(organizationId: string): Promise<number> {
    // Mock implementation - would query actual usage from database
    return Math.floor(Math.random() * 500)
  }

  private async getUsageLimit(organizationId: string): Promise<number> {
    // Mock implementation - would get from subscription data
    return 1000 // Default limit
  }
}

export { AIUsageTracker }