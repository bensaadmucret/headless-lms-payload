import { getPayload } from 'payload'
import config from '../src/payload.config'

async function createTestUser() {
    const payload = await getPayload({ config })

    try {
        // Create a test student user
        const testUser = await payload.create({
            collection: 'users',
            data: {
                email: 'test@example.com',
                password: 'Test123!',
                firstName: 'Test',
                lastName: 'User',
                role: 'student',
                studyYear: 'pass',
                onboardingComplete: false,
            },
        })

        console.log('✅ Test user created successfully!')
        console.log('Email: test@example.com')
        console.log('Password: Test123!')
        console.log('User ID:', testUser.id)
    } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key')) {
            console.log('⚠️  Test user already exists. Updating password...')

            // Find the existing user
            const existingUsers = await payload.find({
                collection: 'users',
                where: {
                    email: {
                        equals: 'test@example.com',
                    },
                },
            })

            const existingUser = existingUsers.docs[0]

            if (existingUser) {
                const userId = existingUser.id

                // Update the user with new password
                await payload.update({
                    collection: 'users',
                    id: userId,
                    data: {
                        password: 'Test123!',
                    },
                })

                console.log('✅ Password updated successfully!')
                console.log('Email: test@example.com')
                console.log('Password: Test123!')
            }
        } else {
            console.error('❌ Error creating test user:', error)
            throw error
        }
    }

    process.exit(0)
}

createTestUser()
