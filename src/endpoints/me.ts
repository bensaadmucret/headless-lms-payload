// Types simplifiés pour éviter les dépendances externes
type User = {
  id: string | number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  studyProfile?: any;
  examDate?: string;
  password?: string;
  [key: string]: any; // Pour les champs supplémentaires
};

type PayloadRequest = {
  user?: User;
  payload: {
    findByID: (args: {
      collection: string;
      id: string | number;
      depth?: number;
    }) => Promise<User>;
  };
};

type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
};

// Type pour la réponse de l'endpoint
type MeResponse = {
  authenticated: boolean;
  message?: string;
  code?: string;
  user?: Omit<User, 'password'>;
  error?: string; // Ajout du champ error
};

/**
 * Endpoint personnalisé pour gérer la récupération du profil utilisateur
 * Remplace le comportement par défaut de Payload pour /api/users/me
 */
// Endpoint pour gérer la récupération du profil utilisateur
export const meEndpoint = {
  path: '/users/me',
  method: 'get' as const,
  handler: async (req: PayloadRequest, res: Response) => {
    // Vérification robuste de la présence de l'utilisateur
    if (!req.user || !req.user.id) {
      // Si aucun utilisateur n'est authentifié, renvoyer une erreur 401
      return res.status(401).json({
        authenticated: false,
        message: 'Aucun utilisateur authentifié. Veuillez vous connecter.',
        code: 'UNAUTHENTICATED',
      });
    }

    try {
      // Récupérer l'utilisateur avec les champs de base
      const user = await req.payload.findByID({
        collection: 'users',
        id: req.user.id,
        depth: 0
      });

      // Ne renvoyer que les champs nécessaires
      const { 
        id, 
        email, 
        firstName, 
        lastName, 
        role,
        studyProfile,
        examDate
      } = user;

      return res.json({ 
        authenticated: true,
        user: { 
          id, 
          email, 
          firstName, 
          lastName, 
          role,
          studyProfile,
          examDate
        }
      });
      
    } catch (error) {
      console.error('Erreur lors de la récupération du profil utilisateur:', {
        error: error instanceof Error ? error.message : 'Erreur inconnue',
        userId: req.user?.id,
        timestamp: new Date().toISOString()
      });
      
      return res.status(500).json({ 
        authenticated: false,
        error: 'Erreur lors de la récupération du profil',
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Une erreur est survenue lors de la récupération de votre profil'
      });
    }
  }
};
