export interface EmailTemplate {
  subject: string
  html: string
  text: string
}

export interface InvitationData {
  inviterName: string
  organizationName: string
  role: string
  inviteUrl: string
  message?: string
}

export class EmailService {
  private static apiKey = process.env.RESEND_API_KEY || process.env.SENDGRID_API_KEY
  private static fromEmail = process.env.FROM_EMAIL || 'noreply@docify.ai'

  /**
   * Send team invitation email
   */
  static async sendInvitation(
    to: string,
    data: InvitationData
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getInvitationTemplate(data)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Send welcome email to new users
   */
  static async sendWelcomeEmail(
    to: string,
    userName: string,
    organizationName: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getWelcomeTemplate(userName, organizationName)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Send password reset email
   */
  static async sendPasswordReset(
    to: string,
    resetUrl: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getPasswordResetTemplate(resetUrl)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Send notification email
   */
  static async sendNotification(
    to: string,
    title: string,
    message: string,
    actionUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string }> {
    const template = this.getNotificationTemplate(title, message, actionUrl)
    
    return this.sendEmail({
      to,
      subject: template.subject,
      html: template.html,
      text: template.text
    })
  }

  /**
   * Core email sending method
   */
  private static async sendEmail({
    to,
    subject,
    html,
    text
  }: {
    to: string
    subject: string
    html: string
    text: string
  }): Promise<{ success: boolean; messageId?: string; error?: string }> {
    try {
      // For development, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 Email would be sent:', {
          to,
          subject,
          preview: text.substring(0, 100) + '...'
        })
        return { success: true, messageId: 'dev-' + Date.now() }
      }

      // In production, integrate with your email service
      // Example with Resend:
      if (process.env.RESEND_API_KEY) {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: this.fromEmail,
            to: [to],
            subject,
            html,
            text,
          }),
        })

        if (!response.ok) {
          throw new Error(`Email service error: ${response.statusText}`)
        }

        const data = await response.json()
        return { success: true, messageId: data.id }
      }

      // Fallback: log email for manual sending
      console.log('📧 Email to send manually:', { to, subject, html, text })
      return { success: true, messageId: 'manual-' + Date.now() }

    } catch (error) {
      console.error('Email sending error:', error)
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown email error' 
      }
    }
  }

  /**
   * Email templates
   */
  private static getInvitationTemplate(data: InvitationData): EmailTemplate {
    const subject = `You're invited to join ${data.organizationName} on Docify.ai Pro`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">You're Invited!</h1>
            
            <p>Hi there,</p>
            
            <p><strong>${data.inviterName}</strong> has invited you to join <strong>${data.organizationName}</strong> on Docify.ai Pro as a <strong>${data.role}</strong>.</p>
            
            ${data.message ? `<blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin: 16px 0; font-style: italic;">${data.message}</blockquote>` : ''}
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${data.inviteUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Accept Invitation</a>
            </div>
            
            <p>If you can't click the button, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${data.inviteUrl}</p>
            
            <hr style="margin: 32px 0; border: none; border-top: 1px solid #eee;">
            
            <p style="font-size: 14px; color: #666;">
              This invitation was sent by ${data.inviterName} from ${data.organizationName}. 
              If you weren't expecting this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `
    
    const text = `
      You're invited to join ${data.organizationName} on Docify.ai Pro!
      
      ${data.inviterName} has invited you to join as a ${data.role}.
      
      ${data.message ? `Message: ${data.message}` : ''}
      
      Accept your invitation: ${data.inviteUrl}
      
      If you weren't expecting this invitation, you can safely ignore this email.
    `
    
    return { subject, html, text }
  }

  private static getWelcomeTemplate(userName: string, organizationName: string): EmailTemplate {
    const subject = `Welcome to ${organizationName} on Docify.ai Pro!`
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Welcome to Docify.ai Pro!</h1>
            
            <p>Hi ${userName},</p>
            
            <p>Welcome to <strong>${organizationName}</strong>! We're excited to have you on board.</p>
            
            <p>Here's what you can do to get started:</p>
            
            <ul>
              <li>Explore your organization's projects and documentation</li>
              <li>Create your first document or contribute to existing ones</li>
              <li>Collaborate with your team members</li>
              <li>Use our AI-powered tools to enhance your content</li>
            </ul>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${process.env.NEXT_PUBLIC_BASE_URL}/dashboard" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Go to Dashboard</a>
            </div>
            
            <p>If you have any questions, don't hesitate to reach out to your team or check our help documentation.</p>
            
            <p>Happy documenting!</p>
            <p>The Docify.ai Pro Team</p>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Welcome to ${organizationName} on Docify.ai Pro!
      
      Hi ${userName},
      
      Welcome to ${organizationName}! We're excited to have you on board.
      
      Get started by visiting your dashboard: ${process.env.NEXT_PUBLIC_BASE_URL}/dashboard
      
      Happy documenting!
      The Docify.ai Pro Team
    `
    
    return { subject, html, text }
  }

  private static getPasswordResetTemplate(resetUrl: string): EmailTemplate {
    const subject = 'Reset your Docify.ai Pro password'
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">Reset Your Password</h1>
            
            <p>You requested a password reset for your Docify.ai Pro account.</p>
            
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password</a>
            </div>
            
            <p>If you can't click the button, copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #666;">${resetUrl}</p>
            
            <p>This link will expire in 24 hours for security reasons.</p>
            
            <p>If you didn't request this password reset, you can safely ignore this email.</p>
          </div>
        </body>
      </html>
    `
    
    const text = `
      Reset Your Password
      
      You requested a password reset for your Docify.ai Pro account.
      
      Reset your password: ${resetUrl}
      
      This link will expire in 24 hours for security reasons.
      
      If you didn't request this password reset, you can safely ignore this email.
    `
    
    return { subject, html, text }
  }

  private static getNotificationTemplate(title: string, message: string, actionUrl?: string): EmailTemplate {
    const subject = title
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${subject}</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">${title}</h1>
            
            <p>${message}</p>
            
            ${actionUrl ? `
              <div style="text-align: center; margin: 32px 0;">
                <a href="${actionUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Details</a>
              </div>
            ` : ''}
            
            <p>Best regards,<br>The Docify.ai Pro Team</p>
          </div>
        </body>
      </html>
    `
    
    const text = `
      ${title}
      
      ${message}
      
      ${actionUrl ? `View details: ${actionUrl}` : ''}
      
      Best regards,
      The Docify.ai Pro Team
    `
    
    return { subject, html, text }
  }
}