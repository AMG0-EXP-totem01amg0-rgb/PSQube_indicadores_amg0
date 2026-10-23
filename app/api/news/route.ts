import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const revalidate = 900; // Cache for 15 minutes on Edge CDN (0 CPU load)

interface NewsItem {
  title: string;
  excerpt: string;
  image: string;
  category: string;
  source?: string;
}

const DEFAULT_NEWS: NewsItem[] = [
  {
    category: 'LOCALES',
    title: 'Nuevas obras de pavimentación en el ingreso a la planta',
    excerpt: 'Se ha completado el 80% de las obras de asfaltado en el acceso principal, mejorando los tiempos de logística de los camiones.',
    image: '/news-fallback.svg',
    source: 'Planta AMG0'
  }
];

export async function GET() {
  try {
    const rssNewsUrl = 'https://www.clarin.com/rss/lo-ultimo/';
    const rssSportsUrl = 'https://www.ole.com.ar/rss/';

    const [clarinRes, oleRes] = await Promise.allSettled([
      fetch(rssNewsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 900 }
      }),
      fetch(rssSportsUrl, {
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
        next: { revalidate: 900 }
      })
    ]);

    const newsItems: NewsItem[] = [];
    const sportsItems: NewsItem[] = [];

    // Parse Clarin (General News)
    if (clarinRes.status === 'fulfilled' && clarinRes.value.ok) {
      try {
        const xml = await clarinRes.value.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        $('item').slice(0, 8).each((_, el) => {
          const $el = $(el);
          const title = $el.find('title').text().trim();
          const desc = $el.find('description').text().trim();

          let image = $el.find('enclosure').attr('url') || '';
          if (!image) {
            const match = desc.match(/src=["'](.*?)["']/);
            if (match) image = match[1];
          }
          if (!image) image = '/news-fallback.svg';

          const cleanExcerpt = desc
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 180) + '...';

          if (title) {
            newsItems.push({
              title,
              excerpt: cleanExcerpt,
              image,
              category: 'NOTICIAS',
              source: 'Clarín'
            });
          }
        });
      } catch (e) {
        console.error('Error parsing Clarin RSS:', e);
      }
    }

    // Parse Ole (Sports News)
    if (oleRes.status === 'fulfilled' && oleRes.value.ok) {
      try {
        const xml = await oleRes.value.text();
        const $ = cheerio.load(xml, { xmlMode: true });

        $('item').slice(0, 8).each((_, el) => {
          const $el = $(el);
          const title = $el.find('title').text().trim();
          const desc = $el.find('description').text().trim();

          let image = $el.find('enclosure').attr('url') || '';
          if (!image) {
            const media = $el.find('media\\:content').attr('url');
            if (media) image = media;
          }
          if (!image) {
            const match = desc.match(/src=["'](.*?)["']/);
            if (match) image = match[1];
          }
          if (!image) image = '/news-fallback.svg';

          const cleanExcerpt = desc
            .replace(/<[^>]+>/g, '')
            .replace(/\s+/g, ' ')
            .trim()
            .substring(0, 180) + '...';

          if (title) {
            sportsItems.push({
              title,
              excerpt: cleanExcerpt,
              image,
              category: 'DEPORTES',
              source: 'Olé'
            });
          }
        });
      } catch (e) {
        console.error('Error parsing Ole RSS:', e);
      }
    }

    // Interleave news and sports
    const combined: NewsItem[] = [];
    const maxLen = Math.max(newsItems.length, sportsItems.length);
    for (let i = 0; i < maxLen; i++) {
      if (newsItems[i]) combined.push(newsItems[i]);
      if (sportsItems[i]) combined.push(sportsItems[i]);
    }

    if (combined.length === 0) {
      return NextResponse.json(DEFAULT_NEWS, {
        headers: {
          'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800'
        }
      });
    }

    return NextResponse.json(combined, {
      headers: {
        'Cache-Control': 'public, max-age=300, s-maxage=900, stale-while-revalidate=1800'
      }
    });
  } catch (error) {
    console.error('Failed to load news feed in API:', error);
    return NextResponse.json(DEFAULT_NEWS, {
      status: 200,
      headers: {
        'Cache-Control': 'public, max-age=60, s-maxage=300'
      }
    });
  }
}
