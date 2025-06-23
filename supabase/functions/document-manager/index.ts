/// <reference lib="deno.ns" />
// Edge Function para gestionar documentos y archivos de la intranet
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface DocumentRequest {
  action: "upload" | "list" | "download" | "delete" | "search";
  fileName?: string;
  fileContent?: string;
  category?: string;
  department?: string;
  searchQuery?: string;
  userId?: string;
}

interface DocumentMetadata {
  id: string;
  fileName: string;
  category: string;
  department: string;
  uploadedBy: string;
  uploadedAt: string;
  size: number;
  downloadUrl?: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS, DELETE",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ 
          error: "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas" 
        }),
        { 
          status: 500, 
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
      fileName,
      fileContent,
      category,
      department,
      searchQuery,
      userId,
    }: DocumentRequest = await req.json();

    switch (action) {
      case "upload":
        if (!fileName || !fileContent || !category || !userId) {
          return new Response(
            JSON.stringify({
              error: "fileName, fileContent, category y userId son requeridos",
            }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Decodificar el contenido base64
        const fileBuffer = Uint8Array.from(
          atob(fileContent),
          (c) => c.charCodeAt(0),
        );

        // Subir archivo a Supabase Storage
        const filePath = `documents/${department || "general"}/${fileName}`;
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from("intranet-documents")
          .upload(filePath, fileBuffer, {
            contentType: "application/octet-stream",
            upsert: false,
          });

        if (uploadError) {
          return new Response(
            JSON.stringify({ error: uploadError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Guardar metadata en la base de datos
        const { data: metadataData, error: metadataError } = await supabase
          .from("documents")
          .insert([
            {
              file_name: fileName,
              file_path: filePath,
              category: category,
              department: department || "general",
              uploaded_by: userId,
              file_size: fileBuffer.length,
            },
          ])
          .select();

        if (metadataError) {
          return new Response(
            JSON.stringify({ error: metadataError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Documento subido exitosamente",
            document: metadataData[0],
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
        const query = supabase
          .from("documents")
          .select("*");

        if (department) {
          query.eq("department", department);
        }

        if (category) {
          query.eq("category", category);
        }

        const { data: documents, error: listError } = await query.order(
          "created_at",
          { ascending: false },
        );

        if (listError) {
          return new Response(
            JSON.stringify({ error: listError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Generar URLs de descarga
        const documentsWithUrls = await Promise.all(
          documents.map(async (doc) => {
            const { data: urlData } = await supabase.storage
              .from("intranet-documents")
              .createSignedUrl(doc.file_path, 3600); // URL válida por 1 hora

            return {
              ...doc,
              downloadUrl: urlData?.signedUrl,
            };
          }),
        );

        return new Response(
          JSON.stringify({
            success: true,
            documents: documentsWithUrls,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "search":
        if (!searchQuery) {
          return new Response(
            JSON.stringify({ error: "searchQuery es requerido" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        const { data: searchResults, error: searchError } = await supabase
          .from("documents")
          .select("*")
          .or(
            `file_name.ilike.%${searchQuery}%,category.ilike.%${searchQuery}%,department.ilike.%${searchQuery}%`,
          )
          .order("created_at", { ascending: false });

        if (searchError) {
          return new Response(
            JSON.stringify({ error: searchError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            documents: searchResults,
            count: searchResults.length,
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Access-Control-Allow-Origin": "*",
            },
          },
        );

      case "delete":
        if (!fileName || !userId) {
          return new Response(
            JSON.stringify({ error: "fileName y userId son requeridos" }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Buscar el documento
        const { data: docToDelete, error: findError } = await supabase
          .from("documents")
          .select("*")
          .eq("file_name", fileName)
          .single();

        if (findError || !docToDelete) {
          return new Response(
            JSON.stringify({ error: "Documento no encontrado" }),
            { status: 404, headers: { "Content-Type": "application/json" } },
          );
        }

        // Eliminar archivo del storage
        const { error: deleteStorageError } = await supabase.storage
          .from("intranet-documents")
          .remove([docToDelete.file_path]);

        if (deleteStorageError) {
          return new Response(
            JSON.stringify({ error: deleteStorageError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        // Eliminar metadata de la base de datos
        const { error: deleteDbError } = await supabase
          .from("documents")
          .delete()
          .eq("id", docToDelete.id);

        if (deleteDbError) {
          return new Response(
            JSON.stringify({ error: deleteDbError.message }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }

        return new Response(
          JSON.stringify({
            success: true,
            message: "Documento eliminado exitosamente",
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
    console.error("Error en document-manager:", error);

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
