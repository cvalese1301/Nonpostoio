const axios = require('axios');
const { get } = require('../db/database');

class AiOptimizerService {
  async getAiKey() {
    const setting = await get("SELECT value FROM settings WHERE key = 'ai_api_key'");
    return process.env.OPENAI_API_KEY || process.env.AI_API_KEY || (setting ? setting.value : null);
  }

  /**
   * Optimize a master copy or idea for the 8 specific social networks
   */
  async optimizeForChannels(baseText, platforms = [], tone = 'engaging', extraContext = '') {
    const allPlatforms = platforms.length > 0
      ? platforms
      : ['facebook', 'instagram', 'tiktok', 'google_business', 'linkedin', 'threads', 'x', 'youtube'];

    const apiKey = await this.getAiKey();

    // If an external OpenAI / Claude key is set, we can query it
    if (apiKey) {
      try {
        return await this.callExternalLLM(apiKey, baseText, allPlatforms, tone, extraContext);
      } catch (err) {
        console.warn('[AI] External LLM failed, using intelligent built-in generator:', err.message);
      }
    }

    // Built-in high-quality channel adaptation algorithm
    return this.generateAlgorithmicVariants(baseText, allPlatforms, tone);
  }

  generateAlgorithmicVariants(baseText, platforms, tone) {
    const cleanText = baseText.trim();
    const firstSentence = cleanText.split(/[.!?\n]/)[0] || cleanText;
    const results = {};

    platforms.forEach(platform => {
      switch (platform) {
        case 'x': {
          let text = `${firstSentence.slice(0, 160)}... 🚀\n\nCosa ne pensate?`;
          if (cleanText.length <= 200) {
            text = cleanText;
          }
          // Enforce 280 char limit with hashtags
          const hashtags = '#Innovation #SocialMedia #Trend';
          const maxTextLength = 275 - hashtags.length;
          if (text.length > maxTextLength) {
            text = text.slice(0, maxTextLength - 3) + '...';
          }
          results['x'] = {
            custom_content: `${text}\n\n${hashtags}`,
            hashtags: hashtags,
            first_comment: '',
            char_count: (`${text}\n\n${hashtags}`).length,
            limit: 280,
            tips: 'Tweet sintetico con hook incisivo per massimizzare retweet e risposte.'
          };
          break;
        }

        case 'linkedin': {
          const hook = firstSentence.toUpperCase();
          results['linkedin'] = {
            custom_content: `💡 ${hook}\n\n${cleanText}\n\nNel contesto attuale, come state affrontando questa trasformazione nel vostro settore?\n\nCondividi la tua opinione nei commenti. 👇`,
            hashtags: '#Business #Leadership #Strategy #Networking #Growth',
            first_comment: '',
            char_count: 0,
            limit: 3000,
            tips: 'Formattato con spaziatura pulita, hook iniziale e call to action B2B.'
          };
          break;
        }

        case 'instagram': {
          results['instagram'] = {
            custom_content: `✨ ${cleanText} ✨\n.\n.\n👉 Salva questo post per non perderlo e tagga chi dovrebbe vederlo!`,
            hashtags: '#InstaDaily #TrendAlert #CreativeCommunity #BestOfTheDay #VisualStory #ViralContent #ExplorePage',
            first_comment: 'Link in bio per tutti i dettagli e offerte esclusive! 📲👇',
            char_count: 0,
            limit: 2200,
            tips: 'Copy visivo con blocco hashtag separato e suggerimento di primo commento.'
          };
          break;
        }

        case 'tiktok': {
          results['tiktok'] = {
            custom_content: `POV: ${firstSentence.slice(0, 70)}... 👀 Guarda fino alla fine per scoprire il risultato!`,
            hashtags: '#fyp #perte #viral #trend #tutorial #community',
            first_comment: '',
            sound_recommendation: 'Trending Audio #1 (Lo-Fi Beats)',
            char_count: 0,
            limit: 2200,
            tips: 'Hook video rapido nei primi 3 secondi con hashtag virali.'
          };
          break;
        }

        case 'google_business': {
          results['google_business'] = {
            custom_content: `📢 Novità in arrivo!\n\n${cleanText}\n\nVieni a trovarci o contattaci per maggiori informazioni. Siamo aperti e a tua completa disposizione!`,
            hashtags: '',
            first_comment: '',
            cta_action: 'LEARN_MORE',
            cta_label: 'Scopri di più',
            char_count: 0,
            limit: 1500,
            tips: 'Post locale orientato alla conversione con pulsante CTA attivo.'
          };
          break;
        }

        case 'threads': {
          results['threads'] = {
            custom_content: `${cleanText}\n\nUna domanda sincera per la community: siete d'accordo o avete una prospettiva diversa? Dite la vostra nei commenti 👇💬`,
            hashtags: '',
            first_comment: '',
            char_count: 0,
            limit: 500,
            tips: 'Tono spontaneo e non filtrato, ideale per avviare un thread partecipativo.'
          };
          break;
        }

        case 'facebook': {
          results['facebook'] = {
            custom_content: `${cleanText}\n\nCondividi questo post con i tuoi amici e facci sapere nei commenti cosa ne pensi! 👇\nVisita il nostro sito per saperne di più.`,
            hashtags: '#Community #Novità',
            first_comment: '',
            char_count: 0,
            limit: 63206,
            tips: 'Stile caloroso e comunitario con spunto di condivisione.'
          };
          break;
        }

        case 'youtube': {
          results['youtube'] = {
            title: `${firstSentence.slice(0, 60)} | Anteprima Ufficiale`,
            custom_content: `${cleanText}\n\n📌 Iscriviti al canale e attiva la campanella per non perderti i prossimi video!\n\nCapitoli & Link utili nei commenti.`,
            hashtags: '#Shorts #YouTube #Tutorial #Guide',
            first_comment: '',
            is_short: true,
            char_count: 0,
            limit: 5000,
            tips: 'Titolo ottimizzato per la ricerca SEO e Shorts box.'
          };
          break;
        }
      }
    });

    return results;
  }

