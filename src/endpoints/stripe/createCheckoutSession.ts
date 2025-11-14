import Stripe from 'stripe';
import { getPayload } from 'payload';
import type { Payload } from 'payload';
import type { User } from '../../payload-types';
import config from '../../payload.config';
import { STRIPE_API_VERSION } from '../../services/stripe/constants';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: STRIPE_API_VERSION,
});

export const createCheckoutSessionEndpoint = {
  path: '/stripe/create-checkout-session',
  method: 'post',
  handler: async (req: any, res: any) => {
    // Vérifier l'authentification
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentification requise' 
      });
    }
    try {
      const { priceId } = req.body as { priceId: string };
      
      // Utiliser les données de l'utilisateur connecté
      const userData = {
        email: req.user.email,
        firstName: req.user.firstName || '',
        lastName: req.user.lastName || ''
      };

      if (!priceId || !userData || !userData.email) {
        return res.status(400).json({ 
          error: 'priceId et userData.email sont requis' 
        });
      }

      const payload = (await getPayload({
        config,
      })) as Payload;

      // Vérifier si l'utilisateur existe déjà
      const existingUser = await payload.find({
        collection: 'users',
        where: {
          email: {
            equals: userData.email
          }
        }
      });

      let customerId: string | null = null;

      if (existingUser.docs.length > 0) {
        // Utilisateur existant - récupérer le customer Stripe
        const user = existingUser.docs[0];
        if (!user) {
          return res.status(404).json({ 
            error: 'Utilisateur non trouvé' 
          });
        }
        customerId = user.stripeCustomerId || null;
        
        if (!customerId) {
          // Créer le customer Stripe si inexistant
          const customer = await stripe.customers.create({
            email: userData.email,
            name: `${userData.firstName} ${userData.lastName}`,
            metadata: {
              userId: user.id,
              source: 'checkout'
            }
          });
          
          customerId = customer.id;
          
          // Mettre à jour l'utilisateur avec le customerId
          await payload.update({
            collection: 'users',
            id: user.id,
            data: {
              stripeCustomerId: customerId
            }
          });
        }
      } else {
        // Nouvel utilisateur - créer le customer Stripe
        const customer = await stripe.customers.create({
          email: userData.email,
          name: `${userData.firstName} ${userData.lastName}`,
          metadata: {
            firstName: userData.firstName,
            lastName: userData.lastName,
            source: 'checkout'
          }
        });
        
        customerId = customer.id;

        // Créer l'utilisateur en base avec le customerId
        const defaultName = userData.firstName || userData.lastName
          ? `${userData.firstName ?? ''} ${userData.lastName ?? ''}`.trim()
          : userData.email;

        const userPayload: Partial<User> = {
          email: userData.email,
          name: defaultName,
          firstName: userData.firstName || null,
          lastName: userData.lastName || null,
          stripeCustomerId: customerId,
          subscriptionStatus: 'none',
          emailVerified: false,
          role: 'student',
        };

        await payload.create({
          collection: 'users',
          data: userPayload,
        } as Parameters<Payload['create']>[0]);
      }

      // Récupérer le price ID correct
      const priceIdValue = priceId === 'yearly' 
        ? process.env.STRIPE_PRICE_ID_YEARLY 
        : process.env.STRIPE_PRICE_ID_MONTHLY;

      if (!priceIdValue) {
        return res.status(500).json({ 
          error: 'Price ID non configuré' 
        });
      }

      // Créer la session checkout
      if (!customerId) {
        return res.status(500).json({ 
          error: 'Erreur lors de la création du customer Stripe' 
        });
      }

      const session = await stripe.checkout.sessions.create({
        customer: customerId,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceIdValue,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        subscription_data: {
          trial_period_days: 30,
        },
        success_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/checkout/cancel`,
        metadata: {
          userEmail: userData.email,
          userFirstName: userData.firstName,
          userLastName: userData.lastName,
        },
      });

      res.json({ url: session.url });

    } catch (error: any) {
      console.error('Erreur création session checkout:', error);
      res.status(500).json({ 
        error: error.message || 'Erreur lors de la création de la session de paiement'
      });
    }
  },
};
