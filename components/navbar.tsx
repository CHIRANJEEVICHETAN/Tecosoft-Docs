"use client";

import { ModeToggle } from "@/components/theme-toggle";
import { GithubIcon, TwitterIcon, FileTextIcon } from "lucide-react";
import Link from "next/link";
import { SignInButton, SignUpButton, useUser } from "@clerk/nextjs";
import { ThemedUserButton } from "@/components/themed-user-button";
import { buttonVariants } from "./ui/button";
import Anchor from "./anchor";
import { SheetLeftbar } from "./leftbar";
import { page_routes } from "@/lib/routes-config";
import { SheetClose } from "@/components/ui/sheet";
import AlgoliaSearch from "./algolia-search";

export const NAVLINKS: Array<{
  title: string;
  href: string;
  protected?: boolean;
}> = [
  {
    title: "Features",
    href: "/#features",
  },
  {
    title: "Pricing",
    href: "/#pricing",
  },
  {
    title: "Documentation",
    href: `/docs${page_routes[0].href}`,
    protected: true,
  },
  {
    title: "Blog",
    href: "/blog",
  },
];

const algolia_props = {
  appId: process.env.ALGOLIA_APP_ID || "",
  indexName: process.env.ALGOLIA_INDEX || "",
  apiKey: process.env.ALGOLIA_SEARCH_API_KEY || "",
};

export function Navbar() {
  return (
    <nav className="w-full border-b h-16 sticky top-0 z-50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="sm:container mx-auto w-[95vw] h-full flex items-center sm:justify-between md:gap-2">
        <div className="flex items-center sm:gap-5 gap-2.5">
          <SheetLeftbar />
          <div className="flex items-center gap-6">
            <div className="lg:flex hidden">
              <Logo />
            </div>
            <div className="md:flex hidden items-center gap-6 text-sm font-medium text-muted-foreground">
              <NavMenu />
            </div>
          </div>
        </div>

        <div className="flex items-center sm:justify-normal justify-between sm:gap-3 ml-1 sm:w-fit w-[90%]">
          {algolia_props.appId && algolia_props.indexName && algolia_props.apiKey && (
            <AlgoliaSearch {...algolia_props} />
          )}
          <div className="flex items-center justify-between sm:gap-2">
            <AuthSection />
          </div>
        </div>
      </div>
    </nav>
  );
}

export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <FileTextIcon className="w-6 h-6 text-primary" strokeWidth={2} />
      <h2 className="text-lg font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
        Docify.ai Pro
      </h2>
    </Link>
  );
}

export function NavMenu({ isSheet = false }) {
  const { isSignedIn } = useUser();
  
  return (
    <>
      {NAVLINKS.map((item) => {
        // Skip protected routes if user is not signed in
        if (item.protected && !isSignedIn) {
          return null;
        }
        
        const Comp = (
          <Anchor
            key={item.title + item.href}
            activeClassName="!text-primary dark:font-medium font-semibold"
            absolute
            className="flex items-center gap-1 sm:text-sm text-[14.5px] hover:text-primary transition-colors"
            href={item.href}
          >
            {item.title}
          </Anchor>
        );
        return isSheet ? (
          <SheetClose key={item.title + item.href} asChild>
            {Comp}
          </SheetClose>
        ) : (
          Comp
        );
      })}
    </>
  );
}

function AuthSection() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        <Link
          href="https://github.com/tecosoft/Docify.ai-pro"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
          })}
        >
          <GithubIcon className="h-[1.1rem] w-[1.1rem]" />
        </Link>
        <Link
          href="#"
          className={buttonVariants({
            variant: "ghost",
            size: "icon",
          })}
        >
          <TwitterIcon className="h-[1.1rem] w-[1.1rem]" />
        </Link>
        <ModeToggle />
      </div>
      
      <AuthButtons />
    </div>
  );
}

function AuthButtons() {
  const { isSignedIn, isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="flex items-center gap-2">
        <div className="w-16 h-8 bg-muted animate-pulse rounded" />
        <div className="w-16 h-8 bg-muted animate-pulse rounded" />
      </div>
    );
  }

  if (isSignedIn) {
    return <ThemedUserButton />;
  }

  return (
    <div className="flex items-center gap-2">
      <SignInButton mode="modal">
        <button className={buttonVariants({ variant: "ghost", size: "sm" })}>
          Sign In
        </button>
      </SignInButton>
      <SignUpButton mode="modal">
        <button className={buttonVariants({ size: "sm" })}>
          Sign Up
        </button>
      </SignUpButton>
    </div>
  );
}
