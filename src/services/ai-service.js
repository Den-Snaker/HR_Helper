const fetch = require('node-fetch');

class AIService {
  constructor() {
    this.providers = {
      openai: {
        name: 'OpenAI',
        baseUrl: 'https://api.openai.com/v1',
        models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
      },
      anthropic: {
        name: 'Anthropic (Claude)',
        baseUrl: 'https://api.anthropic.com/v1',
        models: ['claude-3-5-sonnet-20241022', 'claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307']
      },
      deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-coder']
      },
      openrouter: {
        name: 'OpenRouter',
        baseUrl: 'https://openrouter.ai/api/v1',
        models: ['openai/gpt-4o', 'anthropic/claude-3.5-sonnet', 'deepseek/deepseek-chat']
      },
      custom: {
        name: 'Custom OpenAI-compatible',
        baseUrl: '',
        models: []
      }
    };
  }

  getDefaultPrompt() {
    return `Ты - HR-ассистент, анализирующий резюме кандидатов.

Проанализируй резюме кандидата на соответствие требованиям вакансии.

ТРЕБОВАНИЯ К ВАКАНСИИ:
{requirements}

РЕЗЮМЕ КАНДИДАТА:
{resume}

ОЦЕНИ кандидата по следующим критериям (от 0 до 10):
1. Соответствие опыта работы требованиям
2. Соответствие навыков и компетенций
3. Образование и сертификаты
4. Релевантность предыдущих мест работы
5. Общая привлекательность кандидата

ОТВЕТ в формате JSON:
{
  "score": <число от 0 до 100, общий балл соответствия>,
  "experience_score": <число 0-10>,
  "skills_score": <число 0-10>,
  "education_score": <число 0-10>,
  "relevance_score": <число 0-10>,
  "overall_score": <число 0-10>,
  "strengths": ["список сильных сторон"],
  "weaknesses": ["список слабых сторон"],
  "recommendation": "краткая рекомендация по кандидату",
  "key_skills_matched": ["навыки из резюме, соответствующие требованиям"],
  "key_skills_missing": ["навыки, которых не хватает"]
}`;
  }

  async analyzeResume(aiSettings, resumeText) {
    const { provider, apiKey, model, prompt, requirements } = aiSettings;

    if (!provider || !apiKey || !model) {
      throw new Error('AI settings not configured');
    }

    const finalPrompt = prompt || this.getDefaultPrompt();
    const requirementsText = requirements || 'Требования не указаны';

    const filledPrompt = finalPrompt
      .replace('{requirements}', requirementsText)
      .replace('{resume}', resumeText);

    const providerConfig = this.providers[provider];
    if (!providerConfig) {
      throw new Error(`Unknown provider: ${provider}`);
    }

    const result = await this.callProvider(provider, apiKey, model, filledPrompt);
    return this.parseAnalysisResult(result);
  }

  async callProvider(provider, apiKey, model, prompt) {
    switch (provider) {
      case 'openai':
        return await this.callOpenAI('https://api.openai.com/v1', apiKey, model, prompt);
      case 'anthropic':
        return await this.callAnthropic(apiKey, model, prompt);
      case 'deepseek':
        return await this.callOpenAI('https://api.deepseek.com/v1', apiKey, model, prompt);
      case 'openrouter':
        return await this.callOpenAI('https://openrouter.ai/api/v1', apiKey, model, prompt);
      case 'custom':
        throw new Error('Custom provider requires base URL in settings');
      default:
        throw new Error(`Unknown provider: ${provider}`);
    }
  }

  async callOpenAI(baseUrl, apiKey, model, prompt) {
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: 'Ты - HR-ассистент. Отвечай ТОЛЬКО валидным JSON без markdown разметки.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`AI API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || '';
  }

  async callAnthropic(apiKey, model, prompt) {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: model,
        max_tokens: 2000,
        messages: [
          { role: 'user', content: prompt }
        ],
        system: 'Ты - HR-ассистент. Отвечай ТОЛЬКО валидным JSON без markdown разметки.'
      })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${response.status} - ${error}`);
    }

    const data = await response.json();
    return data.content[0]?.text || '';
  }

  parseAnalysisResult(text) {
    try {
      const cleanText = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const result = JSON.parse(cleanText);
      
      return {
        score: Math.min(100, Math.max(0, result.score || 0)),
        experience_score: Math.min(10, Math.max(0, result.experience_score || 0)),
        skills_score: Math.min(10, Math.max(0, result.skills_score || 0)),
        education_score: Math.min(10, Math.max(0, result.education_score || 0)),
        relevance_score: Math.min(10, Math.max(0, result.relevance_score || 0)),
        overall_score: Math.min(10, Math.max(0, result.overall_score || 0)),
        strengths: result.strengths || [],
        weaknesses: result.weaknesses || [],
        recommendation: result.recommendation || '',
        key_skills_matched: result.key_skills_matched || [],
        key_skills_missing: result.key_skills_missing || [],
        analyzedAt: new Date().toISOString()
      };
    } catch (e) {
      console.error('Failed to parse AI response:', text);
      throw new Error('Failed to parse AI response as JSON');
    }
  }

  formatResumeForAnalysis(resume) {
    const parts = [];
    
    if (resume.title) parts.push(`ДОЛЖНОСТЬ: ${resume.title}`);
    if (resume.first_name || resume.last_name) {
      parts.push(`ИМЯ: ${resume.first_name || ''} ${resume.last_name || ''}`.trim());
    }
    if (resume.age) parts.push(`ВОЗРАСТ: ${resume.age} лет`);
    if (resume.area?.name) parts.push(`ЛОКАЦИЯ: ${resume.area.name}`);
    
    if (resume.salary) {
      const salary = `${resume.salary.from || ''}${resume.salary.to ? '-' + resume.salary.to : ''} ${resume.salary.currency || 'RUB'}`.trim();
      parts.push(`ЗАРПЛАТА: ${salary}`);
    }
    
    if (resume.total_experience?.months) {
      const years = Math.floor(resume.total_experience.months / 12);
      const months = resume.total_experience.months % 12;
      parts.push(`ОПЫТ РАБОТЫ: ${years} лет ${months} мес.`);
    }
    
    if (resume.education?.level?.name) {
      parts.push(`ОБРАЗОВАНИЕ: ${resume.education.level.name}`);
    }
    
    if (resume.experience && resume.experience.length > 0) {
      parts.push('\nОПЫТ РАБОТЫ:');
      resume.experience.forEach((exp, i) => {
        parts.push(`\n${i + 1}. ${exp.position || 'Позиция не указана'}`);
        if (exp.company) parts.push(`   Компания: ${exp.company}`);
        if (exp.start) parts.push(`   Период: ${exp.start} - ${exp.end || 'по настоящее время'}`);
        if (exp.description) parts.push(`   Описание: ${exp.description}`);
        if (exp.industries?.length > 0) {
          parts.push(`   Отрасль: ${exp.industries.map(i => i.name).join(', ')}`);
        }
      });
    }
    
    if (resume.skills && resume.skills.length > 0) {
      parts.push(`\nКЛЮЧЕВЫЕ НАВЫКИ: ${resume.skills.join(', ')}`);
    }
    
    if (resume.skill_set && resume.skill_set.length > 0) {
      parts.push(`ДОПОЛНИТЕЛЬНЫЕ НАВЫКИ: ${resume.skill_set.join(', ')}`);
    }

    return parts.join('\n');
  }

  getProviders() {
    return Object.entries(this.providers).map(([id, config]) => ({
      id,
      name: config.name,
      models: config.models
    }));
  }
}

module.exports = new AIService();