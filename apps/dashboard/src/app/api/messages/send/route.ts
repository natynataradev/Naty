import { NextRequest, NextResponse } from 'next/server';
import { api } from '@/lib/api';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const data = await api.post<any>('/messages/send', body);
    return NextResponse.json(data);
  } catch (err) {
    console.error('Error sending message:', err);
    return NextResponse.json(
      { error: (err as Error).message || 'Error al enviar el mensaje' },
      { status: 500 }
    );
  }
}
