import { NextRequest, NextResponse } from 'next/server';
import * as crypto from 'crypto';

function base64UrlDecode(str: string): string {
  str += new Array(5 - str.length % 4).join('=');
  return Buffer.from(str.replace(/\-/g, '+').replace(/_/g, '/'), 'base64').toString();
}

function verifyJWT(token: string, secret: string): Record<string, unknown> {
  try {
    const [header, payload, signature] = token.split('.');
    
    if (!header || !payload || !signature) {
      throw new Error('Invalid JWT format');
    }

    const expectedSignature = crypto
      .createHmac('sha512', secret)
      .update(`${header}.${payload}`)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new Error('Invalid signature');
    }

    const decodedPayload = JSON.parse(base64UrlDecode(payload));
    
    if (decodedPayload.exp && Date.now() >= decodedPayload.exp * 1000) {
      throw new Error('Token expired');
    }

    return decodedPayload;
  } catch (error) {
    throw error;
  }
}

export async function POST(request: NextRequest) {
  try {
    const { token, email } = await request.json();
    
    if (!token || !email) {
      return NextResponse.json({ valid: false }, { status: 400 });
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('JWT_SECRET not found');
      return NextResponse.json({ valid: false }, { status: 500 });
    }

    try {
      const decoded = verifyJWT(token, jwtSecret);
      
      if (decoded && decoded.email === email) {
        return NextResponse.json({
          valid: true,
          user: {
            id: decoded.sub || decoded.id,
            email: decoded.email,
            name: decoded.name,
            firstName: decoded.firstName,
            lastName: decoded.lastName
          }
        });
      }
    } catch (jwtError) {
      console.error('JWT verification failed:', jwtError);
      return NextResponse.json({ valid: false }, { status: 401 });
    }
    
    return NextResponse.json({ valid: false }, { status: 401 });
  } catch (error) {
    console.error('Error validating nomina token:', error);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}