import { NextRequest, NextResponse } from 'next/server';
import authService from '../../../services/authService';

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const validation = await authService.validateToken();
    
    if (validation.success && validation.user && validation.user.email === email) {
      return NextResponse.json({
        valid: true,
        user: {
          id: validation.user.id,
          email: validation.user.email,
          name: validation.user.name,
          firstName: validation.user.firstName,
          lastName: validation.user.lastName
        }
      });
    }
    
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    console.error('Error validating nomina token:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}