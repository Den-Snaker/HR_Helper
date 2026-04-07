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

module.exports = { exportToExcel };