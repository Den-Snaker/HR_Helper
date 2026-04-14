const ExcelJS = require('exceljs');

async function exportToExcel(items, type) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(type === 'resumes' ? 'Резюме' : 'Вакансии');

  if (type === 'resumes') {
    worksheet.columns = [
      { header: 'ФИО', key: 'name', width: 30 },
      { header: 'Должность', key: 'title', width: 40 },
      { header: 'Зарплата', key: 'salary', width: 20 },
      { header: 'Опыт работы', key: 'experience', width: 20 },
      { header: 'Возраст', key: 'age', width: 10 },
      { header: 'Регион', key: 'area', width: 25 },
      { header: 'График', key: 'schedule', width: 15 },
      { header: 'Образование', key: 'education', width: 20 },
      { header: 'Последнее место работы', key: 'lastJob', width: 40 },
      { header: 'Ссылка', key: 'url', width: 50 }
    ];

    items.forEach(item => {
      const salary = item.salary 
        ? `${item.salary.from || ''}${item.salary.to ? '-' + item.salary.to : ''} ${item.salary.currency || 'RUB'}`.trim()
        : 'Не указана';

      let lastJob = '';
      if (item.experience && item.experience.length > 0) {
        const last = item.experience[0];
        lastJob = `${last.position || ''} в ${last.company || ''}`.trim();
      }

      worksheet.addRow({
        name: `${item.first_name || ''} ${item.last_name || ''}`.trim(),
        title: item.title || '',
        salary,
        experience: item.total_experience ? `${item.total_experience.months || 0} мес.` : 'Не указан',
        age: item.age ? `${item.age} лет` : '',
        area: item.area?.name || '',
        schedule: item.schedule?.name || '',
        education: item.education?.level?.name || '',
        lastJob,
        url: item.alternate_url || ''
      });
    });
  } else {
    worksheet.columns = [
      { header: 'Название', key: 'name', width: 40 },
      { header: 'Работодатель', key: 'employer', width: 30 },
      { header: 'Зарплата', key: 'salary', width: 25 },
      { header: 'Регион', key: 'area', width: 25 },
      { header: 'График', key: 'schedule', width: 15 },
      { header: 'Опыт', key: 'experience', width: 15 },
      { header: 'Тип занятости', key: 'employment', width: 15 },
      { header: 'Ссылка', key: 'url', width: 50 }
    ];

    items.forEach(item => {
      const salary = item.salary 
        ? `${item.salary.from || ''}${item.salary.to ? '-' + item.salary.to : ''} ${item.salary.currency || 'RUB'}`.trim()
        : 'Не указана';

      worksheet.addRow({
        name: item.name || '',
        employer: item.employer?.name || '',
        salary,
        area: item.area?.name || '',
        schedule: item.schedule?.name || '',
        experience: item.experience?.name || 'Не имеет значения',
        employment: item.employment?.name || '',
        url: item.alternate_url || ''
      });
    });
  }

  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFF9800' }
  };

  return workbook.xlsx.writeBuffer();
}

