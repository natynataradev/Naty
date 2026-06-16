import { Router, type Request, type Response, type Router as RouterType } from 'express';
import { messagingService } from './messaging-service.js';
import { supabase } from '../db/client.js';
import { env } from '../config/env.js';

export const messagesRouter: RouterType = Router();

messagesRouter.post('/send', async (req: Request, res: Response) => {
  try {
    const { contactId, body } = req.body as { contactId?: string; body?: string };

    if (!contactId || !body) {
      res.status(400).json({ error: 'contactId y body son requeridos' });
      return;
    }

    // Obtener el contacto
    const { data: contact } = await supabase
      .from('contacts')
      .select('id, phone')
      .eq('id', contactId)
      .eq('school_id', env.DEFAULT_SCHOOL_ID)
      .maybeSingle();

    if (!contact) {
      res.status(404).json({ error: 'Contacto no encontrado' });
      return;
    }

    // Obtener conversación existente
    let conversation;
    const { data: existingConv } = await supabase
      .from('conversations')
      .select('id')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingConv) {
      conversation = existingConv;
    } else {
      // Crear nueva conversación si no existe
      const { data: newConv, error: createError } = await supabase
        .from('conversations')
        .insert({
          contact_id: contactId,
          school_id: env.DEFAULT_SCHOOL_ID,
          status: 'active',
        })
        .select('id')
        .single();

      if (createError || !newConv) {
        console.error('Error creando conversación:', createError);
        res.status(400).json({ error: 'Error creando conversación' });
        return;
      }
      conversation = newConv;
    }

    // Registrar mensaje en la BD
    const { error: insertError } = await supabase.from('messages').insert({
      conversation_id: conversation.id,
      direction: 'outbound',
      content: body,
      type: 'text',
      status: 'sent',
    });

    if (insertError) {
      console.error('Error insertando mensaje:', insertError);
      res.status(400).json({ error: insertError.message });
      return;
    }

    // Enviar mensaje por WhatsApp
    try {
      await messagingService.send(contact.phone, body);
    } catch (sendError) {
      console.error('Error enviando por WhatsApp:', sendError);
      // El mensaje se registró en la BD, pero no se pudo enviar por WhatsApp
      res.status(400).json({ error: 'Mensaje guardado pero no se pudo enviar por WhatsApp' });
      return;
    }

    res.json({ success: true, message: 'Mensaje enviado' });
  } catch (err) {
    console.error('Error enviando mensaje:', err);
    res.status(500).json({ error: (err as Error).message });
  }
});
