// API Route para manejar configuración de forma segura
// Este endpoint interno proporciona la configuración sin exponer datos sensibles

import { NextRequest, NextResponse } from 'next/server';

interface ConfigResponse {
  supabaseUrl: string;
  functionsUrl: string;
  environment: string;
}

export async function GET(request: NextRequest): Promise<NextResponse<ConfigResponse | { error: string }>> {
  try {
    // Obtener configuración del servidor (variables no públicas)
    const environment = process.env.NODE_ENV;
    const supabaseUrl = process.env.SUPABASE_URL; // Sin NEXT_PUBLIC_
    
    if (!supabaseUrl) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no disponible' },
        { status: 500 }
      );
    }

    const config: ConfigResponse = {
      supabaseUrl,
      functionsUrl: `${supabaseUrl}/functions/v1`,
      environment: environment || 'development'
    };

    // Headers de seguridad
    const headers = new Headers();
    headers.set('Cache-Control', 'private, no-cache, no-store, must-revalidate');
    headers.set('Content-Type', 'application/json');

    return NextResponse.json(config, { headers });
  } catch (error) {
    console.error('Error obteniendo configuración:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
