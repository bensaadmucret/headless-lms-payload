import { getPayload } from 'payload'
import config from '../src/payload.config'

async function resetPassword() {
    const payload = await getPayload({ config })

    try {
        const EMAIL = 'marie.bernard@etudiant.com'
        const NEW_PASSWORD = 'Password123!'

        // Find the user
        const users = await payload.find({
            collection: 'users',
            where: {
                email: {
                    equals: EMAIL,
                },
            },
        })

        if (users.docs.length === 0) {
            console.error('❌ User not found:', EMAIL)
            process.exit(1)
        }

        const userId = users.docs[0]!.id

        // Update password and reset login attempts
        await payload.update({
            collection: 'users',
            id: userId,
            data: {
                password: NEW_PASSWORD,
                loginAttempts: 0,
            },
        })

        console.log('✅ Password reset successfully!')
        console.log('Email:', EMAIL)
        console.log('New Password:', NEW_PASSWORD)
        console.log('Login attempts reset to 0')
    } catch (error) {
        console.error('❌ Error resetting password:', error)
        throw error
    }

    process.exit(0)
}

resetPassword()
