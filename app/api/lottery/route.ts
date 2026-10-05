import { NextResponse } from 'next/server';
import * as cheerio from 'cheerio';

export const revalidate = 900; // Revalidate every 15 minutes

export async function GET() {
  try {
    const response = await fetch('https://ruta1000.com.ar/index2008.php');
    const buffer = await response.arrayBuffer();
    const decoder = new TextDecoder('iso-8859-1');
    const html = decoder.decode(buffer);
    const $ = cheerio.load(html);
    
    // We will find the specific table by checking if it has the "QUINIELAS" header.
    // However, it's safer to just iterate through tables and find the one that contains "LA PREVIA" and "NOCTURNA"
    let targetTable: any = null;
    $('table').each((i, el) => {
      const text = $(el).text();
      if (text.includes('LA PREVIA') && text.includes('NOCTURNA') && text.includes('CIUDAD')) {
        targetTable = el;
      }
    });

    const results = {
      previa: { nacional: '----', provincia: '----', cordoba: '----', santaFe: '----' },
      primera: { nacional: '----', provincia: '----', cordoba: '----', santaFe: '----' },
      matutina: { nacional: '----', provincia: '----', cordoba: '----', santaFe: '----' },
      vespertina: { nacional: '----', provincia: '----', cordoba: '----', santaFe: '----' },
      nocturna: { nacional: '----', provincia: '----', cordoba: '----', santaFe: '----' }
    };

    if (targetTable) {
      $(targetTable).find('tr').each((i, tr) => {
        const rowText = $(tr).text().toUpperCase().replace(/\s+/g, ' ');
        
        let targetKey: any = null;
        if (rowText.includes('CIUDAD(EX-NACIONAL)') || rowText.includes('CIUDAD')) targetKey = 'nacional';
        if (rowText.includes('BUENOS AIRES') || rowText.includes('PROVINCIA')) targetKey = 'provincia';
        if (rowText.includes('CORDOBA')) targetKey = 'cordoba';
        if (rowText.includes('SANTA FE')) targetKey = 'santaFe';

        if (targetKey) {
          const tds = $(tr).find('td');
          // Format the text: Extract 4 digits if present
          const extractNum = (idx: number) => {
            const raw = $(tds[idx]).text().trim().replace(/VERPREMIOS/gi, '');
            const match = raw.match(/\b\d{4}\b/);
            return match ? match[0] : (raw.replace(/\D/g, '').substring(0,4) || '----');
          };

          if (tds.length >= 7) {
            results.previa[targetKey as keyof typeof results.previa] = extractNum(2);
            results.primera[targetKey as keyof typeof results.primera] = extractNum(3);
            results.matutina[targetKey as keyof typeof results.matutina] = extractNum(4);
            results.vespertina[targetKey as keyof typeof results.vespertina] = extractNum(5);
            results.nocturna[targetKey as keyof typeof results.nocturna] = extractNum(6);
          }
        }
      });
    }

    // Try to get Quini 6 from Ruta 1000 Quini 6 subdomain
    let quini6 = {
      tradicional: ['--', '--', '--', '--', '--', '--'],
      laSegunda: ['--', '--', '--', '--', '--', '--'],
      revancha: ['--', '--', '--', '--', '--', '--'],
      siempreSale: ['--', '--', '--', '--', '--', '--']
    };

    try {
      const qRes = await fetch('http://quini6.ruta1000.com.ar/');
      if (qRes.ok) {
        const qBuffer = await qRes.arrayBuffer();
        const qHtml = decoder.decode(qBuffer);
        const $q = cheerio.load(qHtml);
        
        const nums: string[] = [];
        $q('td, b, font').each((i, el) => {
          const text = $q(el).text().trim();
          if (/^\d{2}$/.test(text)) {
            nums.push(text);
          }
        });

        // The numbers are duplicated because of nested tags. Deduplicate them sequentially
        const uniqueNums: string[] = [];
        for (let i = 0; i < nums.length; i += 2) {
          uniqueNums.push(nums[i]);
        }

        // Layout:
        // Top row: Tradicional (0-2), Segunda (3-5), Revancha (6-8), SiempreSale (9-11)
        // Bottom row: Tradicional (12-14), Segunda (15-17), Revancha (18-20), SiempreSale (21-23)
        if (uniqueNums.length >= 24) {
          quini6.tradicional = [uniqueNums[0], uniqueNums[1], uniqueNums[2], uniqueNums[12], uniqueNums[13], uniqueNums[14]];
          quini6.laSegunda = [uniqueNums[3], uniqueNums[4], uniqueNums[5], uniqueNums[15], uniqueNums[16], uniqueNums[17]];
          quini6.revancha = [uniqueNums[6], uniqueNums[7], uniqueNums[8], uniqueNums[18], uniqueNums[19], uniqueNums[20]];
          quini6.siempreSale = [uniqueNums[9], uniqueNums[10], uniqueNums[11], uniqueNums[21], uniqueNums[22], uniqueNums[23]];
        }
      }
    } catch(err) {
      console.log('Quini error', err);
    }
    
    return NextResponse.json(
      { ...results, quini6 },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=900, stale-while-revalidate=1800'
        }
      }
    );
  } catch (error) {
    console.error('Error fetching lottery data:', error);
    return NextResponse.json({ error: 'Failed to fetch lottery data' }, { status: 500 });
  }
}
