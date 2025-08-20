export const customFetchBinary = async (
  url: string,
  options: RequestInit = {}
): Promise<Response> => {
  const isLocalDevelopment = url.includes('localhost') || url.includes('127.0.0.1');
  
  const supabaseAnonKey = isLocalDevelopment 
    ? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY_LOCAL
    : process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  const defaultHeaders: Record<string, string> = {};

  if (supabaseAnonKey) {
    defaultHeaders['apikey'] = supabaseAnonKey;
  }

  if (url.includes('zoho-crm')) {
    if (supabaseAnonKey) {
      defaultHeaders['Authorization'] = `Bearer ${supabaseAnonKey}`;
    }
  }

  return await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
};
