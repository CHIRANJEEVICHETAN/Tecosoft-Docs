# Clerk Authentication Setup Guide

This guide explains how to complete the Clerk authentication setup for your Next.js application.

## 🔧 Setup Steps

### 1. Create a Clerk Account
1. Go to [https://clerk.com](https://clerk.com)
2. Sign up for a free account
3. Create a new application

### 2. Configure Environment Variables
1. In your Clerk dashboard, go to **API Keys**
2. Copy your **Publishable Key** and **Secret Key**
3. Update the `.env.local` file with your actual keys:

```env
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_publishable_key_here
CLERK_SECRET_KEY=sk_test_your_actual_secret_key_here
```

### 3. Configure Social Providers

#### Google OAuth
1. In Clerk dashboard, go to **User & Authentication** → **Social Connections**
2. Enable **Google** 
3. Add your Google OAuth credentials:
   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Create a new project or select existing one
   - Enable Google+ API
   - Create OAuth 2.0 credentials
   - Set authorized redirect URIs to: `https://your-domain.clerk.accounts.dev/v1/oauth_callback`
   - Copy Client ID and Client Secret to Clerk

#### GitHub OAuth  
1. In Clerk dashboard, enable **GitHub**
2. Add your GitHub OAuth app credentials:
   - Go to GitHub → Settings → Developer settings → OAuth Apps
   - Create a new OAuth app
   - Set Authorization callback URL to: `https://your-domain.clerk.accounts.dev/v1/oauth_callback`
   - Copy Client ID and Client Secret to Clerk

#### LinkedIn OAuth
1. In Clerk dashboard, enable **LinkedIn**
2. Add your LinkedIn OAuth credentials:
   - Go to [LinkedIn Developer Portal](https://www.linkedin.com/developers/)
   - Create a new app
   - Add redirect URL: `https://your-domain.clerk.accounts.dev/v1/oauth_callback`
   - Copy Client ID and Client Secret to Clerk

### 4. Configure Authentication Features

#### Magic Link Authentication
1. In Clerk dashboard, go to **User & Authentication** → **Email, Phone, Username**
2. Enable **Email address** as an identifier
3. Under **Email address**, enable **Email link** as a verification method

#### Multi-Factor Authentication (MFA)
1. Go to **User & Authentication** → **Multi-factor**
2. Enable **SMS verification** and/or **Authenticator app (TOTP)**
3. Configure backup codes if desired

#### Additional Features
- **Phone Numbers**: Enable in **Email, Phone, Username** section
- **Passkeys**: Enable in **Multi-factor** section for passwordless authentication

### 5. Customize Appearance (Optional)
The application includes a custom theme that matches your existing design. You can modify the appearance in `lib/clerk-config.ts`.

## 🚀 Available Routes

After setup, these routes will be available:

- `/sign-in` - Sign in page
- `/sign-up` - Sign up page  
- `/profile` - User profile management
- All other routes are public by default (configurable in `middleware.ts`)

## 🔒 Route Protection

To protect specific routes:

1. Edit `middleware.ts`
2. Remove routes from the `publicRoutes` array
3. Protected routes will require authentication

Example:
```typescript
publicRoutes: [
  "/",
  "/docs(.*)",
  "/blog(.*)",
  // Remove "/protected-route" to require auth
],
```

## 🎨 Customization

### Theme Integration
The Clerk components automatically inherit your app's theme (light/dark mode) through the custom appearance configuration.

### Custom Components
You can create custom authentication flows by using Clerk's hooks:

```tsx
import { useUser, useAuth } from "@clerk/nextjs";

function CustomComponent() {
  const { user } = useUser();
  const { signOut } = useAuth();
  
  if (!user) return <div>Please sign in</div>;
  
  return (
    <div>
      <p>Welcome, {user.firstName}!</p>
      <button onClick={() => signOut()}>Sign out</button>
    </div>
  );
}
```

## 🛠️ Development

To test the authentication:

1. Start your development server: `npm run dev`
2. Navigate to `http://localhost:3000`
3. Click on the user button in the navbar
4. Test sign-up/sign-in flows

## 📚 Additional Resources

- [Clerk Documentation](https://clerk.com/docs)
- [Next.js Integration Guide](https://clerk.com/docs/quickstarts/nextjs)
- [Customization Options](https://clerk.com/docs/components/customization/overview)

## 🔍 Troubleshooting

### Common Issues

1. **"Clerk: Missing publishableKey"**
   - Ensure your `.env.local` has the correct `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
   - Restart your development server

2. **Social login not working**
   - Verify OAuth app redirect URIs match Clerk's requirements
   - Check that OAuth apps are properly configured and published

3. **Middleware errors**
   - Ensure `middleware.ts` is in the root directory
   - Check that route patterns are correct

4. **Styling issues**
   - Verify Tailwind classes are available
   - Check that the appearance configuration matches your design system

## ✅ Configuration Checklist

- [ ] Clerk account created
- [ ] Environment variables configured
- [ ] Google OAuth configured (optional)
- [ ] GitHub OAuth configured (optional) 
- [ ] LinkedIn OAuth configured (optional)
- [ ] Magic link enabled
- [ ] MFA configured
- [ ] Routes tested
- [ ] Custom styling applied
- [ ] Production deployment configured

Once you complete these steps, your authentication system will be fully functional with social logins, magic links, and multi-factor authentication!