async function exportTop5Resumes(resumes) {
  const workbook = new ExcelJS.Workbook();
  
  // Сводная таблица - первый лист
  const summarySheet = workbook.addWorksheet('Сравнение кандидатов');
  summarySheet.columns = [
    { header: '#', key: 'index', width: 5 },
    { header: 'ФИО', key: 'name', width: 30 },
    { header: 'Должность', key: 'title', width: 35 },
    { header: 'Возраст', key: 'age', width: 10 },
    { header: 'Опыт', key: 'experience', width: 15 },
    { header: 'Зарплата', key: 'salary', width: 20 },
    { header: 'Регион', key: 'area', width: 20 },
    { header: 'Образование', key: 'education', width: 20 },
    { header: 'Последнее место', key: 'lastJob', width: 35 },
    { header: 'Ключевые навыки', key: 'skills', width: 40 }
  ];
  
  summarySheet.getRow(1).font = { bold: true };
  summarySheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4CAF50' }
  };
  
  // Добавляем данные в сводную таблицу
  resumes.forEach((resume, index) => {
    let lastJob = '';
    if (resume.experience && resume.experience.length > 0) {
      const last = resume.experience[0];
      lastJob = `${last.position || ''} в ${last.company || ''}`.trim();
    }
    
    const salary = resume.salary 
      ? `${resume.salary.from || ''}${resume.salary.to ? '-' + resume.salary.to : ''} ${resume.salary.currency || 'RUB'}`.trim()
      : 'Не указана';
    
    const skillsArr = resume.skill_set || resume.skills || [];
    const skills = skillsArr.slice(0, 5).map(s => typeof s === 'string' ? s : (s.name || '')).filter(s => s).join(', ');
    
    summarySheet.addRow({
      index: index + 1,
      name: `${resume.first_name || ''} ${resume.last_name || ''}`.trim(),
      title: resume.title || '',
      age: resume.age ? `${resume.age} лет` : '',
      experience: resume.total_experience ? `${Math.floor(resume.total_experience.months / 12)} лет ${resume.total_experience.months % 12} мес.` : '',
      salary,
      area: resume.area?.name || '',
      education: resume.education?.level?.name || '',
      lastJob,
      skills: skills.substring(0, 100)
    });
  });
  
  // Создаем отдельный лист для каждого резюме
  resumes.forEach((resume, index) => {
    const name = `${resume.first_name || ''} ${resume.last_name || ''}`.trim().substring(0, 25);
    const sheetName = `${index + 1}. ${name || 'Кандидат ' + (index + 1)}`.replace(/[\\\/\?\*\[\]:]/g, '');
    const sheet = workbook.addWorksheet(sheetName);
    
    // Основная информация
    sheet.addRow(['ФИО', `${resume.first_name || ''} ${resume.last_name || ''}`.trim()]);
    sheet.addRow(['Должность', resume.title || '']);
    sheet.addRow(['Возраст', resume.age ? `${resume.age} лет` : '']);
    sheet.addRow(['Город', resume.area?.name || '']);
    sheet.addRow(['Готовность к переезду', resume.relocation?.name || '']);
    sheet.addRow(['Готовность к командировкам', resume.business_trip_readiness?.name || '']);
    sheet.addRow(['']);
    
    // Зарплата
    const salary = resume.salary 
      ? `${resume.salary.from || ''}${resume.salary.to ? '-' + resume.salary.to : ''} ${resume.salary.currency || 'RUB'}`.trim()
      : 'Не указана';
    sheet.addRow(['Зарплата', salary]);
    sheet.addRow(['']);
    
    // Опыт
    const totalExp = resume.total_experience 
      ? `${Math.floor(resume.total_experience.months / 12)} лет ${resume.total_experience.months % 12} месяцев`
      : 'Без опыта';
    sheet.addRow(['Общий опыт', totalExp]);
    sheet.addRow(['']);
    
    // Образование
    if (resume.education) {
      sheet.addRow(['=== ОБРАЗОВАНИЕ ===']);
      if (resume.education.primary && resume.education.primary.length > 0) {
        resume.education.primary.forEach(edu => {
          sheet.addRow(['Уровень', edu.organization?.type || '']);
          sheet.addRow(['Учебное заведение', edu.name || '']);
          if (edu.year) sheet.addRow(['Год окончания', edu.year]);
          sheet.addRow(['']);
        });
      }
    }
    
    // Опыт работы
    if (resume.experience && resume.experience.length > 0) {
      sheet.addRow(['=== ОПЫТ РАБОТЫ ===']);
      sheet.addRow(['']);
      resume.experience.forEach((exp, expIdx) => {
        sheet.addRow([`Место работы #${expIdx + 1}`]);
        sheet.addRow(['Компания', exp.company || '']);
        sheet.addRow(['Должность', exp.position || '']);
        if (exp.industries && exp.industries.length > 0) {
          sheet.addRow(['Отрасль', exp.industries.map(i => i.name).join(', ')]);
        }
        if (exp.start) {
          const end = exp.end || 'по наст. время';
          sheet.addRow(['Период', `${exp.start} - ${end}`]);
        }
        if (exp.description) {
          sheet.addRow(['Описание', exp.description.substring(0, 500)]);
        }
        sheet.addRow(['']);
      });
    }
    
    // Ключевые навыки
    const skills = resume.skill_set || resume.skills || [];
    if (skills.length > 0) {
      const skillsText = skills.map(s => typeof s === 'string' ? s : (s.name || '')).filter(s => s).join(', ');
      if (skillsText) {
        sheet.addRow(['=== КЛЮЧЕВЫЕ НАВЫКИ ===']);
        sheet.addRow([skillsText]);
        sheet.addRow(['']);
      }
    }
    
    // Дополнительная информация
    if (resume.site || resume.contact || resume.driver_license) {
      sheet.addRow(['=== ДОПОЛНИТЕЛЬНО ===']);
      if (resume.site) sheet.addRow(['Сайт', resume.site]);
      if (resume.driver_license) sheet.addRow(['Водительские права', resume.driver_license.type?.join(', ') || '']);
    }
    
    // Ссылка
    sheet.addRow(['']);
    sheet.addRow(['Ссылка на резюме', resume.alternate_url || '']);
    
    // Форматирование
    sheet.getRow(1).font = { bold: true };
    sheet.column = { width: 20 };
  });
  
  return workbook.xlsx.writeBuffer();
}

module.exports = { exportToExcel, exportTop5Resumes };