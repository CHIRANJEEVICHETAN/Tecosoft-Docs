import type { Appearance } from "@clerk/types";

export const clerkAppearance: Appearance = {
  layout: {
    socialButtonsVariant: "iconButton",
    socialButtonsPlacement: "bottom",
  },
  variables: {
    colorPrimary: "hsl(var(--primary))",
    colorBackground: "hsl(var(--background))",
    colorInputBackground: "hsl(var(--background))",
    colorInputText: "hsl(var(--foreground))",
    colorText: "hsl(var(--foreground))",
    colorTextSecondary: "hsl(var(--muted-foreground))",
    colorDanger: "hsl(var(--destructive))",
    borderRadius: "0.5rem",
  },
  elements: {
    formButtonPrimary: 
      "bg-primary text-primary-foreground hover:bg-primary/90 text-sm normal-case",
    card: "bg-card text-card-foreground border border-border shadow-sm",
    headerTitle: "text-foreground",
    headerSubtitle: "text-muted-foreground",
    socialButtonsIconButton: 
      "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
    formFieldInput: 
      "border border-input bg-background text-foreground placeholder:text-muted-foreground",
    footerActionLink: "text-primary hover:text-primary/80",
    
    // UserButton dropdown styling for dark mode compatibility
    userButtonPopoverCard: "bg-popover text-popover-foreground border border-border shadow-md rounded-md",
    userButtonPopoverActionButton: "text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200 rounded-sm",
    userButtonPopoverActionButtonText: "text-foreground font-medium",
    userButtonPopoverFooter: "bg-popover border-t border-border",
    userButtonPopoverActionButtonIcon: "text-foreground opacity-90",
    
    // Additional UserButton elements for better dark mode support
    userButtonTrigger: "focus:shadow-none",
    userButtonAvatarBox: "border-2 border-border",
    userButtonPopoverMain: "bg-popover",
    userButtonPopoverActions: "bg-popover",
    
    // Menu item styling
    menuItem: "text-foreground hover:bg-accent hover:text-accent-foreground",
    menuItemText: "text-foreground",
    menuItemIcon: "text-foreground",
    
    // Divider styling
    dividerLine: "bg-border",
    dividerText: "text-muted-foreground",
  },
};

// Social connection configuration
export const socialConnections = {
  google: true,
  github: true,
  linkedin: true,
};

// Authentication features configuration
export const authFeatures = {
  emailLink: true,
  mfa: true,
  passkeys: true,
  phoneNumber: true,
};
