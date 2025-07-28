"use client";

import { buttonVariants } from "@/components/ui/button";
import {
  BrainCircuitIcon,
  ShieldCheckIcon,
  UsersIcon,
  ZapIcon,
  CheckCircleIcon,
  ArrowRightIcon,
  SparklesIcon,
  FileTextIcon,
  GitBranchIcon,
  CrownIcon
} from "lucide-react";
import Link from "next/link";
import { SignUpButton, SignInButton, useUser } from "@clerk/nextjs";
import { page_routes } from "@/lib/routes-config";

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Hero Section */}
      <section className="flex sm:min-h-[90vh] min-h-[85vh] flex-col sm:items-center justify-center text-center sm:py-16 py-12">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary">
          <SparklesIcon className="w-4 h-4" />
          AI-Powered Documentation Platform
        </div>

        <h1 className="text-[2rem] leading-tight sm:px-8 md:leading-[4.5rem] font-bold mb-6 sm:text-6xl text-left sm:text-center max-w-5xl">
          Transform Your Documentation with{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            AI-Powered Intelligence
          </span>
        </h1>

        <p className="mb-8 md:text-xl text-lg max-w-[800px] text-muted-foreground text-left sm:text-center leading-relaxed">
          TecoDocs Pro is the next-generation documentation platform that combines
          multi-tenant architecture, role-based access control, and AI-powered content
          creation to streamline your team's documentation workflow.
        </p>

        <HeroActionButtons />

        <div className="flex flex-wrap items-center justify-center gap-8 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Free 14-day trial
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            No credit card required
          </div>
          <div className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500" />
            Cancel anytime
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Everything you need for modern documentation
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Built for teams that demand security, scalability, and intelligent content creation
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard
              icon={<BrainCircuitIcon className="w-8 h-8 text-primary" />}
              title="AI-Powered Editing"
              description="Generate, improve, and optimize your documentation with advanced AI assistance. Available for Admin users with context-aware suggestions."
            />
            <FeatureCard
              icon={<ShieldCheckIcon className="w-8 h-8 text-primary" />}
              title="Enterprise Security"
              description="Multi-tenant architecture with role-based access control. Complete data isolation between organizations with audit trails."
            />
            <FeatureCard
              icon={<UsersIcon className="w-8 h-8 text-primary" />}
              title="Team Collaboration"
              description="Seamless collaboration with role-based permissions. From Super-Admin to Client access, everyone has their place."
            />
            <FeatureCard
              icon={<GitBranchIcon className="w-8 h-8 text-primary" />}
              title="Version Control"
              description="Git-like versioning with rollback capabilities. Track every change with complete audit trails and user attribution."
            />
            <FeatureCard
              icon={<ZapIcon className="w-8 h-8 text-primary" />}
              title="Lightning Fast"
              description="Built on Next.js 15 with React 19. Optimized for performance with <2s page loads and 99.9% uptime."
            />
            <FeatureCard
              icon={<FileTextIcon className="w-8 h-8 text-primary" />}
              title="Rich Content"
              description="MDX support with custom components. Create beautiful, interactive documentation with code blocks, diagrams, and more."
            />
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">
              Choose your plan
            </h2>
            <p className="text-xl text-muted-foreground">
              Start free, scale as you grow
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <PricingCard
              name="Free"
              price="$0"
              period="forever"
              description="Perfect for small teams getting started"
              features={[
                "1 organization",
                "3 projects",
                "5 users",
                "100 documents",
                "Community support"
              ]}
              buttonText="Start Free"
              popular={false}
            />
            <PricingCard
              name="Professional"
              price="$29"
              period="per month"
              description="For growing teams that need more power"
              features={[
                "1 organization",
                "10 projects",
                "25 users",
                "1,000 documents",
                "AI editing (limited)",
                "Priority support",
                "Custom branding"
              ]}
              buttonText="Start Trial"
              popular={true}
            />
            <PricingCard
              name="Enterprise"
              price="$99"
              period="per month"
              description="For large teams with advanced needs"
              features={[
                "3 organizations",
                "Unlimited projects",
                "100 users",
                "Unlimited documents",
                "Full AI capabilities",
                "Custom domains",
                "Advanced analytics",
                "White-label options"
              ]}
              buttonText="Contact Sales"
              popular={false}
            />
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-background border-t">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl sm:text-4xl font-bold mb-4">
            Ready to transform your documentation?
          </h2>
          <p className="text-xl mb-8 text-muted-foreground max-w-2xl mx-auto">
            Join thousands of teams already using TecoDocs Pro to create, manage,
            and scale their documentation with AI-powered intelligence.
          </p>
          <CTAButton />
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, description }: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="p-6 rounded-lg border bg-card hover:shadow-lg transition-shadow">
      <div className="mb-4">{icon}</div>
      <h3 className="text-xl font-semibold mb-2">{title}</h3>
      <p className="text-muted-foreground">{description}</p>
    </div>
  );
}

