import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 300; // Every 5 minutes

export async function GET() {
  try {
    const leagues = [
      { id: 'arg.1', name: 'LIGA PROFESIONAL' },
      { id: 'arg.2', name: 'PRIMERA NACIONAL' },
      { id: 'arg.copa', name: 'COPA ARGENTINA' },
      { id: 'conmebol.libertadores', name: 'COPA LIBERTADORES' },
      { id: 'conmebol.sudamericana', name: 'COPA SUDAMERICANA' },
      { id: 'eng.1', name: 'PREMIER LEAGUE' },
      { id: 'esp.1', name: 'LALIGA' },
      { id: 'ita.1', name: 'SERIE A' },
      { id: 'ger.1', name: 'BUNDESLIGA' },
      { id: 'fra.1', name: 'LIGUE 1' },
      { id: 'uefa.champions', name: 'CHAMPIONS LEAGUE' }
    ];
    
    const fetchPromises = leagues.map(async (league) => {
      try {
        const res = await fetch(`https://site.api.espn.com/apis/site/v2/sports/soccer/${league.id}/scoreboard?limit=50`);
        if (!res.ok) return null;
        const data = await res.json();
        if (data && Array.isArray(data.events)) {
          return data.events.map((e: any) => ({ ...e, _leagueName: league.name }));
        }
        return null;
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);
    let allEvents: any[] = [];
    
    for (const res of results) {
      if (res && Array.isArray(res)) {
        allEvents.push(...res);
      }
    }

    // Safely sort by date
    allEvents.sort((a, b) => {
      const dateA = a?.date ? new Date(a.date).getTime() : 0;
      const dateB = b?.date ? new Date(b.date).getTime() : 0;
      return dateA - dateB;
    });

    const matches = allEvents.map((event: any) => {
      const comps = event?.competitions?.[0]?.competitors;
      const homeTeam = Array.isArray(comps) ? comps.find((c: any) => c?.homeAway === 'home') : null;
      const awayTeam = Array.isArray(comps) ? comps.find((c: any) => c?.homeAway === 'away') : null;
      
      let status = 'SCHEDULED';
      const state = event?.status?.type?.state;
      if (state === 'in') {
        status = 'LIVE';
      } else if (state === 'post') {
        status = 'FINISHED';
      }

      return {
        id: event?.id || Math.random().toString(),
        matchDate: event?.date || new Date().toISOString(),
        leagueName: event?._leagueName || 'TORNEO',
        status: status,
        liveMinute: event?.status?.clock || 0,
        home: {
          name: homeTeam?.team?.name || 'Local',
          short: homeTeam?.team?.abbreviation || 'LOC',
          color: homeTeam?.team?.color ? `#${homeTeam?.team?.color}` : '#333333',
          logo: homeTeam?.team?.logo || ''
        },
        away: {
          name: awayTeam?.team?.name || 'Visitante',
          short: awayTeam?.team?.abbreviation || 'VIS',
          color: awayTeam?.team?.color ? `#${awayTeam?.team?.color}` : '#333333',
          logo: awayTeam?.team?.logo || ''
        },
        homeScore: parseInt(homeTeam?.score || '0', 10),
        awayScore: parseInt(awayTeam?.score || '0', 10)
      };
    });

    return NextResponse.json({ matches }, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600'
      }
    });
  } catch (error) {
    console.error('Error fetching matches:', error);
    return NextResponse.json({ matches: [] }); // Fallback to empty array to prevent frontend crash
  }
}
