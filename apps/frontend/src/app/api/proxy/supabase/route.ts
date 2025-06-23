// Proxy API para llamadas seguras a Supabase
// Este endpoint maneja las llamadas sin exponer claves en el cliente

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    // Obtener configuración del servidor (variables privadas)
    const supabaseUrl = process.env.SUPABASE_URL;
    const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      return NextResponse.json(
        { error: 'Configuración de Supabase no disponible' },
        { status: 500 }
      );
    }

    // Obtener la función y datos del body
    const body = await request.json();
    const { function: functionName, ...requestData } = body;
    
    if (!functionName) {
      return NextResponse.json(
        { error: 'Función no especificada' },
        { status: 400 }
      );
    }

    // Hacer la llamada a Supabase con las credenciales del servidor
    const supabaseResponse = await fetch(`${supabaseUrl}/functions/v1/${functionName}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseAnonKey}`,
        'apikey': supabaseAnonKey,
      },
      body: JSON.stringify(requestData),
    });

    const responseData = await supabaseResponse.json();

    // Retornar la respuesta manteniendo el status code
    return NextResponse.json(responseData, { 
      status: supabaseResponse.status,
      headers: {
        'Content-Type': 'application/json',
      }
    });

  } catch (error) {
    console.error('Error en proxy de Supabase:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// También manejar GET si es necesario
export async function GET(request: NextRequest): Promise<NextResponse> {
  return NextResponse.json(
    { error: 'Método no permitido' },
    { status: 405 }
  );
}
