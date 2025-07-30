import { prisma } from '@/lib/prisma'

export interface SubscriptionPlan {
  id: string
  name: string
  price: number
  interval: 'month' | 'year'
  features: {
    organizations: number
    projects: number
    users: number
    documents: number
    aiCredits: number
    customDomain: boolean
    prioritySupport: boolean
    analytics: boolean
  }
}

export interface Subscription {
  id: string
  organizationId: string
  planId: string
  status: 'active' | 'canceled' | 'past_due' | 'trialing'
  currentPeriodStart: Date
  currentPeriodEnd: Date
  stripeSubscriptionId?: string
  stripeCustomerId?: string
}

export const SUBSCRIPTION_PLANS: Record<string, SubscriptionPlan> = {
  free: {
    id: 'free',
    name: 'Free',
    price: 0,
    interval: 'month',
    features: {
      organizations: 1,
      projects: 3,
      users: 5,
      documents: 100,
      aiCredits: 0,
      customDomain: false,
      prioritySupport: false,
      analytics: false,
    }
  },
  professional: {
    id: 'professional',
    name: 'Professional',
    price: 29,
    interval: 'month',
    features: {
      organizations: 1,
      projects: 10,
      users: 25,
      documents: 1000,
      aiCredits: 500,
      customDomain: false,
      prioritySupport: true,
      analytics: true,
    }
  },
  enterprise: {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99,
    interval: 'month',
    features: {
      organizations: 3,
      projects: -1, // unlimited
      users: 100,
      documents: -1, // unlimited
      aiCredits: 2000,
      customDomain: true,
      prioritySupport: true,
      analytics: true,
    }
  },
  enterprise_plus: {
    id: 'enterprise_plus',
    name: 'Enterprise Plus',
    price: 299,
    interval: 'month',
    features: {
      organizations: -1, // unlimited
      projects: -1, // unlimited
      users: -1, // unlimited
      documents: -1, // unlimited
      aiCredits: -1, // unlimited
      customDomain: true,
      prioritySupport: true,
      analytics: true,
    }
  }
}

export class SubscriptionService {
  /**
   * Get organization's current subscription
   */
  static async getOrganizationSubscription(organizationId: string): Promise<Subscription | null> {
    const subscription = await prisma.subscription.findFirst({
      where: { organizationId },
      orderBy: { createdAt: 'desc' }
    })

    return subscription as Subscription | null
  }

  /**
   * Get subscription plan details
   */
  static getSubscriptionPlan(planId: string): SubscriptionPlan | null {
    return SUBSCRIPTION_PLANS[planId] || null
  }

  /**
   * Check if organization can perform an action based on subscription limits
   */
  static async canPerformAction(
    organizationId: string,
    action: 'create_project' | 'add_user' | 'create_document' | 'use_ai',
    currentCount?: number
  ): Promise<{ allowed: boolean; reason?: string; limit?: number }> {
    const subscription = await this.getOrganizationSubscription(organizationId)
    const planId = subscription?.planId || 'free'
    const plan = this.getSubscriptionPlan(planId)

    if (!plan) {
      return { allowed: false, reason: 'Invalid subscription plan' }
    }

    switch (action) {
      case 'create_project':
        if (plan.features.projects === -1) return { allowed: true }
        const projectCount = currentCount ?? await this.getProjectCount(organizationId)
        if (projectCount >= plan.features.projects) {
          return { 
            allowed: false, 
            reason: 'Project limit reached', 
            limit: plan.features.projects 
          }
        }
        break

      case 'add_user':
        if (plan.features.users === -1) return { allowed: true }
        const userCount = currentCount ?? await this.getUserCount(organizationId)
        if (userCount >= plan.features.users) {
          return { 
            allowed: false, 
            reason: 'User limit reached', 
            limit: plan.features.users 
          }
        }
        break

      case 'create_document':
        if (plan.features.documents === -1) return { allowed: true }
        const documentCount = currentCount ?? await this.getDocumentCount(organizationId)
        if (documentCount >= plan.features.documents) {
          return { 
            allowed: false, 
            reason: 'Document limit reached', 
            limit: plan.features.documents 
          }
        }
        break

      case 'use_ai':
        if (plan.features.aiCredits === 0) {
          return { allowed: false, reason: 'AI features not available in current plan' }
        }
        if (plan.features.aiCredits === -1) return { allowed: true }
        const aiUsage = await this.getMonthlyAIUsage(organizationId)
        if (aiUsage >= plan.features.aiCredits) {
          return { 
            allowed: false, 
            reason: 'Monthly AI credit limit reached', 
            limit: plan.features.aiCredits 
          }
        }
        break
    }

    return { allowed: true }
  }

  /**
   * Get usage statistics for an organization
   */
  static async getUsageStats(organizationId: string) {
    const [projectCount, userCount, documentCount, aiUsage] = await Promise.all([
      this.getProjectCount(organizationId),
      this.getUserCount(organizationId),
      this.getDocumentCount(organizationId),
      this.getMonthlyAIUsage(organizationId)
    ])

    const subscription = await this.getOrganizationSubscription(organizationId)
    const plan = this.getSubscriptionPlan(subscription?.planId || 'free')

    return {
      current: {
        projects: projectCount,
        users: userCount,
        documents: documentCount,
        aiCredits: aiUsage
      },
      limits: plan ? {
        projects: plan.features.projects,
        users: plan.features.users,
        documents: plan.features.documents,
        aiCredits: plan.features.aiCredits
      } : null,
      plan: plan?.name || 'Free'
    }
  }

  /**
   * Create Stripe checkout session
   */
  static async createCheckoutSession(
    organizationId: string,
    planId: string,
    successUrl: string,
    cancelUrl: string
  ): Promise<{ sessionId: string; url: string }> {
    const plan = this.getSubscriptionPlan(planId)
    if (!plan) {
      throw new Error('Invalid plan')
    }

    // In a real implementation, this would create a Stripe checkout session
    // For now, we'll return a mock response
    const sessionId = `cs_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    
    return {
      sessionId,
      url: `https://checkout.stripe.com/pay/${sessionId}`
    }
  }

  /**
   * Handle successful subscription creation
   */
  static async handleSubscriptionSuccess(
    organizationId: string,
    planId: string,
    stripeSubscriptionId: string,
    stripeCustomerId: string
  ): Promise<Subscription> {
    const subscription = await prisma.subscription.create({
      data: {
        organizationId,
        planId,
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
        stripeSubscriptionId,
        stripeCustomerId,
      }
    })

    return subscription as Subscription
  }

  // Helper methods
  private static async getProjectCount(organizationId: string): Promise<number> {
    return prisma.project.count({
      where: { organizationId }
    })
  }

  private static async getUserCount(organizationId: string): Promise<number> {
    return prisma.user.count({
      where: { organizationId }
    })
  }

  private static async getDocumentCount(organizationId: string): Promise<number> {
    return prisma.document.count({
      where: {
        project: { organizationId }
      }
    })
  }

  private static async getMonthlyAIUsage(organizationId: string): Promise<number> {
    // Mock implementation - in production, this would query actual AI usage
    return Math.floor(Math.random() * 100)
  }
}