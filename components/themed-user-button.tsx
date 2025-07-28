"use client";

import { UserButton } from "@clerk/nextjs";
import { useTheme } from "next-themes";
import { clerkAppearance } from "@/lib/clerk-config";

interface ThemedUserButtonProps {
  appearance?: any;
}

export function ThemedUserButton({
  appearance
}: ThemedUserButtonProps) {
  const { theme, resolvedTheme } = useTheme();
  const currentTheme = resolvedTheme || theme;
  const isDark = currentTheme === 'dark';

  // Define theme-specific styles as simple objects
  const darkModeElements = {
    userButtonPopoverCard: 'bg-popover text-popover-foreground border border-border shadow-lg backdrop-blur-sm rounded-md',
    userButtonPopoverActionButton: 'text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 font-medium rounded-sm',
    userButtonPopoverActionButtonText: 'text-foreground font-medium contrast-more:font-semibold',
    userButtonPopoverActionButtonIcon: 'text-foreground opacity-90',
    userButtonPopoverFooter: 'bg-popover border-t border-border',
    userButtonPopoverMain: 'bg-popover text-popover-foreground',
    userButtonAvatarBox: 'border-2 border-border ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    menuItem: 'text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 transition-colors',
    menuItemText: 'text-foreground font-medium',
    menuItemIcon: 'text-foreground opacity-90',
    dividerLine: 'bg-border opacity-50',
    dividerText: 'text-muted-foreground text-xs'
  };

  const lightModeElements = {
    userButtonPopoverCard: 'bg-popover text-popover-foreground border border-border shadow-md rounded-md',
    userButtonPopoverActionButton: 'text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 rounded-sm',
    userButtonPopoverActionButtonText: 'text-foreground font-medium',
    userButtonPopoverActionButtonIcon: 'text-foreground',
    userButtonPopoverFooter: 'bg-popover border-t border-border',
    userButtonPopoverMain: 'bg-popover text-popover-foreground',
    userButtonAvatarBox: 'border-2 border-border ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
    menuItem: 'text-foreground hover:bg-accent hover:text-accent-foreground rounded-md px-2 py-1.5 transition-colors',
    menuItemText: 'text-foreground',
    menuItemIcon: 'text-foreground',
    dividerLine: 'bg-border',
    dividerText: 'text-muted-foreground text-xs'
  };

  // Create the appearance object without complex type inference
  const baseElements = clerkAppearance.elements || {};
  const customElements = appearance?.elements || {};
  const themeElements = isDark ? darkModeElements : lightModeElements;

  const finalAppearance = {
    ...clerkAppearance,
    ...appearance,
    elements: {
      ...baseElements,
      ...customElements,
      ...themeElements
    }
  };

  return (
    <UserButton
      appearance={finalAppearance}
      showName={false}
    />
  );
}