function PricingCard({
  name,
  price,
  period,
  description,
  features,
  buttonText,
  popular
}: {
  name: string;
  price: string;
  period: string;
  description: string;
  features: string[];
  buttonText: string;
  popular: boolean;
}) {
  return (
    <div className={`p-8 rounded-lg border bg-card relative ${popular ? 'border-primary shadow-lg scale-105' : ''}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <div className="bg-primary text-primary-foreground px-3 py-1 rounded-full text-sm font-medium flex items-center gap-1">
            <CrownIcon className="w-3 h-3" />
            Most Popular
          </div>
        </div>
      )}

      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold mb-2">{name}</h3>
        <div className="mb-2">
          <span className="text-4xl font-bold">{price}</span>
          <span className="text-muted-foreground">/{period}</span>
        </div>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <ul className="space-y-3 mb-8">
        {features.map((feature, index) => (
          <li key={index} className="flex items-center gap-2">
            <CheckCircleIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
            <span className="text-sm">{feature}</span>
          </li>
        ))}
      </ul>

      <PricingButton buttonText={buttonText} popular={popular} />
    </div>
  );
}

function HeroActionButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="sm:flex sm:flex-row grid grid-cols-1 items-center sm:gap-4 gap-3 mb-12">
        <div className="w-40 h-12 bg-muted animate-pulse rounded-md" />
        <div className="w-32 h-12 bg-muted animate-pulse rounded-md" />
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <div className="sm:flex sm:flex-row grid grid-cols-1 items-center sm:gap-4 gap-3 mb-12">
        <Link
          href="/dashboard"
          className={buttonVariants({ className: "px-8 py-3 text-base", size: "lg" })}
        >
          Go to Dashboard
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </Link>
        <Link
          href={`/docs${page_routes[0].href}`}
          className={buttonVariants({
            variant: "outline",
            className: "px-8 py-3 text-base",
            size: "lg",
          })}
        >
          View Documentation
        </Link>
      </div>
    );
  }

  return (
    <div className="sm:flex sm:flex-row grid grid-cols-1 items-center sm:gap-4 gap-3 mb-12">
      <SignUpButton mode="modal">
        <button className={buttonVariants({ className: "px-8 py-3 text-base", size: "lg" })}>
          Start Free Trial
          <ArrowRightIcon className="w-4 h-4 ml-2" />
        </button>
      </SignUpButton>
      <SignInButton mode="modal">
        <button className={buttonVariants({
          variant: "outline",
          className: "px-8 py-3 text-base",
          size: "lg",
        })}>
          Sign In
        </button>
      </SignInButton>
    </div>
  );
}

function CTAButton() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="w-48 h-12 bg-muted animate-pulse rounded-md mx-auto" />
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({
          variant: "secondary",
          className: "px-8 py-3 text-base",
          size: "lg"
        })}
      >
        Go to Dashboard
        <ArrowRightIcon className="w-4 h-4 ml-2" />
      </Link>
    );
  }

  return (
    <SignUpButton mode="modal">
      <button className={buttonVariants({
        variant: "secondary",
        className: "px-8 py-3 text-base",
        size: "lg"
      })}>
        Start Your Free Trial
        <ArrowRightIcon className="w-4 h-4 ml-2" />
      </button>
    </SignUpButton>
  );
}

function PricingButton({ buttonText, popular }: { buttonText: string; popular: boolean }) {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="w-full h-12 bg-muted animate-pulse rounded-md" />
    );
  }

  if (isSignedIn) {
    return (
      <Link
        href="/dashboard"
        className={buttonVariants({
          variant: popular ? "default" : "outline",
          className: "w-full",
          size: "lg"
        })}
      >
        Go to Dashboard
      </Link>
    );
  }

  return (
    <SignUpButton mode="modal">
      <button className={buttonVariants({
        variant: popular ? "default" : "outline",
        className: "w-full",
        size: "lg"
      })}>
        {buttonText}
      </button>
    </SignUpButton>
  );
}
