import { NextResponse } from "next/server";
import { supabase } from "../../../lib/supabase";

export async function GET(request: Request) {
    if (!supabase) {
        return NextResponse.json({ error: "Supabase client not initialized" }, { status: 500 });
    }

    try {
        const { searchParams } = new URL(request.url);
        const force = searchParams.get('force');
        const now = new Date().toISOString();

        // Si mandan force=1 ignoramos fechas (para debug), si no filtramos por activas
        let query = supabase.from("notificaciones_v2").select("*");

        if (force !== '1') {
            query = query.lte('start_date', now).gte('end_date', now);
        }

        const { data, error } = await query;

        if (error) {
            console.error("Error fetching notificaciones_v2:", error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json(data || [], {
            headers: {
                'Cache-Control': 'public, max-age=10, s-maxage=10, stale-while-revalidate=59'
            }
        });
    } catch (err: any) {
        console.error("Exception fetching notificaciones:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
