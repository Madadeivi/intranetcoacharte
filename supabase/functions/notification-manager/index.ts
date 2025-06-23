/// <reference lib="deno.ns" />
// Edge Function para gestionar notificaciones y comunicaciones internas
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface NotificationRequest {
  action: "send" | "list" | "mark-read" | "broadcast";
  title?: string;
  message?: string;
  type?: "info" | "warning" | "success" | "error";
  recipientId?: string;
  recipientDepartment?: string;
  senderId?: string;
  notificationId?: string;
  priority?: "low" | "medium" | "high";
}

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  recipientId: string;
  senderId: string;
  read: boolean;
  createdAt: string;
  priority: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, PUT",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ??
      "http://127.0.0.1:54321";
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseServiceRoleKey) {
      throw new Error(
        "Environment variable SUPABASE_SERVICE_ROLE_KEY is required but not set.",
      );
    }
    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Token de autorización requerido" }),
        { status: 401, headers: { "Content-Type": "application/json" } },
      );
    }

    const {
      action,
      title,
      message,
      type,
      recipientId,
      recipientDepartment,
      senderId,
      notificationId,
      priority,
    }: NotificationRequest = await req.json();

    switch (action) {
      case "send":
        if (!title || !message || !recipientId || !senderId) {
          return new Response(
            JSON.stringify({
              error: "title, message, recipientId y senderId son requeridos",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: notificationData, error: sendError } = await supabase
          .from("notifications")
          .insert([
            {
              title,
              message,
              type: type || "info",
              recipient_id: recipientId,
              sender_id: senderId,
              priority: priority || "medium",
              read: false,
            },
          ])
          .select();

        if (sendError) {
          return new Response(
            JSON.stringify({ error: sendError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Enviar notificación en tiempo real usando Supabase Realtime
        await supabase
          .channel("notifications")
          .send({
            type: "broadcast",
            event: "new_notification",
            payload: notificationData[0],
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: "Notificación enviada exitosamente",
            notification: notificationData[0],
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "broadcast":
        if (!title || !message || !senderId) {
          return new Response(
            JSON.stringify({
              error: "title, message y senderId son requeridos para broadcast",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Obtener usuarios del departamento específico o todos los usuarios
        let usersQuery = supabase
          .from("profiles")
          .select("id");

        if (recipientDepartment) {
          usersQuery = usersQuery.eq("department", recipientDepartment);
        }

        const { data: users, error: usersError } = await usersQuery;

        if (usersError) {
          return new Response(
            JSON.stringify({ error: usersError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Crear notificaciones para todos los usuarios
        const notifications = users.map((user) => ({
          title,
          message,
          type: type || "info",
          recipient_id: user.id,
          sender_id: senderId,
          priority: priority || "medium",
          read: false,
        }));

        const { data: broadcastData, error: broadcastError } = await supabase
          .from("notifications")
          .insert(notifications)
          .select();

        if (broadcastError) {
          return new Response(
            JSON.stringify({ error: broadcastError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Enviar broadcast en tiempo real
        await supabase
          .channel("notifications")
          .send({
            type: "broadcast",
            event: "broadcast_notification",
            payload: { title, message, type, department: recipientDepartment },
          });

        return new Response(
          JSON.stringify({
            success: true,
            message: `Broadcast enviado a ${notifications.length} usuarios`,
            count: notifications.length,
          }),
          {
            status: 201,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "list":
        if (!recipientId) {
          return new Response(
            JSON.stringify({ error: "recipientId es requerido" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: userNotifications, error: listError } = await supabase
          .from("notifications")
          .select(`
            *,
            sender:profiles!notifications_sender_id_fkey(full_name, email)
          `)
          .eq("recipient_id", recipientId)
          .order("created_at", { ascending: false })
          .limit(50);

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Contar notificaciones no leídas
        const { count: unreadCount } = await supabase
          .from("notifications")
          .select("*", { count: "exact" })
          .eq("recipient_id", recipientId)
          .eq("read", false);

        return new Response(
          JSON.stringify({
            success: true,
            notifications: userNotifications,
            unreadCount: unreadCount || 0,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "mark-read":
        if (!notificationId) {
          return new Response(
            JSON.stringify({ error: "notificationId es requerido" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: updatedNotification, error: updateError } = await supabase
          .from("notifications")
          .update({ read: true, read_at: new Date().toISOString() })
          .eq("id", notificationId)
          .select();

        if (updateError) {
          return new Response(
            JSON.stringify({ error: updateError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Notificación marcada como leída",
            notification: updatedNotification[0],
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      default:
        return new Response(
          JSON.stringify({ error: "Acción no válida" }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        );
    }
  } catch (error: unknown) {
    console.error("Error en notification-manager:", error);

    return new Response(
      JSON.stringify({
        error: "Error interno del servidor",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  }
});
