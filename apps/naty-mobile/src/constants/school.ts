const schoolId = process.env.EXPO_PUBLIC_SCHOOL_ID;

if (!schoolId) {
  throw new Error(
    'Falta EXPO_PUBLIC_SCHOOL_ID en .env — debe ser el school_id de La Cima en Supabase.'
  );
}

export const SCHOOL_ID: string = schoolId;