  async callExternalLLM(apiKey, baseText, platforms, tone, extraContext) {
    const prompt = `Sei un copywriter professionista esperto di social media marketing.
Ottimizza il seguente messaggio base per ciascuno dei seguenti canali social: ${platforms.join(', ')}.
Messaggio base: "${baseText}"
Tono desiderato: ${tone}
Contesto aggiuntivo: ${extraContext}

Regole fondamentali per canale:
- "x": massimo 260 caratteri (deve rientrare nel limite dei 280 caratteri includendo hashtag), conciso, hook forte.
- "linkedin": professionale, spaziatura tra paragrafi, storytelling, invito alla discussione B2B, 3-5 hashtag.
- "instagram": accattivante, emoji pertinenti, call to action per salvare il post, blocco di hashtag e suggerimento per il primo commento.
- "tiktok": testo breve per la didascalia del video, hook accattivante, hashtag virali (#fyp ecc.).
- "google_business": orientato all'attività locale, chiaro, con indicazione per azione diretta (cta).
- "threads": colloquiale, sincero, incoraggia risposte aperte.
- "facebook": conversazionale, stimola condivisione.
- "youtube": titolo accattivante (max 70 caratteri) + descrizione ottimizzata SEO.

Rispondi rigorosamente ed esclusivamente con un JSON valido strutturato così:
{
  "facebook": { "custom_content": "...", "hashtags": "..." },
  "instagram": { "custom_content": "...", "hashtags": "...", "first_comment": "..." },
  "tiktok": { "custom_content": "...", "hashtags": "..." },
  "google_business": { "custom_content": "...", "cta_action": "LEARN_MORE" },
  "linkedin": { "custom_content": "...", "hashtags": "..." },
  "threads": { "custom_content": "..." },
  "x": { "custom_content": "...", "hashtags": "..." },
  "youtube": { "title": "...", "custom_content": "...", "hashtags": "..." }
}`;

    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o-mini',
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.7
      },
      {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 20000
      }
    );

    const parsed = JSON.parse(res.data.choices[0].message.content);
    return parsed;
  }
}

module.exports = new AiOptimizerService();
