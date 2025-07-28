import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { Webhook } from 'svix'
import { prisma } from '@/lib/prisma'
import { Role } from '@prisma/client'

export async function POST(req: NextRequest) {
  // Get the headers
  const headerPayload = headers()
  const svix_id = headerPayload.get('svix-id')
  const svix_timestamp = headerPayload.get('svix-timestamp')
  const svix_signature = headerPayload.get('svix-signature')

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response('Error occured -- no svix headers', {
      status: 400,
    })
  }

  // Get the body
  const payload = await req.json()
  const body = JSON.stringify(payload)

  // Create a new Svix instance with your secret.
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET || '')

  let evt: any

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      'svix-id': svix_id,
      'svix-timestamp': svix_timestamp,
      'svix-signature': svix_signature,
    })
  } catch (err) {
    console.error('Error verifying webhook:', err)
    return new Response('Error occured', {
      status: 400,
    })
  }

  // Handle the webhook
  const eventType = evt.type

  if (eventType === 'user.created') {
    try {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      // Get the primary email
      const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id)
      
      if (!primaryEmail) {
        console.error('No primary email found for user:', id)
        return new Response('No primary email', { status: 400 })
      }

      // Check if user already exists
      const existingUser = await prisma.user.findUnique({
        where: { clerkId: id }
      })

      if (existingUser) {
        console.log('User already exists:', id)
        return new Response('User already exists', { status: 200 })
      }

      // Determine role based on email (for demo purposes)
      let role = Role.USER
      let organizationId: string | null = null
      
      if (primaryEmail.email_address.includes('superadmin') || primaryEmail.email_address === 'superadmin@docify.ai') {
        role = Role.SUPER_ADMIN
        organizationId = null // SUPER_ADMIN is not tied to any organization
      } else {
        // For non-super-admin users, create a default organization if none exists
        let defaultOrg = await prisma.organization.findFirst({
          where: { slug: 'default-org' }
        })

        if (!defaultOrg) {
          defaultOrg = await prisma.organization.create({
            data: {
              name: 'Default Organization',
              slug: 'default-org',
              description: 'Default organization for new users'
            }
          })
        }
        
        organizationId = defaultOrg.id
        
        if (primaryEmail.email_address.includes('admin')) {
          role = Role.ORG_ADMIN
        } else if (primaryEmail.email_address.includes('manager')) {
          role = Role.MANAGER
        }
      }

      // Create user in database
      const user = await prisma.user.create({
        data: {
          clerkId: id,
          email: primaryEmail.email_address,
          name: `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url,
          role,
          organizationId
        }
      })

      console.log('Created user:', user.id, user.email, user.role)

      return new Response('User created', { status: 200 })
    } catch (error) {
      console.error('Error creating user:', error)
      return new Response('Error creating user', { status: 500 })
    }
  }

  if (eventType === 'user.updated') {
    try {
      const { id, email_addresses, first_name, last_name, image_url } = evt.data

      const primaryEmail = email_addresses.find((email: any) => email.id === evt.data.primary_email_address_id)
      
      if (!primaryEmail) {
        return new Response('No primary email', { status: 400 })
      }

      // Update user in database
      await prisma.user.update({
        where: { clerkId: id },
        data: {
          email: primaryEmail.email_address,
          name: `${first_name || ''} ${last_name || ''}`.trim() || primaryEmail.email_address,
          firstName: first_name,
          lastName: last_name,
          imageUrl: image_url
        }
      })

      console.log('Updated user:', id)

      return new Response('User updated', { status: 200 })
    } catch (error) {
      console.error('Error updating user:', error)
      return new Response('Error updating user', { status: 500 })
    }
  }

  if (eventType === 'user.deleted') {
    try {
      const { id } = evt.data

      // Delete user from database
      await prisma.user.delete({
        where: { clerkId: id }
      })

      console.log('Deleted user:', id)

      return new Response('User deleted', { status: 200 })
    } catch (error) {
      console.error('Error deleting user:', error)
      return new Response('Error deleting user', { status: 500 })
    }
  }

  return new Response('Webhook received', { status: 200 })
}