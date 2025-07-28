---
inclusion: always
---

# Docify.ai Pro - Project Overview

## Project Identity
**Name**: Docify.ai Pro (Enhanced Aria-Docs Platform)  
**Type**: Multi-tenant SaaS Documentation Platform  
**Base**: Aria-Docs (Next.js documentation template)  
**Team Size**: 2 developers  
**Development Approach**: Rapid iterative development  

## Vision Statement
Transform the open-source Aria-Docs template into a comprehensive, AI-powered, multi-tenant documentation platform that serves organizations of all sizes with enterprise-grade features, intelligent content management, and flexible subscription models.

## Core Technology Stack
- **Framework**: Next.js 15 with App Router
- **Frontend**: React 19, TypeScript, Tailwind CSS
- **UI Components**: Shadcn-UI, Radix UI primitives
- **Authentication**: Clerk (with RBAC)
- **Database**: PostgreSQL with Prisma ORM
- **Content**: MDX with next-mdx-remote
- **Styling**: Tailwind CSS with custom design system
- **Deployment**: Vercel (implied from next.config.ts)

## Key Features
1. **Multi-tenant Architecture** - Complete data isolation between organizations
2. **Role-Based Access Control** - 5-tier organization roles + 4-tier project roles
3. **AI-Powered Editing** - LLM integration for content creation (Admin only)
4. **Version Control** - Git-like versioning with rollback capabilities
5. **Subscription Management** - Freemium model with Stripe integration
6. **Client Portal** - Separate access for external clients
7. **Advanced Search** - Algolia integration for fast content discovery

## Business Model
- **Free Tier**: 1 org, 3 projects, 5 users, 100 documents
- **Professional ($29/month)**: 1 org, 10 projects, 25 users, 1K documents, limited AI
- **Enterprise ($99/month)**: 3 orgs, unlimited projects, 100 users, unlimited docs, full AI
- **Enterprise Plus**: Custom pricing for unlimited scale

## Target Market
- **Primary**: Small to medium enterprises (SMEs) needing organized documentation
- **Secondary**: Large enterprises requiring multi-project documentation  
- **Tertiary**: Consultants and agencies managing client documentation

## Success Metrics
- **Revenue**: $10K MRR by month 12
- **Growth**: 15% month-over-month user growth
- **Performance**: <2s page loads, 99.9% uptime
- **Satisfaction**: 90%+ customer satisfaction, <5% monthly churn