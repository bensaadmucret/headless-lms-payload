import payload from 'payload';

// Types locaux pour le handler, basés sur les conventions du projet
type PayloadRequest = {
  payload: typeof payload;
  body: any;
};

type Response = {
  status: (code: number) => Response;
  json: (data: any) => void;
};

export const onboardUserEndpoint = {
  path: '/users/onboard',
  method: 'post' as const,
  handler: async (req: PayloadRequest, res: Response) => {
    const { firstname, lastname, email, password, year, examDate, targetScore } = req.body;

    if (!firstname || !lastname || !email || !password) {
      return res.status(400).json({ message: 'Missing required fields for account creation.' });
    }

    try {
      const newUser = await req.payload.create({
        collection: 'users',
        data: {
          firstName: firstname,
          lastName: lastname,
          email: email,
          password: password,
          studyYear: year,
          examDate: examDate,
          studyProfile: {
            targetScore: parseInt(targetScore, 10),
          },
          role: 'student',
          onboardingComplete: true,
        },
      });

      return res.status(201).json({ message: 'User created successfully', user: newUser });

    } catch (error: any) {
      payload.logger.error(`Error creating user: ${error.message}`);
      // Renvoyer un message d'erreur plus générique au client
      const errorMessage = error.message.includes('already exists')
        ? 'Un utilisateur avec cet email existe déjà.'
        : 'An error occurred during user creation.';
      return res.status(500).json({ message: errorMessage });
    }
  },
};
