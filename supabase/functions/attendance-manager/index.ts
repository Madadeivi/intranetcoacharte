/// <reference lib="deno.ns" />
// Edge Function para gestionar asistencias y horarios de empleados
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization"
      }
    });
  }
  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({
        error: "Variables de entorno SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // Verificar autenticación
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({
        error: "Token de autorización requerido"
      }), {
        status: 401,
        headers: {
          "Content-Type": "application/json"
        }
      });
    }
    const { action, userId, location, notes, startDate, endDate, department } = await req.json();
    const today = new Date().toISOString().split("T")[0];
    const now = new Date().toISOString();
    switch(action){
      case "check-in":
        if (!userId) {
          return new Response(JSON.stringify({
            error: "userId es requerido"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Verificar si ya existe un check-in para hoy
        const { data: existingRecord, error: checkError } = await supabase.from("attendance").select("*").eq("user_id", userId).eq("date", today).single();
        if (existingRecord && !checkError) {
          return new Response(JSON.stringify({
            error: "Ya tienes un registro de entrada para hoy",
            existingRecord
          }), {
            status: 409,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Crear nuevo registro de entrada
        const { data: checkInData, error: checkInError } = await supabase.from("attendance").insert([
          {
            user_id: userId,
            check_in: now,
            location: location || "Oficina",
            notes: notes || "",
            date: today
          }
        ]).select();
        if (checkInError) {
          return new Response(JSON.stringify({
            error: checkInError.message
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        return new Response(JSON.stringify({
          success: true,
          message: "Entrada registrada exitosamente",
          attendance: checkInData[0],
          time: new Date().toLocaleTimeString("es-ES")
        }), {
          status: 201,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      case "check-out":
        if (!userId) {
          return new Response(JSON.stringify({
            error: "userId es requerido"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Buscar el registro de entrada de hoy
        const { data: todayRecord, error: findError } = await supabase.from("attendance").select("*").eq("user_id", userId).eq("date", today).is("check_out", null).single();
        if (findError || !todayRecord) {
          return new Response(JSON.stringify({
            error: "No se encontró un registro de entrada para hoy"
          }), {
            status: 404,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Calcular horas trabajadas
        const checkInTime = new Date(todayRecord.check_in);
        const checkOutTime = new Date(now);
        const workingHours = (checkOutTime.getTime() - checkInTime.getTime()) / (1000 * 60 * 60);
        // Actualizar con la salida
        const { data: checkOutData, error: checkOutError } = await supabase.from("attendance").update({
          check_out: now,
          working_hours: Math.round(workingHours * 100) / 100,
          notes: notes ? `${todayRecord.notes} | Salida: ${notes}` : todayRecord.notes
        }).eq("id", todayRecord.id).select();
        if (checkOutError) {
          return new Response(JSON.stringify({
            error: checkOutError.message
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        return new Response(JSON.stringify({
          success: true,
          message: "Salida registrada exitosamente",
          attendance: checkOutData[0],
          workingHours: Math.round(workingHours * 100) / 100,
          time: new Date().toLocaleTimeString("es-ES")
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      case "get-status":
        if (!userId) {
          return new Response(JSON.stringify({
            error: "userId es requerido"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const { data: statusRecord, error: statusError } = await supabase.from("attendance").select("*").eq("user_id", userId).eq("date", today).single();
        const status = {
          date: today,
          hasCheckedIn: !!statusRecord,
          hasCheckedOut: !!statusRecord?.check_out,
          currentRecord: statusRecord || null,
          workingHours: statusRecord?.working_hours || 0
        };
        return new Response(JSON.stringify({
          success: true,
          status
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      case "get-history":
        if (!userId) {
          return new Response(JSON.stringify({
            error: "userId es requerido"
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        const start = startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const end = endDate || today;
        const { data: historyRecords, error: historyError } = await supabase.from("attendance").select(`
            *,
            user:profiles!attendance_user_id_fkey(full_name, department)
          `).eq("user_id", userId).gte("date", start).lte("date", end).order("date", {
          ascending: false
        });
        if (historyError) {
          return new Response(JSON.stringify({
            error: historyError.message
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Calcular estadísticas
        const totalDays = historyRecords.length;
        const totalHours = historyRecords.reduce((sum, record)=>sum + (record.working_hours || 0), 0);
        const averageHours = totalDays > 0 ? totalHours / totalDays : 0;
        return new Response(JSON.stringify({
          success: true,
          history: historyRecords,
          statistics: {
            totalDays,
            totalHours: Math.round(totalHours * 100) / 100,
            averageHours: Math.round(averageHours * 100) / 100,
            period: {
              start,
              end
            }
          }
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      case "get-report":
        // Solo para administradores - obtener reporte de asistencia
        const reportStart = startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
        const reportEnd = endDate || today;
        let reportQuery = supabase.from("attendance").select(`
            *,
            user:profiles!attendance_user_id_fkey(full_name, department, email)
          `).gte("date", reportStart).lte("date", reportEnd);
        if (department) {
          reportQuery = reportQuery.eq("user.department", department);
        }
        const { data: reportData, error: reportError } = await reportQuery.order("date", {
          ascending: false
        });
        if (reportError) {
          return new Response(JSON.stringify({
            error: reportError.message
          }), {
            status: 400,
            headers: {
              "Content-Type": "application/json"
            }
          });
        }
        // Agrupar por usuario y calcular estadísticas
        const userStats = reportData.reduce((acc, record)=>{
          const userId = record.user_id;
          if (!acc[userId]) {
            acc[userId] = {
              user: record.user,
              totalDays: 0,
              totalHours: 0,
              records: []
            };
          }
          acc[userId].totalDays++;
          acc[userId].totalHours += record.working_hours || 0;
          acc[userId].records.push(record);
          return acc;
        }, {});
        return new Response(JSON.stringify({
          success: true,
          report: Object.keys(userStats).map((key)=>userStats[key]),
          period: {
            start: reportStart,
            end: reportEnd
          },
          totalRecords: reportData.length
        }), {
          status: 200,
          headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
      default:
        return new Response(JSON.stringify({
          error: "Acción no válida"
        }), {
          status: 400,
          headers: {
            "Content-Type": "application/json"
          }
        });
    }
  } catch (error) {
    console.error("Error en attendance-manager:", error);
    return new Response(JSON.stringify({
      error: "Error interno del servidor",
      details: error instanceof Error ? error.message : "Unknown error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      }
    });
  }
});
